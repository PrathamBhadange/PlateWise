import { Router } from 'express';
import bcrypt from 'bcryptjs';
import pool from '../config/db.js';
import { authenticate, requireRole, validateCsrf } from '../middleware/roleMiddleware.js';
import { withTransactionRetry } from '../utils/transactionHelper.js';
import {
  getAdminSponsorships,
  getAdminCredits,
  adjustCreditBalance,
  processExpiredCredits,
  refundSponsorship,
  processSponsorshipPayment,
} from '../services/sponsorshipCreditService.js';

const router = Router();

// Admin endpoints strictly require authentication, admin role, and CSRF check on mutations
router.use(authenticate);
router.use(requireRole('admin'));
router.use(validateCsrf);

/**
 * GET /api/admin/impact
 * Aggregated sustainability indicators and month-over-month trend
 */
router.get('/impact', async (req, res) => {
  try {
    const [summaryRows] = await pool.query(`SELECT * FROM v_impact_summary`);
    const [monthlyTrend] = await pool.query(`SELECT * FROM v_monthly_trend ORDER BY sale_month ASC`);
    const [kpiRows] = await pool.query(`SELECT * FROM v_complaint_dashboard`);

    res.json({
      impact: summaryRows[0] || {
        portions_sold: 0,
        portions_donated: 0,
        portions_wasted: 0,
        total_saved_portions: 0,
        waste_percentage: 0,
        total_revenue: 0,
      },
      monthlyTrend,
      complaintKpis: kpiRows[0] || {},
    });
  } catch (error) {
    console.error('[API Error] /api/admin/impact:', error);
    res.status(500).json({ error: 'Failed to fetch impact statistics', message: error.message });
  }
});

/**
 * GET /api/admin/complaints?status=&severity=&category=
 * Filterable grievance tickets list with SLA countdown and staff assignments
 */
