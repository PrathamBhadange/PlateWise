import { Router } from 'express';
import pool from '../config/db.js';
import { checkRole } from '../middleware/roleMiddleware.js';

const router = Router();

// Kitchen endpoints require 'kitchen' or 'admin' role
router.use(checkRole('kitchen', 'admin'));

// Named threshold for inventory status
const LOW_STOCK_THRESHOLD = 15;

// Valid state machine transitions for incoming orders
const VALID_TRANSITIONS = {
  Pending: ['Confirmed', 'Cancelled'],
  Confirmed: ['Preparing', 'Cancelled'],
  Preparing: ['Ready', 'Cancelled'],
  Ready: ['Collected'],
  Collected: [], // Terminal state
  Cancelled: [], // Terminal state
};

/**
 * Helper to normalize order status casing
 */
function normalizeStatus(status) {
  if (!status) return 'Pending';
  const s = String(status).trim().toLowerCase();
  if (s === 'pending') return 'Pending';
  if (s === 'confirmed') return 'Confirmed';
  if (s === 'preparing') return 'Preparing';
  if (s === 'ready') return 'Ready';
  if (s === 'collected' || s === 'picked_up') return 'Collected';
  if (s === 'cancelled') return 'Cancelled';
  return status;
}

/**
 * Synthesize a transparent explanation of the 5-factor demand calculation
 */
function buildDemandExplanation(dish) {
  const weekdayAvg = Number(dish.weekday_avg_sold || 0);
  const preOrders = Number(dish.pre_orders || 0);
  const wastePct = Number(dish.historical_waste_pct || 0);
  const dataPoints = Number(dish.data_points || 0);
  const recommended = Number(dish.recommended_qty || 0);

  if (dataPoints === 0) {
    return `Fallback baseline (${recommended} portions) applied due to lack of historical sales for ${dish.target_weekday || 'this weekday'}.`;
  }

  const parts = [];
  parts.push(`4-week ${dish.target_weekday || 'weekday'} baseline: ${weekdayAvg} portions`);

  if (preOrders > 0) {
    parts.push(`+${preOrders} active pre-orders accounted for`);
  }

  if (wastePct > 15.0) {
    const penaltyPct = Math.min(50, Math.round(wastePct - 15.0));
    parts.push(`damped by ${penaltyPct}% to counter high leftover rate (${wastePct}% > 15% threshold)`);
  } else {
    parts.push(`waste rate within safe limits (${wastePct}%)`);
  }

  return parts.join('; ') + '.';
}

/**
 * 1. GET /api/kitchen/overview
 * Returns KPI StatCards for today's kitchen operations
 */
router.get('/overview', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    // Orders counts by status for today
    const [orderStats] = await pool.query(
      `SELECT 
        COUNT(*) AS total_orders_today,
        SUM(CASE WHEN LOWER(status) = 'pending' THEN 1 ELSE 0 END) AS pending_orders,
        SUM(CASE WHEN LOWER(status) = 'preparing' THEN 1 ELSE 0 END) AS orders_preparing,
        SUM(CASE WHEN LOWER(status) = 'ready' THEN 1 ELSE 0 END) AS orders_ready
       FROM orders
       WHERE pickup_date = ?`,
      [today]
    );

    // Inventory & portion stats from today's food_batches
    const [inventoryStats] = await pool.query(
      `SELECT 
        COALESCE(SUM(cooked_qty), 0) AS total_cooked_today,
        COALESCE(SUM(sold_qty), 0) AS dishes_sold_today,
        COALESCE(SUM(GREATEST(0, cooked_qty - sold_qty)), 0) AS available_inventory
       FROM food_batches
       WHERE batch_date = ?`,
      [today]
    );

    // Revenue from confirmed / preparing / ready / collected orders today
    const [revenueStats] = await pool.query(
      `SELECT 
        COALESCE(SUM(oi.quantity * oi.unit_price), 0.00) AS revenue_today
       FROM orders o
       JOIN order_items oi ON o.order_id = oi.order_id
       WHERE o.pickup_date = ? AND LOWER(o.status) NOT IN ('cancelled')`,
      [today]
    );

    const stats = {
      total_orders_today: Number(orderStats[0]?.total_orders_today || 0),
      pending_orders: Number(orderStats[0]?.pending_orders || 0),
      orders_preparing: Number(orderStats[0]?.orders_preparing || 0),
      orders_ready: Number(orderStats[0]?.orders_ready || 0),
      dishes_sold_today: Number(inventoryStats[0]?.dishes_sold_today || 0),
      available_inventory: Number(inventoryStats[0]?.available_inventory || 0),
      revenue_today: Number(revenueStats[0]?.revenue_today || 0),
    };

    res.json(stats);
  } catch (error) {
    console.error('[API Error] /api/kitchen/overview:', error);
    res.status(500).json({ error: 'Failed to fetch kitchen overview metrics', message: error.message });
  }
});

