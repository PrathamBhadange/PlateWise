import { Router } from 'express';
import pool from '../config/db.js';
import { checkRole } from '../middleware/roleMiddleware.js';

const router = Router();

// Kitchen endpoints require 'kitchen' or 'admin' role
router.use(checkRole('kitchen', 'admin'));

/**
 * GET /api/kitchen/summary?date=YYYY-MM-DD
 * Returns daily metrics, top-selling items, and most-wasted items
 */
router.get('/summary', async (req, res) => {
  try {
    const targetDate = req.query.date || new Date().toISOString().split('T')[0];

    // 1. Daily sales summary from sales_history
    const [summaryRows] = await pool.query(
      `SELECT 
        ? AS report_date,
        COALESCE(SUM(qty_sold), 0) AS total_sold,
        COALESCE(SUM(qty_cooked), 0) AS total_cooked,
        COALESCE(SUM(qty_leftover), 0) AS total_leftover,
        COALESCE(SUM(revenue), 0.00) AS total_revenue,
        ROUND(
          CASE 
            WHEN SUM(qty_cooked) > 0 THEN (SUM(qty_leftover) * 100.0) / SUM(qty_cooked) 
            ELSE 0.0 
          END, 
          1
        ) AS waste_percentage
       FROM sales_history 
       WHERE sale_date = ?`,
      [targetDate, targetDate]
    );

    // 2. Top-selling items
    const [topSelling] = await pool.query(
      `SELECT * FROM v_top_selling_items ORDER BY sales_rank ASC LIMIT 5`
    );

    // 3. Most wasted items
    const [mostWasted] = await pool.query(
      `SELECT * FROM v_most_wasted_items ORDER BY waste_rank ASC LIMIT 5`
    );

    const summary = summaryRows[0] || {
      report_date: targetDate,
      total_sold: 0,
      total_cooked: 0,
      total_leftover: 0,
      total_revenue: 0,
      waste_percentage: 0,
    };

    res.json({
      summary,
      topSelling,
      mostWasted,
    });
  } catch (error) {
    console.error('[API Error] /api/kitchen/summary:', error);
    res.status(500).json({ error: 'Failed to fetch kitchen summary', message: error.message });
  }
});

/**
 * GET /api/kitchen/sales-report?from=YYYY-MM-DD&to=YYYY-MM-DD
 * Returns time-series daily metrics for sales and waste trends
 */
router.get('/sales-report', async (req, res) => {
  try {
    let { from, to } = req.query;

    if (!from || !to) {
      const now = new Date();
      const past = new Date();
      past.setDate(now.getDate() - 14);
      to = to || now.toISOString().split('T')[0];
      from = from || past.toISOString().split('T')[0];
    }

    const [rows] = await pool.query(
      `SELECT 
        sale_date,
        weekday,
        total_sold,
        total_cooked,
        total_leftover,
        total_revenue,
        waste_percentage,
        moving_avg_7d_revenue
       FROM v_daily_sales
       WHERE sale_date BETWEEN ? AND ?
       ORDER BY sale_date ASC`,
      [from, to]
    );

    res.json({
      from,
      to,
      data: rows,
    });
  } catch (error) {
    console.error('[API Error] /api/kitchen/sales-report:', error);
    res.status(500).json({ error: 'Failed to fetch sales report', message: error.message });
  }
});

/**
 * GET /api/kitchen/demand-recommendation?date=YYYY-MM-DD
 * Calls get_demand_recommendation stored procedure
 */
router.get('/demand-recommendation', async (req, res) => {
  try {
    const targetDate = req.query.date || new Date().toISOString().split('T')[0];

    const [result] = await pool.query(
      `CALL get_demand_recommendation(?)`,
      [targetDate]
    );

    // Stored procedure returns array of result sets; first element is our rows
    const recommendations = Array.isArray(result) && Array.isArray(result[0]) ? result[0] : [];

    res.json({
      target_date: targetDate,
      recommendations,
    });
  } catch (error) {
    console.error('[API Error] /api/kitchen/demand-recommendation:', error);
    res.status(500).json({ error: 'Failed to generate demand recommendation', message: error.message });
  }
});

export default router;