router.get('/complaints', async (req, res) => {
  try {
    const { status, severity, category } = req.query;

    const conditions = [];
    const params = [];

    if (status && status !== 'all') {
      conditions.push('c.status = ?');
      params.push(status);
    }

    if (severity && severity !== 'all') {
      conditions.push('c.severity = ?');
      params.push(severity);
    }

    if (category && category !== 'all') {
      conditions.push('c.category = ?');
      params.push(category);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const [complaints] = await pool.query(
      `SELECT
        c.complaint_id,
        c.user_id,
        u.full_name AS student_name,
        u.email AS student_email,
        c.menu_item_id,
        m.name AS menu_item_name,
        c.description,
        c.category,
        c.severity,
        c.status,
        c.assigned_to,
        staff.full_name AS assigned_to_name,
        c.created_at,
        c.resolution_deadline,
        c.resolved_at,
        c.escalated_at,
        c.escalation_level,
        CASE
          WHEN c.status NOT IN ('resolved', 'closed') AND c.resolution_deadline < NOW() THEN 1
          ELSE 0
        END AS is_overdue,
        ROUND(TIMESTAMPDIFF(MINUTE, c.resolution_deadline, NOW()) / 60.0, 1) AS hours_overdue
       FROM complaints c
       LEFT JOIN users u ON c.user_id = u.user_id
       LEFT JOIN menu_items m ON c.menu_item_id = m.menu_item_id
       LEFT JOIN users staff ON c.assigned_to = staff.user_id
       ${whereClause}
       ORDER BY
         is_overdue DESC,
         c.severity = 'critical' DESC,
         c.severity = 'high' DESC,
         c.created_at DESC`,
      params
    );

    const [kpis] = await pool.query(`SELECT * FROM v_complaint_dashboard`);

    // Available staff for assignment dropdown
    const [staffList] = await pool.query(
      `SELECT user_id, full_name, role FROM users WHERE role IN ('kitchen', 'admin') ORDER BY role, full_name`
    );

    res.json({
      kpis: kpis[0] || {},
      complaints,
      staff: staffList,
    });
  } catch (error) {
    console.error('[API Error] /api/admin/complaints:', error);
    res.status(500).json({ error: 'Failed to fetch complaints', message: error.message });
  }
});

/**
 * GET /api/admin/complaints/:id/actions
 * Returns action trail for side panel timeline
 */
router.get('/complaints/:id/actions', async (req, res) => {
  try {
    const complaintId = parseInt(req.params.id, 10);
    const [actions] = await pool.query(
      `SELECT
        ca.complaint_action_id,
        ca.complaint_id,
        ca.action_by,
        u.full_name AS action_by_name,
        u.role AS action_by_role,
        ca.action_type,
        ca.remarks,
        ca.created_at
       FROM complaint_actions ca
       LEFT JOIN users u ON ca.action_by = u.user_id
       WHERE ca.complaint_id = ?
       ORDER BY ca.created_at ASC`,
      [complaintId]
    );

    res.json(actions);
  } catch (error) {
    console.error('[API Error] /api/admin/complaints/:id/actions:', error);
    res.status(500).json({ error: 'Failed to fetch complaint timeline', message: error.message });
  }
});

/**
 * GET /api/admin/audit-logs
 * System change data capture logs
 */
router.get('/audit-logs', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT
        al.audit_log_id,
        al.table_name,
        al.record_id,
        al.action,
        al.old_value,
        al.new_value,
        al.changed_by,
        u.full_name AS changed_by_name,
        al.changed_at
       FROM audit_logs al
       LEFT JOIN users u ON al.changed_by = u.user_id
       ORDER BY al.changed_at DESC
       LIMIT 50`
    );

    res.json(rows);
  } catch (error) {
    console.error('[API Error] /api/admin/audit-logs:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs', message: error.message });
  }
});

/**
 * POST /api/admin/complaints/escalate-overdue
 * Manually executes automated escalation stored procedure
 */
router.post('/complaints/escalate-overdue', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    try {
      await connection.query(`CALL escalate_overdue_complaints(@p_escalated_count)`);
      const [outParams] = await connection.query(`SELECT @p_escalated_count AS escalated_count`);
      const count = outParams[0]?.escalated_count || 0;

      res.json({
        message: 'Escalation routine executed successfully',
        escalated_count: count,
        timestamp: new Date().toISOString(),
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('[API Error] /api/admin/complaints/escalate-overdue:', error);
    res.status(500).json({ error: 'Failed to execute escalation', message: error.message });
  }
});

/**
 * POST /api/admin/users
 * Admin-only staff account creation
 */
router.post('/users', async (req, res) => {
  try {
    const { full_name, email, password, role } = req.body;
    const allowedRoles = ['student', 'cashier', 'kitchen', 'admin', 'ngo'];

    if (!full_name || !email || !password || !role) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'All fields (full_name, email, password, role) are required',
      });
    }

    if (!allowedRoles.includes(role)) {
      return res.status(400).json({
        error: 'Validation Error',
        message: `Invalid role. Allowed roles: ${allowedRoles.join(', ')}`,
      });
    }

    if (typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Password must be at least 8 characters long',
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const [existing] = await pool.query('SELECT user_id FROM users WHERE email = ?', [cleanEmail]);
    if (existing.length > 0) {
      return res.status(409).json({
        error: 'Conflict',
        message: 'An account with this email already exists',
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      'INSERT INTO users (full_name, email, role, password_hash) VALUES (?, ?, ?, ?)',
      [full_name.trim(), cleanEmail, role, passwordHash]
    );

    res.status(201).json({
      message: 'User created successfully',
      user: {
        user_id: result.insertId,
        full_name: full_name.trim(),
        email: cleanEmail,
        role,
      },
    });
  } catch (error) {
    console.error('[API Error] POST /api/admin/users:', error);
    res.status(500).json({ error: 'Failed to create user', message: error.message });
  }
});

/**
 * GET /api/admin/pending-users
 * Returns list of users awaiting administrator review (account_status = 'pending')
 */
router.get('/pending-users', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT user_id AS id, user_id, full_name, email, role, account_status, created_at
       FROM users
       WHERE account_status = 'pending'
       ORDER BY created_at ASC`
    );
    res.json(rows);
  } catch (error) {
    console.error('[API Error] GET /api/admin/pending-users:', error);
    res.status(500).json({ error: 'Failed to fetch pending users', message: error.message });
  }
});

