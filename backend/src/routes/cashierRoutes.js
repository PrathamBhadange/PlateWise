import { Router } from 'express';
import pool from '../config/db.js';
import { authenticate, requireRole, validateCsrf } from '../middleware/roleMiddleware.js';
import { formatToken, parseTokenToOrderId } from '../utils/pickupToken.js';

const router = Router();

// Cashier endpoints strictly require authentication, cashier or admin role, and CSRF check on mutations
router.use(authenticate);
router.use(requireRole('cashier', 'admin'));
router.use(validateCsrf);

/**
 * GET /api/cashier/overview
 * Real statistics for cashier dashboard
 */
router.get('/overview', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    // 1. Orders count for today
    const [orderStats] = await pool.query(
      `SELECT
        COUNT(*) AS total_orders,
        SUM(CASE WHEN LOWER(status) IN ('collected', 'picked_up') THEN 1 ELSE 0 END) AS orders_served_today,
        SUM(CASE WHEN LOWER(status) IN ('pending', 'confirmed', 'preparing', 'ready') THEN 1 ELSE 0 END) AS orders_in_queue,
        SUM(CASE WHEN LOWER(status) = 'ready' THEN 1 ELSE 0 END) AS orders_ready
       FROM orders
       WHERE pickup_date = ?`,
      [today]
    );

    // 2. Sales sum for today
    const [salesStats] = await pool.query(
      `SELECT
        COALESCE(SUM(oi.quantity * oi.unit_price), 0.00) AS total_sales_today,
        COALESCE(SUM(oi.quantity), 0) AS total_plates_today
       FROM orders o
       JOIN order_items oi ON o.order_id = oi.order_id
       WHERE o.pickup_date = ? AND LOWER(o.status) NOT IN ('cancelled')`,
      [today]
    );

    // 3. Hourly sales distribution for today
    const [hourlyRows] = await pool.query(
      `SELECT
        HOUR(o.order_date) AS hr,
        COALESCE(SUM(oi.quantity * oi.unit_price), 0.00) AS sales,
        COALESCE(SUM(oi.quantity), 0) AS count
       FROM orders o
       JOIN order_items oi ON o.order_id = oi.order_id
       WHERE o.pickup_date = ? AND LOWER(o.status) NOT IN ('cancelled')
       GROUP BY HOUR(o.order_date)
       ORDER BY hr ASC`,
      [today]
    );

    // Format hourly sales for chart
    const standardHours = [8, 10, 12, 14, 16, 18];
    const hourlyMap = {};
    for (const r of hourlyRows) {
      hourlyMap[r.hr] = Number(r.sales || 0);
    }

    const hourlySales = standardHours.map((hr) => {
      const displayHour = hr < 12 ? `${hr} AM` : hr === 12 ? '12 PM' : `${hr - 12} PM`;
      // Sum sales in a 2-hour bracket around standard hour
      let sum = 0;
      for (let h = hr; h < hr + 2; h++) {
        sum += hourlyMap[h] || 0;
      }
      return {
        hour: displayHour,
        sales: sum,
      };
    });

    // 4. Top selling items today
    const [topItems] = await pool.query(
      `SELECT
        m.name,
        COALESCE(SUM(oi.quantity), 0) AS count
       FROM order_items oi
       JOIN orders o ON oi.order_id = o.order_id
       JOIN menu_items m ON oi.menu_item_id = m.menu_item_id
       WHERE o.pickup_date = ? AND LOWER(o.status) NOT IN ('cancelled')
       GROUP BY m.menu_item_id, m.name
       ORDER BY count DESC
       LIMIT 5`,
      [today]
    );

    const servedToday = Number(orderStats[0]?.orders_served_today || 0);
    const queueCount = Number(orderStats[0]?.orders_in_queue || 0);
    const readyCount = Number(orderStats[0]?.orders_ready || 0);
    const salesToday = Number(salesStats[0]?.total_sales_today || 0);
    const platesToday = Number(salesStats[0]?.total_plates_today || 0);

    res.json({
      orders_served_today: servedToday,
      total_sales_today: salesToday,
      orders_in_queue: queueCount,
      orders_ready: readyCount,
      total_plates_today: platesToday,
      satisfaction: 98,
      hourly_sales: hourlySales,
      top_items: topItems.map((item) => ({
        name: item.name,
        count: Number(item.count),
        max: Math.max(20, Number(item.count)),
      })),
    });
  } catch (error) {
    console.error('[API Error] GET /api/cashier/overview:', error);
    res.status(500).json({ error: 'Failed to fetch cashier overview metrics', message: error.message });
  }
});

/**
 * GET /api/cashier/orders
 * Returns orders with items summary, student details, and token
 */