/**
 * 2. GET /api/kitchen/orders
 * Returns incoming kitchen orders with items, search, filters, and sorting
 */
router.get('/orders', async (req, res) => {
  try {
    const { search, status, pickup_slot, date, sort } = req.query;
    const today = new Date().toISOString().split('T')[0];

    let query = `
      SELECT 
        o.order_id,
        o.user_id,
        u.full_name AS student_name,
        u.email AS student_email,
        o.order_date,
        o.pickup_date,
        o.pickup_slot,
        o.payment_status,
        o.status,
        COALESCE(SUM(oi.quantity), 0) AS total_quantity,
        COALESCE(SUM(oi.quantity * oi.unit_price), 0.00) AS total_amount,
        GROUP_CONCAT(CONCAT(m.name, ' x ', oi.quantity) SEPARATOR ', ') AS items_summary
      FROM orders o
      JOIN users u ON o.user_id = u.user_id
      LEFT JOIN order_items oi ON o.order_id = oi.order_id
      LEFT JOIN menu_items m ON oi.menu_item_id = m.menu_item_id
      WHERE 1=1
    `;

    const params = [];

    // Date filter
    if (date && date !== 'all') {
      query += ` AND o.pickup_date = ?`;
      params.push(date);
    } else if (!date) {
      // Default to today if omitted
      query += ` AND o.pickup_date = ?`;
      params.push(today);
    }

    // Status filter
    if (status && status !== 'all') {
      query += ` AND LOWER(o.status) = LOWER(?)`;
      params.push(status);
    }

    // Pickup slot filter
    if (pickup_slot && pickup_slot !== 'all') {
      query += ` AND o.pickup_slot = ?`;
      params.push(pickup_slot);
    }

    // Search filter (searches order ID, student name, or item name)
    if (search && search.trim() !== '') {
      query += ` AND (
        CAST(o.order_id AS CHAR) LIKE ? OR
        u.full_name LIKE ? OR
        m.name LIKE ?
      )`;
      const term = `%${search.trim()}%`;
      params.push(term, term, term);
    }

    query += ` GROUP BY o.order_id, o.user_id, u.full_name, u.email, o.order_date, o.pickup_date, o.pickup_slot, o.payment_status, o.status`;

    // Sort order
    if (sort === 'oldest') {
      query += ` ORDER BY o.order_date ASC, o.order_id ASC`;
    } else {
      query += ` ORDER BY o.order_date DESC, o.order_id DESC`;
    }

    const [orders] = await pool.query(query, params);

    // Fetch individual items breakdown for detailed popover/accordion
    const orderIds = orders.map((o) => o.order_id);
    let itemsByOrder = {};

    if (orderIds.length > 0) {
      const [items] = await pool.query(
        `SELECT 
          oi.order_id,
          oi.menu_item_id,
          m.name AS item_name,
          m.category,
          oi.quantity,
          oi.unit_price
         FROM order_items oi
         JOIN menu_items m ON oi.menu_item_id = m.menu_item_id
         WHERE oi.order_id IN (?)`,
        [orderIds]
      );

      for (const item of items) {
        if (!itemsByOrder[item.order_id]) {
          itemsByOrder[item.order_id] = [];
        }
        itemsByOrder[item.order_id].push(item);
      }
    }

    const formattedOrders = orders.map((o) => ({
      ...o,
      status: normalizeStatus(o.status),
      total_quantity: Number(o.total_quantity || 0),
      total_amount: Number(o.total_amount || 0),
      items: itemsByOrder[o.order_id] || [],
    }));

    res.json({
      orders: formattedOrders,
      total: formattedOrders.length,
    });
  } catch (error) {
    console.error('[API Error] /api/kitchen/orders:', error);
    res.status(500).json({ error: 'Failed to fetch kitchen orders', message: error.message });
  }
});

/**
 * 3. PATCH /api/kitchen/orders/:orderId/status
 * Enforces strict valid status transitions with 409 Conflict rejection
 */