/**
 * PATCH /api/admin/users/:userId/approve
 * Approves a pending kitchen staff account. Sets status to 'active'.
 * Safeguards:
 * - Admin cannot act on their own account (403)
 * - Target must exist (404)
 * - Target must not be admin or cashier (403)
 * - Allowed only when target is role='kitchen' and account_status='pending' (400)
 */
router.patch('/users/:userId/approve', async (req, res) => {
  try {
    const targetUserId = parseInt(req.params.userId, 10);
    if (isNaN(targetUserId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    if (targetUserId === req.user.user_id) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Administrators cannot act on their own accounts',
      });
    }

    const [rows] = await pool.query(
      'SELECT user_id, full_name, email, role, account_status FROM users WHERE user_id = ?',
      [targetUserId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Not Found', message: 'User not found' });
    }

    const target = rows[0];

    if (target.role === 'admin' || (target.role === 'cashier' && target.account_status !== 'pending')) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Cannot modify administrative or active cashier accounts',
      });
    }

    const approvableRoles = ['kitchen', 'cashier', 'ngo'];
    if (!approvableRoles.includes(target.role) || target.account_status !== 'pending') {
      return res.status(400).json({
        error: 'Invalid Operation',
        message: `Only pending staff or NGO accounts can be approved. Current role: ${target.role}, status: ${target.account_status}`,
      });
    }

    await pool.query('UPDATE users SET account_status = ? WHERE user_id = ?', [
      'active',
      targetUserId,
    ]);

    res.json({
      message: 'Staff account approved successfully',
      user: {
        user_id: targetUserId,
        full_name: target.full_name,
        email: target.email,
        role: target.role,
        account_status: 'active',
      },
    });
  } catch (error) {
    console.error('[API Error] PATCH /api/admin/users/:userId/approve:', error);
    res.status(500).json({ error: 'Failed to approve user', message: error.message });
  }
});

/**
 * PATCH /api/admin/users/:userId/reject
 * Rejects a pending kitchen staff account. Sets status to 'rejected'.
 * Safeguards:
 * - Admin cannot act on their own account (403)
 * - Target must exist (404)
 * - Target must not be admin or cashier (403)
 * - Allowed only when target is role='kitchen' and account_status='pending' (400)
 */
router.patch('/users/:userId/reject', async (req, res) => {
  try {
    const targetUserId = parseInt(req.params.userId, 10);
    if (isNaN(targetUserId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    if (targetUserId === req.user.user_id) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Administrators cannot act on their own accounts',
      });
    }

    const [rows] = await pool.query(
      'SELECT user_id, full_name, email, role, account_status FROM users WHERE user_id = ?',
      [targetUserId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Not Found', message: 'User not found' });
    }

    const target = rows[0];

    if (target.role === 'admin' || (target.role === 'cashier' && target.account_status !== 'pending')) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Cannot modify administrative or active cashier accounts',
      });
    }

    const rejectableRoles = ['kitchen', 'cashier', 'ngo'];
    if (!rejectableRoles.includes(target.role) || target.account_status !== 'pending') {
      return res.status(400).json({
        error: 'Invalid Operation',
        message: `Only pending staff or NGO accounts can be rejected. Current role: ${target.role}, status: ${target.account_status}`,
      });
    }

    await pool.query('UPDATE users SET account_status = ? WHERE user_id = ?', [
      'rejected',
      targetUserId,
    ]);

    res.json({
      message: 'Staff account rejected',
      user: {
        user_id: targetUserId,
        full_name: target.full_name,
        email: target.email,
        role: target.role,
        account_status: 'rejected',
      },
    });
  } catch (error) {
    console.error('[API Error] PATCH /api/admin/users/:userId/reject:', error);
    res.status(500).json({ error: 'Failed to reject user', message: error.message });
  }
});