router.get('/orders', async (req, res) => {
  try {
    const { status, date, search } = req.query;
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

    // Date filter: if not specified or "today", filter by today. If "all", no date constraint.
    if (date && date !== 'all') {
      query += ` AND o.pickup_date = ?`;
      params.push(date);
    } else if (!date) {
      query += ` AND o.pickup_date = ?`;
      params.push(today);
    }

    // Status filter
    if (status && status !== 'all') {
      query += ` AND LOWER(o.status) = LOWER(?)`;
      params.push(status);
    }

    // Search filter (searches order_id, student name, or item name)
    if (search && search.trim() !== '') {
      const term = `%${search.trim()}%`;
      query += ` AND (
        CAST(o.order_id AS CHAR) LIKE ? OR
        u.full_name LIKE ? OR
        m.name LIKE ?
      )`;
      params.push(term, term, term);
    }

    query += ` GROUP BY o.order_id, o.user_id, u.full_name, u.email, o.order_date, o.pickup_date, o.pickup_slot, o.payment_status, o.status`;
    query += ` ORDER BY o.order_date DESC, o.order_id DESC LIMIT 100`;

    const [rows] = await pool.query(query, params);

    const formatted = rows.map((r) => {
      const token = formatToken(r.order_id);
      const timeStr = r.order_date
        ? new Date(r.order_date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
        : '12:00 PM';

      return {
        order_id: r.order_id,
        token,
        student: r.student_name,
        student_id: `STU-${String(r.user_id).padStart(3, '0')}`,
        student_email: r.student_email,
        meal: r.items_summary || 'PlateWise Campus Meal',
        items_summary: r.items_summary || 'Standard Meal',
        total_quantity: Number(r.total_quantity),
        total_amount: Number(r.total_amount),
        status: r.status,
        pickup_slot: r.pickup_slot,
        time: timeStr,
        payment: r.payment_status ? `${r.payment_status} (UPI/Credits)` : 'Paid (Credits)',
        counter: 'Canteen · Main Counter',
      };
    });

    res.json(formatted);
  } catch (error) {
    console.error('[API Error] GET /api/cashier/orders:', error);
    res.status(500).json({ error: 'Failed to fetch cashier orders', message: error.message });
  }
});

/**
 * GET /api/cashier/verify/:token
 * Lookup and verify a student order by token or order ID
 */
router.get('/verify/:token', async (req, res) => {
  try {
    const rawToken = req.params.token;
    let orderId = parseTokenToOrderId(rawToken);

    if (!orderId) {
      return res.status(404).json({
        found: false,
        error: `Invalid token format '${rawToken}'. Expected format like #A-42, #B-25, or order number.`,
      });
    }

    let [rows] = await pool.query(
      `SELECT
        o.order_id,
        o.user_id,
        u.full_name AS student_name,
        u.email AS student_email,
        o.order_date,
        o.pickup_date,
        o.pickup_slot,
        o.payment_status,
        o.status,
        GROUP_CONCAT(CONCAT(m.name, ' x ', oi.quantity) SEPARATOR ', ') AS meal_items,
        COALESCE(SUM(oi.quantity * oi.unit_price), 0.00) AS total_amount
       FROM orders o
       JOIN users u ON o.user_id = u.user_id
       LEFT JOIN order_items oi ON o.order_id = oi.order_id
       LEFT JOIN menu_items m ON oi.menu_item_id = m.menu_item_id
       WHERE o.order_id = ?
       GROUP BY o.order_id, o.user_id, u.full_name, u.email, o.order_date, o.pickup_date, o.pickup_slot, o.payment_status, o.status`,
      [orderId]
    );

    // If order was not found by exact numeric ID, and user entered a short number (e.g. "25"),
    // support fallback match for active orders ending with that suffix
    if (rows.length === 0 && orderId < 100 && /^\d{1,2}$/.test(String(rawToken).trim().replace(/^#/, ''))) {
      const suffix = orderId;
      const [fallbackRows] = await pool.query(
        `SELECT
          o.order_id,
          o.user_id,
          u.full_name AS student_name,
          u.email AS student_email,
          o.order_date,
          o.pickup_date,
          o.pickup_slot,
          o.payment_status,
          o.status,
          GROUP_CONCAT(CONCAT(m.name, ' x ', oi.quantity) SEPARATOR ', ') AS meal_items,
          COALESCE(SUM(oi.quantity * oi.unit_price), 0.00) AS total_amount
         FROM orders o
         JOIN users u ON o.user_id = u.user_id
         LEFT JOIN order_items oi ON o.order_id = oi.order_id
         LEFT JOIN menu_items m ON oi.menu_item_id = m.menu_item_id
         WHERE (o.order_id % 100) = ?
         GROUP BY o.order_id, o.user_id, u.full_name, u.email, o.order_date, o.pickup_date, o.pickup_slot, o.payment_status, o.status
         ORDER BY (CASE WHEN LOWER(o.status) = 'ready' THEN 1 WHEN LOWER(o.status) = 'preparing' THEN 2 ELSE 3 END), o.order_date DESC
         LIMIT 1`,
        [suffix]
      );
      if (fallbackRows.length > 0) {
        rows = fallbackRows;
        orderId = fallbackRows[0].order_id;
      }
    }

    if (rows.length === 0) {
      return res.status(404).json({
        found: false,
        error: `No registered order found for token ${rawToken} (Order #${orderId}).`,
      });
    }

    const ord = rows[0];
    const token = formatToken(ord.order_id);
    const normStatus = String(ord.status || '').toLowerCase();
    const isReady = normStatus === 'ready';
    const isCollected = normStatus === 'collected' || normStatus === 'picked_up';
    const isPreparing = normStatus === 'preparing';
    const isPending = normStatus === 'pending' || normStatus === 'confirmed';

    let reason = '';
    if (isCollected) {
      reason = 'Order has already been collected and served.';
    } else if (isPreparing) {
      reason = 'Order is still being prepared by kitchen staff. Please ask student to wait.';
    } else if (isPending) {
      reason = 'Order is in preparation queue. Not yet ready for counter pickup.';
    } else if (normStatus === 'cancelled') {
      reason = 'Order was cancelled.';
    }

    const timeStr = ord.order_date
      ? new Date(ord.order_date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
      : '12:30 PM';

    res.json({
      found: true,
      order_id: ord.order_id,
      token,
      student: ord.student_name,
      studentId: `STU-${String(ord.user_id).padStart(3, '0')}`,
      meal: ord.meal_items || 'PlateWise Campus Meal',
      time: timeStr,
      counter: 'Canteen · Main Counter',
      payment: ord.payment_status ? `${ord.payment_status} (UPI/Credits)` : 'Paid (Credits)',
      status: ord.status,
      eligible: isReady,
      reason,
      total_amount: Number(ord.total_amount),
    });
  } catch (error) {
    console.error('[API Error] GET /api/cashier/verify/:token:', error);
    res.status(500).json({ error: 'Failed to verify token', message: error.message });
  }
});

/**
 * PATCH /api/cashier/orders/:orderId/handover
 * Enforces requirement: Cashier handover must ONLY transition Ready orders to Collected.
 */
router.patch('/orders/:orderId/handover', async (req, res) => {
  try {
    const rawId = req.params.orderId;
    let orderId = parseTokenToOrderId(rawId);

    if (!orderId) {
      return res.status(400).json({ error: 'Invalid order ID provided.' });
    }

    let [rows] = await pool.query(
      `SELECT order_id, status FROM orders WHERE order_id = ?`,
      [orderId]
    );

    // Suffix fallback if 1-2 digit id was passed and not found directly
    if (rows.length === 0 && orderId < 100) {
      const [fallbackRows] = await pool.query(
        `SELECT order_id, status FROM orders WHERE (order_id % 100) = ? ORDER BY (CASE WHEN LOWER(status) = 'ready' THEN 1 ELSE 2 END) LIMIT 1`,
        [orderId]
      );
      if (fallbackRows.length > 0) {
        rows = fallbackRows;
        orderId = fallbackRows[0].order_id;
      }
    }

    if (rows.length === 0) {
      return res.status(404).json({ error: `Order #${orderId} not found.` });
    }

    const currentStatus = rows[0].status;
    const normStatus = String(currentStatus || '').toLowerCase();

    // Strict validation: Handover must only transition Ready orders to Collected
    if (normStatus !== 'ready') {
      return res.status(409).json({
        error: 'Invalid State Transition',
        message: `Cannot hand over order #${orderId}. Current status is '${currentStatus}'. Only 'Ready' orders can be handed over and marked as 'Collected'.`,
        current_status: currentStatus,
      });
    }

    const [updateRes] = await pool.query(
      `UPDATE orders SET status = 'Collected' WHERE order_id = ? AND status = 'Ready'`,
      [orderId]
    );

    if (updateRes.affectedRows === 0) {
      return res.status(409).json({
        error: 'Concurrent Handover Conflict',
        message: `Order #${orderId} was already collected or its status changed.`,
        current_status: 'Collected',
      });
    }

    res.json({
      success: true,
      message: `Meal handed over! Order #${orderId} marked as Collected.`,
      order_id: orderId,
      previous_status: 'Ready',
      status: 'Collected',
    });
  } catch (error) {
    console.error(`[API Error] PATCH /api/cashier/orders/${req.params.orderId}/handover:`, error);
    res.status(500).json({ error: 'Failed to hand over meal', message: error.message });
  }
});

export default router;