router.patch('/orders/:orderId/status', async (req, res) => {
  const { orderId } = req.params;
  const { status: rawTargetStatus, current_status: clientCurrentStatus } = req.body;

  if (!rawTargetStatus) {
    return res.status(400).json({ error: 'Target status is required in request body.' });
  }

  const targetStatus = normalizeStatus(rawTargetStatus);

  try {
    // 1. Fetch current order state directly from DB
    const [rows] = await pool.query(
      `SELECT order_id, status FROM orders WHERE order_id = ?`,
      [orderId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: `Order #${orderId} not found.` });
    }

    const dbCurrentStatus = normalizeStatus(rows[0].status);

    // 2. Check for concurrent modification conflict if client provided its expected current state
    if (clientCurrentStatus && normalizeStatus(clientCurrentStatus) !== dbCurrentStatus) {
      return res.status(409).json({
        error: 'Concurrent Modification Conflict',
        message: `Order #${orderId} was updated by another user or session and is currently '${dbCurrentStatus}'. Please refresh.`,
        current_status: dbCurrentStatus,
      });
    }

    // 3. Check valid state transitions
    const allowedTransitions = VALID_TRANSITIONS[dbCurrentStatus] || [];

    if (!allowedTransitions.includes(targetStatus)) {
      return res.status(409).json({
        error: 'Invalid State Transition',
        message: `Cannot transition order #${orderId} from '${dbCurrentStatus}' to '${targetStatus}'. Allowed next states: ${
          allowedTransitions.length > 0 ? allowedTransitions.join(', ') : 'None (Terminal state)'
        }.`,
        current_status: dbCurrentStatus,
        allowed_transitions: allowedTransitions,
      });
    }

    // 4. Perform the update
    await pool.query(
      `UPDATE orders SET status = ? WHERE order_id = ?`,
      [targetStatus, orderId]
    );

    res.json({
      message: `Order #${orderId} status successfully transitioned to ${targetStatus}`,
      order_id: Number(orderId),
      previous_status: dbCurrentStatus,
      new_status: targetStatus,
    });
  } catch (error) {
    console.error(`[API Error] PATCH /api/kitchen/orders/${orderId}/status:`, error);
    res.status(500).json({ error: 'Failed to update order status', message: error.message });
  }
});

/**
 * 4. GET /api/kitchen/sales
 * Reuses v_daily_sales and v_top_selling_items for sales analytics with zero-division guard
 */
router.get('/sales', async (req, res) => {
  try {
    const targetDate = req.query.date || new Date().toISOString().split('T')[0];

    // 1. Daily sales metrics from sales_history (with division-by-zero protection)
    const [salesSummary] = await pool.query(
      `SELECT 
        ? AS date,
        COALESCE(SUM(qty_cooked), 0) AS produced_portions,
        COALESCE(SUM(qty_sold), 0) AS sold_portions,
        COALESCE(SUM(qty_leftover), 0) AS remaining_portions,
        COALESCE(SUM(revenue), 0.00) AS revenue,
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

    // 2. Best-selling dish on target date (falling back to overall top selling)
    const [bestSellingRows] = await pool.query(
      `SELECT 
        m.name AS item_name,
        m.category,
        sh.qty_sold,
        sh.revenue
       FROM sales_history sh
       JOIN menu_items m ON sh.menu_item_id = m.menu_item_id
       WHERE sh.sale_date = ?
       ORDER BY sh.qty_sold DESC
       LIMIT 1`,
      [targetDate]
    );

    let bestSellingDish = null;
    if (bestSellingRows.length > 0) {
      bestSellingDish = bestSellingRows[0];
    } else {
      const [topItem] = await pool.query(`SELECT item_name, category, total_sold AS qty_sold, total_revenue AS revenue FROM v_top_selling_items LIMIT 1`);
      bestSellingDish = topItem[0] || null;
    }

    // 3. 14-day trend from v_daily_sales
    const [trendRows] = await pool.query(
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
       WHERE sale_date <= ?
       ORDER BY sale_date DESC
       LIMIT 14`,
      [targetDate]
    );

    const summary = salesSummary[0] || {
      date: targetDate,
      produced_portions: 0,
      sold_portions: 0,
      remaining_portions: 0,
      revenue: 0,
      waste_percentage: 0,
    };

    res.json({
      ...summary,
      produced_portions: Number(summary.produced_portions || 0),
      sold_portions: Number(summary.sold_portions || 0),
      remaining_portions: Number(summary.remaining_portions || 0),
      revenue: Number(summary.revenue || 0),
      waste_percentage: Number(summary.waste_percentage || 0),
      best_selling_dish: bestSellingDish,
      sales_trend: trendRows.reverse(),
    });
  } catch (error) {
    console.error('[API Error] /api/kitchen/sales:', error);
    res.status(500).json({ error: 'Failed to fetch kitchen sales analytics', message: error.message });
  }
});