/**
 * PATCH /api/admin/users/:userId/promote-to-kitchen
 * Promotes an existing misregistered student account to kitchen staff.
 * Safeguards:
 * - Requires explicit {"confirm": true} in request body (400)
 * - Admin cannot act on their own account (403)
 * - Target must exist (404)
 * - Target must not be admin or cashier (403)
 * - Applies ONLY to targets with role='student' (400)
 * - Sets role='kitchen' and account_status='active' in one transaction
 * - Preserves user_id, email, and password_hash
 */
router.patch('/users/:userId/promote-to-kitchen', async (req, res) => {
  const targetUserId = parseInt(req.params.userId, 10);
  if (isNaN(targetUserId)) {
    return res.status(400).json({ error: 'Invalid user ID' });
  }

  const { confirm } = req.body || {};
  if (confirm !== true) {
    return res.status(400).json({
      error: 'Confirmation Required',
      message: 'Promotion requires explicit confirmation body {"confirm": true}',
    });
  }

  if (targetUserId === req.user.user_id) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Administrators cannot act on their own accounts',
    });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [rows] = await connection.query(
      'SELECT user_id, full_name, email, role, password_hash, account_status FROM users WHERE user_id = ? FOR UPDATE',
      [targetUserId]
    );

    if (rows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Not Found', message: 'User not found' });
    }

    const target = rows[0];

    if (target.role === 'admin' || target.role === 'cashier') {
      await connection.rollback();
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Cannot modify administrative or cashier accounts',
      });
    }

    if (target.role !== 'student') {
      await connection.rollback();
      return res.status(400).json({
        error: 'Invalid Operation',
        message: `Only student accounts can be promoted to kitchen staff. Current role is '${target.role}'.`,
      });
    }

    // Set role='kitchen' and account_status='active' in one transaction, preserving password_hash, user_id, email
    await connection.query(
      'UPDATE users SET role = ?, account_status = ? WHERE user_id = ?',
      ['kitchen', 'active', targetUserId]
    );

    await connection.commit();

    res.json({
      message: `User ${target.full_name} (${target.email}) promoted to kitchen staff successfully`,
      user: {
        user_id: targetUserId,
        full_name: target.full_name,
        email: target.email,
        role: 'kitchen',
        account_status: 'active',
      },
    });
  } catch (error) {
    await connection.rollback();
    console.error('[API Error] PATCH /api/admin/users/:userId/promote-to-kitchen:', error);
    res.status(500).json({ error: 'Failed to promote user', message: error.message });
  } finally {
    connection.release();
  }
});

/**
 * GET /api/admin/students
 * Helper endpoint returning list of student accounts for promotion UI
 */
