import { Router } from 'express';
import pool from '../config/db.js';
import { checkRole } from '../middleware/roleMiddleware.js';

const router = Router();

// Admin endpoints strictly require 'admin' role
router.use(checkRole('admin'));

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

export default router;

