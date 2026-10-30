import { Router } from 'express';
import pool from '../config/db.js';
import { checkRole } from '../middleware/roleMiddleware.js';

const router = Router();

/**
 * GET /api/complaints/menu-items
 * Helper to fetch dishes for the complaint dropdown
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
 * POST /api/complaints
 * Grievance intake: runs submit_complaint procedure inside a transaction
 * Role: student, kitchen, or admin
 */
router.post('/', checkRole('student', 'kitchen', 'admin'), async (req, res) => {
  try {
    const { user_id = 5, menu_item_id = null, description } = req.body;

    if (!description || !description.trim()) {
      return res.status(400).json({ error: 'Description is required' });
    }

    // Call stored procedure submit_complaint
    const connection = await pool.getConnection();
    try {
      await connection.query(
        `CALL submit_complaint(?, ?, ?, @p_id, @p_cat, @p_sev)`,
        [user_id, menu_item_id || null, description.trim()]
      );

      const [outParams] = await connection.query(
        `SELECT @p_id AS complaint_id, @p_cat AS category, @p_sev AS severity`
      );

      const { complaint_id, category, severity } = outParams[0] || {};

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
});

/**
 * PATCH /api/complaints/:id
 * Assign ticket, transition status, or mark resolved
 * Role: kitchen or admin
 */
router.patch('/:id', checkRole('kitchen', 'admin'), async (req, res) => {
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
        [complaintId, assigned_to || null, remarks.trim()]
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
});

export default router;

