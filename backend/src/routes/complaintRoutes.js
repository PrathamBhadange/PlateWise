import { Router } from 'express';
import pool from '../config/db.js';
import { authenticate, requireRole, validateCsrf } from '../middleware/roleMiddleware.js';

const router = Router();

/**
 * GET /api/complaints/menu-items
 * Helper to fetch dishes for the complaint dropdown (public)
 */
router.get('/menu-items', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT menu_item_id, name, category, price FROM menu_items ORDER BY category, name`
    );
    res.json(rows);
  } catch (error) {
    console.error('[API Error] /api/complaints/menu-items:', error);
    res.status(500).json({ error: 'Failed to load menu items', message: error.message });
  }
});

/**
 * GET /api/complaints
 * Returns complaints scoped to current user:
 * - Students can strictly read only their own complaints (c.user_id = req.user.user_id)
 * - Kitchen and Admin can view all complaints
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const isStudent = req.user.role === 'student';
    const query = `
      SELECT
        c.complaint_id,
        c.user_id,
        u.full_name AS student_name,
        u.email AS student_email,
        c.menu_item_id,
        m.name AS menu_item_name,
        c.description,
        c.proof_image,
        c.category,
        c.severity,
        c.status,
        c.assigned_to,
        staff.full_name AS assigned_to_name,
        c.created_at,
        c.resolution_deadline,
        c.resolved_at,
        c.escalated_at,
        c.escalation_level
      FROM complaints c
      LEFT JOIN users u ON c.user_id = u.user_id
      LEFT JOIN menu_items m ON c.menu_item_id = m.menu_item_id
      LEFT JOIN users staff ON c.assigned_to = staff.user_id
      ${isStudent ? 'WHERE c.user_id = ?' : ''}
      ORDER BY c.created_at DESC
    `;

    const params = isStudent ? [req.user.user_id] : [];
    const [complaints] = await pool.query(query, params);
    res.json(complaints);
  } catch (error) {
    console.error('[API Error] GET /api/complaints:', error);
    res.status(500).json({ error: 'Failed to load complaints', message: error.message });
  }
});

/**
 * GET /api/complaints/:id
 * Fetch single complaint:
 * Enforces ownership check: Student A cannot read Student B's complaint (returns 403 Forbidden).
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const complaintId = parseInt(req.params.id, 10);
    if (isNaN(complaintId)) {
      return res.status(400).json({ error: 'Invalid complaint ID' });
    }

    const [rows] = await pool.query(
      `SELECT
        c.complaint_id,
        c.user_id,
        u.full_name AS student_name,
        u.email AS student_email,
        c.menu_item_id,
        m.name AS menu_item_name,
        c.description,
        c.proof_image,
        c.category,
        c.severity,
        c.status,
        c.assigned_to,
        staff.full_name AS assigned_to_name,
        c.created_at,
        c.resolution_deadline,
        c.resolved_at,
        c.escalated_at,
        c.escalation_level
      FROM complaints c
      LEFT JOIN users u ON c.user_id = u.user_id
      LEFT JOIN menu_items m ON c.menu_item_id = m.menu_item_id
      LEFT JOIN users staff ON c.assigned_to = staff.user_id
      WHERE c.complaint_id = ?`,
      [complaintId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Complaint not found' });
    }

    const complaint = rows[0];

    // Ownership check: Student cannot view another user's complaint
    if (req.user.role === 'student' && complaint.user_id !== req.user.user_id) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Access denied: You are not authorized to view another student’s complaint.',
      });
    }

    res.json(complaint);
  } catch (error) {
    console.error('[API Error] GET /api/complaints/:id:', error);
    res.status(500).json({ error: 'Failed to load complaint', message: error.message });
  }
});

/**
 * POST /api/complaints
 * Grievance intake: runs submit_complaint procedure inside a transaction
 * Role: student, kitchen, or admin
 * Note: user_id is derived strictly from authenticated user (req.user.user_id), never trusted from body.
 */
router.post(
  '/',
  authenticate,
  requireRole('student', 'kitchen', 'admin'),
  validateCsrf,
  async (req, res) => {
    try {
      const { menu_item_id = null, description, proof_image = null } = req.body;
      const userId = req.user.user_id;

      if (!description || !description.trim()) {
        return res.status(400).json({ error: 'Description is required' });
      }

      // Proof image is compulsory for student grievance submissions
      if (req.user.role === 'student') {
        if (!proof_image || typeof proof_image !== 'string' || !proof_image.trim()) {
          return res.status(400).json({
            error: 'Validation Error',
            message: 'Proof image is mandatory. Please upload an image showing proof of your complaint.',
          });
        }
      }

      // Call stored procedure submit_complaint
      const connection = await pool.getConnection();
      try {
        await connection.query(
          `CALL submit_complaint(?, ?, ?, @p_id, @p_cat, @p_sev)`,
          [userId, menu_item_id || null, description.trim()]
        );

        const [outParams] = await connection.query(
          `SELECT @p_id AS complaint_id, @p_cat AS category, @p_sev AS severity`
        );

        const { complaint_id, category, severity } = outParams[0] || {};

        if (proof_image && typeof proof_image === 'string' && proof_image.trim()) {
          await connection.query(
            `UPDATE complaints SET proof_image = ? WHERE complaint_id = ?`,
            [proof_image.trim(), complaint_id]
          );
        }

        const [ticketRows] = await connection.query(
          `SELECT * FROM complaints WHERE complaint_id = ?`,
          [complaint_id]
        );

        res.status(201).json({
          message: 'Complaint submitted successfully',
          ticket: ticketRows[0] || { complaint_id, category, severity, status: 'open' },
          classification: {
            category,
            severity,
          },
        });
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error('[API Error] POST /api/complaints:', error);
      res.status(500).json({ error: 'Failed to submit complaint', message: error.message });
    }
  }
);

/**
 * PATCH /api/complaints/:id
 * Assign ticket, transition status, or mark resolved
 * Role: kitchen or admin
 */
router.patch(
  '/:id',
  authenticate,
  requireRole('kitchen', 'admin'),
  validateCsrf,
  async (req, res) => {
    try {
      const complaintId = parseInt(req.params.id, 10);
      const { status, assigned_to, remarks } = req.body;

      if (isNaN(complaintId)) {
        return res.status(400).json({ error: 'Invalid complaint ID' });
      }

      const [current] = await pool.query(
        `SELECT * FROM complaints WHERE complaint_id = ?`,
        [complaintId]
      );

      if (current.length === 0) {
        return res.status(404).json({ error: 'Complaint not found' });
      }

      const updates = [];
      const params = [];

      if (status !== undefined) {
        updates.push('status = ?');
        params.push(status);

        if (status === 'resolved') {
          updates.push('resolved_at = NOW()');
        } else if (status === 'escalated') {
          updates.push('escalated_at = NOW()');
        }
      }

      if (assigned_to !== undefined) {
        updates.push('assigned_to = ?');
        params.push(assigned_to);
      }

      if (updates.length > 0) {
        params.push(complaintId);
        await pool.query(
          `UPDATE complaints SET ${updates.join(', ')} WHERE complaint_id = ?`,
          params
        );
      }

      // Optional manual action note if provided
      if (remarks && remarks.trim()) {
        await pool.query(
          `INSERT INTO complaint_actions (complaint_id, action_by, action_type, remarks)
           VALUES (?, ?, 'note', ?)`,
          [complaintId, assigned_to || req.user.user_id, remarks.trim()]
        );
      }

      const [updated] = await pool.query(
        `SELECT c.*, u.full_name AS student_name, m.name AS menu_item_name, staff.full_name AS assigned_to_name
         FROM complaints c
         LEFT JOIN users u ON c.user_id = u.user_id
         LEFT JOIN menu_items m ON c.menu_item_id = m.menu_item_id
         LEFT JOIN users staff ON c.assigned_to = staff.user_id
         WHERE c.complaint_id = ?`,
        [complaintId]
      );

      res.json({
        message: 'Complaint updated successfully',
        complaint: updated[0],
      });
    } catch (error) {
      console.error('[API Error] PATCH /api/complaints/:id:', error);
      res.status(500).json({ error: 'Failed to update complaint', message: error.message });
    }
  }
);

export default router;