/**
 * 5. GET /api/kitchen/demand & POST /api/kitchen/demand/generate
 * Calls get_demand_recommendation stored procedure and augments with transparent explanation
 */
async function handleDemandRecommendation(req, res) {
  try {
    const targetDate = req.query.date || req.body.date || new Date().toISOString().split('T')[0];

    const [result] = await pool.query(
      `CALL get_demand_recommendation(?)`,
      [targetDate]
    );

    const rawRecommendations = Array.isArray(result) && Array.isArray(result[0]) ? result[0] : [];

    const recommendations = rawRecommendations.map((dish) => ({
      ...dish,
      price: Number(dish.price || 0),
      weekday_avg_sold: Number(dish.weekday_avg_sold || 0),
      historical_waste_pct: Number(dish.historical_waste_pct || 0),
      pre_orders: Number(dish.pre_orders || 0),
      recommended_qty: Number(dish.recommended_qty || 0),
      recommendation_explanation: buildDemandExplanation(dish),
    }));

    res.json({
      target_date: targetDate,
      engine: 'AI-assisted demand prediction',
      recommendations,
    });
  } catch (error) {
    console.error('[API Error] /api/kitchen/demand:', error);
    res.status(500).json({ error: 'Failed to generate data-driven demand recommendations', message: error.message });
  }
}

router.get('/demand', handleDemandRecommendation);
router.post('/demand/generate', handleDemandRecommendation);

/**
 * 6. GET /api/kitchen/inventory
 * Live inventory status for each menu item with LOW_STOCK_THRESHOLD = 15
 */
router.get('/inventory', async (req, res) => {
  try {
    const targetDate = req.query.date || new Date().toISOString().split('T')[0];

    const [rows] = await pool.query(
      `SELECT 
        m.menu_item_id,
        m.name AS item_name,
        m.category,
        m.price,
        COALESCE(fb.cooked_qty, 0) AS produced_qty,
        COALESCE(fb.sold_qty, 0) AS sold_qty,
        COALESCE(fb.leftover_qty, GREATEST(0, COALESCE(fb.cooked_qty, 0) - COALESCE(fb.sold_qty, 0))) AS remaining_qty
       FROM menu_items m
       LEFT JOIN food_batches fb ON m.menu_item_id = fb.menu_item_id AND fb.batch_date = ?
       ORDER BY m.category, m.name`,
      [targetDate]
    );

    const items = rows.map((row) => {
      const produced = Number(row.produced_qty || 0);
      const sold = Number(row.sold_qty || 0);
      const remaining = Number(row.remaining_qty || 0);
      const available = Math.max(0, remaining);

      let status = 'Available';
      if (remaining <= 0) {
        status = 'Out of Stock';
      } else if (remaining <= LOW_STOCK_THRESHOLD) {
        status = 'Low Stock';
      }

      return {
        menu_item_id: row.menu_item_id,
        item_name: row.item_name,
        category: row.category,
        price: Number(row.price || 0),
        produced_qty: produced,
        sold_qty: sold,
        remaining_qty: remaining,
        available_qty: available,
        status,
      };
    });

    res.json({
      date: targetDate,
      low_stock_threshold: LOW_STOCK_THRESHOLD,
      items,
    });
  } catch (error) {
    console.error('[API Error] /api/kitchen/inventory:', error);
    res.status(500).json({ error: 'Failed to fetch inventory status', message: error.message });
  }
});

// -----------------------------------------------------------------------------
// Backward Compatibility Endpoints
// -----------------------------------------------------------------------------

/**
 * Legacy: GET /api/kitchen/summary?date=
 */
router.get('/summary', async (req, res) => {
  try {
    const targetDate = req.query.date || new Date().toISOString().split('T')[0];

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

    const [topSelling] = await pool.query(
      `SELECT * FROM v_top_selling_items ORDER BY sales_rank ASC LIMIT 5`
    );

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
 * Legacy: GET /api/kitchen/sales-report?from=&to=
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
 * Legacy: GET /api/kitchen/demand-recommendation?date=
 */
router.get('/demand-recommendation', handleDemandRecommendation);

export default router;