router.get('/students', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT user_id, full_name, email, role, account_status, created_at
       FROM users
       WHERE role = 'student'
       ORDER BY full_name ASC`
    );
    res.json(rows);
  } catch (error) {
    console.error('[API Error] GET /api/admin/students:', error);
    res.status(500).json({ error: 'Failed to fetch student accounts', message: error.message });
  }
});

/**
 * 12. GET /api/admin/sponsorships
 * Audit view of all meal sponsorships, payment status, and unmasked donor data.
 */
router.get('/sponsorships', async (req, res) => {
  try {
    const sponsorships = await getAdminSponsorships(pool, req.query);
    res.json(sponsorships);
  } catch (error) {
    console.error('[API Error] GET /api/admin/sponsorships:', error);
    res.status(500).json({ error: 'Failed to fetch sponsorships', message: error.message });
  }
});

/**
 * 13. GET /api/admin/credits
 * Audit view of all community meal credit lots and balances.
 */
router.get('/credits', async (req, res) => {
  try {
    const credits = await getAdminCredits(pool, req.query);
    res.json(credits);
  } catch (error) {
    console.error('[API Error] GET /api/admin/credits:', error);
    res.status(500).json({ error: 'Failed to fetch meal credits', message: error.message });
  }
});

/**
 * 14. POST /api/admin/credits/adjust
 * Administrative adjustment of a meal credit balance.
 * Strictly prevents negative balances and records an immutable ADJUSTMENT ledger entry.
 */
router.post('/credits/adjust', async (req, res) => {
  const { credit_id, adjustment_amount, reason, idempotency_key } = req.body;

  const parsedCreditId = parseInt(credit_id, 10);
  if (isNaN(parsedCreditId) || parsedCreditId <= 0) {
    return res.status(400).json({ error: 'Valid credit_id is required.' });
  }

  try {
    const result = await withTransactionRetry(pool, async (conn) => {
      return await adjustCreditBalance(conn, {
        creditId: parsedCreditId,
        adjustmentAmount: adjustment_amount,
        reason,
        idempotencyKey: idempotency_key,
        adminUserId: req.user.user_id,
      });
    });

    res.json(result);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    if (statusCode >= 500) {
      console.error('[API Error] POST /api/admin/credits/adjust:', error);
    }
    res.status(statusCode).json({
      error: error.message || 'Failed to adjust credit balance',
      message: error.message,
    });
  }
});

/**
 * 15. POST /api/admin/credits/expire-check
 * Trigger credit expiration processing: identifies expired credits, updates balances,
 * and records an EXPIRATION ledger entry idempotently.
 */
router.post('/credits/expire-check', async (req, res) => {
  try {
    const result = await withTransactionRetry(pool, async (conn) => {
      return await processExpiredCredits(conn, req.user.user_id);
    });

    res.json({
      success: true,
      message: `Credit expiration run complete. ${result.expired_credits_count} lots expired, ₹${result.total_expired_amount.toFixed(2)} removed from pool.`,
      ...result,
    });
  } catch (error) {
    console.error('[API Error] POST /api/admin/credits/expire-check:', error);
    res.status(500).json({ error: 'Failed to process credit expiration', message: error.message });
  }
});

/**
 * 16. POST /api/admin/sponsorships/:id/refund
 * Administrative refund endpoint. Reverses unspent credit balance from community pool,
 * preserves historical payment records, and appends a CANCELLATION ledger entry.
 */
router.post('/sponsorships/:id/refund', async (req, res) => {
  const sponsorshipId = parseInt(req.params.id, 10);
  const { reason } = req.body || {};

  if (isNaN(sponsorshipId) || sponsorshipId <= 0) {
    return res.status(400).json({ error: 'Valid sponsorship ID is required.' });
  }

  try {
    const result = await withTransactionRetry(pool, async (conn) => {
      return await refundSponsorship(conn, {
        sponsorshipId,
        adminUserId: req.user.user_id,
        reason,
      });
    });

    res.json(result);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    if (statusCode >= 500) {
      console.error(`[API Error] POST /api/admin/sponsorships/${sponsorshipId}/refund:`, error);
    }
    res.status(statusCode).json({
      error: error.message || 'Failed to process sponsorship refund',
      message: error.message,
    });
  }
});

/**
 * 17. POST /api/admin/sponsorships/:id/process-payment
 * Administrative/Gateway webhook emulation endpoint to process payment outcome (Completed/Failed).
 */
router.post('/sponsorships/:id/process-payment', async (req, res) => {
  const sponsorshipId = parseInt(req.params.id, 10);
  const { payment_status = 'Completed', payment_method, transaction_reference } = req.body || {};

  if (isNaN(sponsorshipId) || sponsorshipId <= 0) {
    return res.status(400).json({ error: 'Valid sponsorship ID is required.' });
  }

  try {
    const result = await withTransactionRetry(pool, async (conn) => {
      return await processSponsorshipPayment(conn, {
        sponsorshipId,
        paymentStatus: payment_status,
        paymentMethod: payment_method,
        transactionReference: transaction_reference,
        requestingUserId: req.user.user_id,
        requestingRole: 'admin',
      });
    });

    res.json(result);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    if (statusCode >= 500) {
      console.error(`[API Error] POST /api/admin/sponsorships/${sponsorshipId}/process-payment:`, error);
    }
    res.status(statusCode).json({
      error: error.message || 'Failed to process sponsorship payment',
      message: error.message,
    });
  }
});

export default router;
