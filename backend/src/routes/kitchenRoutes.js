import { Router } from 'express';
import pool from '../config/db.js';
import { authenticate, requireRole, validateCsrf } from '../middleware/roleMiddleware.js';
import { formatToken } from '../utils/pickupToken.js';
import { withTransactionRetry } from '../utils/transactionHelper.js';
import {
  calculateBatchStock,
  createDonation,
  revokeDonation,
  collectClaim,
  processExpiredDonations,
  getKitchenDonations,
  getDonationById,
  getAvailableBatches,
} from '../services/donationService.js';

const router = Router();

// Kitchen endpoints require authentication, 'kitchen' or 'admin' role, and CSRF check on mutations
router.use(authenticate);
router.use(requireRole('kitchen', 'admin'));
router.use(validateCsrf);

// Named threshold for inventory status
const LOW_STOCK_THRESHOLD = 15;

// Valid state machine transitions for kitchen preparation pipeline
// Kitchen actions strictly follow preparation steps: Pending -> Confirmed -> Preparing -> Ready
// Kitchen roles NEVER get a handover (Ready -> Collected) action.
const KITCHEN_ALLOWED_TRANSITIONS = {
  Pending: ['Confirmed', 'Preparing', 'Cancelled'],
  Confirmed: ['Preparing', 'Cancelled'],
  Preparing: ['Ready', 'Cancelled'],
  Ready: [], // Handover strictly performed by Cashier at counter
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
      token: formatToken(o.order_id),
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
 * Enforces strict valid status transitions with 409 Conflict rejection.
 * Strict Constraint: Kitchen roles NEVER perform handover (Ready -> Collected).
 */
router.patch('/orders/:orderId/status', async (req, res) => {
  const { orderId } = req.params;
  const { status: rawTargetStatus, current_status: clientCurrentStatus } = req.body;

  if (!rawTargetStatus) {
    return res.status(400).json({ error: 'Target status is required in request body.' });
  }

  const targetStatus = normalizeStatus(rawTargetStatus);

  // Strict constraint: Handover (Ready -> Collected) is strictly Cashier-only at counter
  if (targetStatus === 'Collected') {
    return res.status(403).json({
      error: 'Action Forbidden',
      message: 'Handover to Collected must be performed by Cashier staff at the pickup counter.',
    });
  }

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

    // 3. Check valid state transitions for kitchen preparation pipeline
    const allowedTransitions = KITCHEN_ALLOWED_TRANSITIONS[dbCurrentStatus] || [];

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
 * Real-time production-based surplus food calculation and live inventory status.
 * Returns the full dual-horizon breakdown across prepared, committed, cancelled,
 * collected, wasted, reserved, and available quantities.
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
        fb.food_batch_id,
        fb.batch_code,
        fb.meal_session,
        fb.status AS batch_status,
        fb.notes AS batch_notes
       FROM menu_items m
       LEFT JOIN food_batches fb ON m.menu_item_id = fb.menu_item_id AND fb.batch_date = ?
       ORDER BY m.category, m.name, fb.food_batch_id DESC`,
      [targetDate]
    );

    const items = [];
    const seenMenuItems = new Set();

    for (const row of rows) {
      if (row.food_batch_id) {
        const stock = await calculateBatchStock(pool, row.food_batch_id);
        const totalPrepared = stock ? stock.cooked_qty : 0;
        const ordersCommitted = stock ? stock.new_linked_sales : 0;
        const cancelledOrders = stock ? stock.cancelled_orders_qty : 0;
        const collectedDonations = stock ? stock.collected_donations : 0;
        const recordedWaste = stock ? stock.recorded_waste : 0;
        const activeReservations = stock ? stock.active_reservations : 0;
        const physicalStock = stock ? stock.physical_stock_remaining : 0;
        const availableSurplus = stock ? stock.available_stock : 0;

        let status = 'Available';
        if (availableSurplus <= 0) {
          status = 'Out of Stock';
        } else if (availableSurplus <= LOW_STOCK_THRESHOLD) {
          status = 'Low Stock';
        }

        items.push({
          menu_item_id: row.menu_item_id,
          item_name: row.item_name,
          category: row.category,
          price: Number(row.price || 0),
          food_batch_id: row.food_batch_id,
          batch_code: row.batch_code || `BATCH-${row.food_batch_id}`,
          meal_session: row.meal_session || 'Lunch',
          batch_status: row.batch_status || 'Active',
          notes: row.batch_notes || '',
          // 7 Core Specified Metrics
          total_prepared: totalPrepared,
          student_orders_committed: ordersCommitted,
          cancelled_orders_qty: cancelledOrders,
          collected_donations: collectedDonations,
          recorded_waste: recordedWaste,
          active_reservations: activeReservations,
          available_surplus: availableSurplus,
          physical_stock_remaining: physicalStock,
          // Backward-compatible properties
          produced_qty: totalPrepared,
          sold_qty: ordersCommitted,
          remaining_qty: availableSurplus,
          available_qty: availableSurplus,
          status,
        });
        seenMenuItems.add(row.menu_item_id);
      } else if (!seenMenuItems.has(row.menu_item_id)) {
        items.push({
          menu_item_id: row.menu_item_id,
          item_name: row.item_name,
          category: row.category,
          price: Number(row.price || 0),
          food_batch_id: null,
          batch_code: null,
          meal_session: null,
          batch_status: 'No Batch',
          notes: '',
          total_prepared: 0,
          student_orders_committed: 0,
          cancelled_orders_qty: 0,
          collected_donations: 0,
          recorded_waste: 0,
          active_reservations: 0,
          available_surplus: 0,
          physical_stock_remaining: 0,
          produced_qty: 0,
          sold_qty: 0,
          remaining_qty: 0,
          available_qty: 0,
          status: 'Out of Stock',
        });
        seenMenuItems.add(row.menu_item_id);
      }
    }

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

/**
 * 6b. POST /api/kitchen/production
 * Kitchen staff records total plates prepared for a food item and meal session.
 * Enforces transaction safety, duplicate rejection, and dependent commitment protection.
 */
router.post('/production', async (req, res) => {
  const { menu_item_id, batch_date, cooked_qty, meal_session, batch_code, notes } = req.body || {};
  const menuItemId = parseInt(menu_item_id, 10);
  const cookedQuantity = parseInt(cooked_qty, 10);

  if (isNaN(menuItemId) || menuItemId <= 0) {
    return res.status(400).json({ error: 'Valid menu_item_id is required.' });
  }
  if (isNaN(cookedQuantity) || cookedQuantity <= 0) {
    return res.status(400).json({ error: 'Cooked quantity must be a positive integer.' });
  }

  const validSessions = ['Breakfast', 'Lunch', 'Evening', 'Dinner', 'All_Day'];
  const session = validSessions.includes(meal_session) ? meal_session : 'Lunch';
  const targetDate = batch_date || new Date().toISOString().split('T')[0];

  try {
    const result = await withTransactionRetry(pool, async (conn) => {
      // 1. Verify menu item exists
      const [menuItems] = await conn.query(
        `SELECT menu_item_id, name, category, price FROM menu_items WHERE menu_item_id = ?`,
        [menuItemId]
      );
      if (menuItems.length === 0) {
        const error = new Error(`Menu item #${menuItemId} not found.`);
        error.statusCode = 404;
        throw error;
      }
      const menuItem = menuItems[0];

      // 2. Check for existing batch for (menu_item_id, batch_date, meal_session)
      const [existingBatches] = await conn.query(
        `SELECT * FROM food_batches
         WHERE menu_item_id = ? AND batch_date = ? AND meal_session = ?
         FOR UPDATE`,
        [menuItemId, targetDate, session]
      );

      const generatedCode = batch_code?.trim() ||
        `BATCH-${menuItemId}-${targetDate.replace(/-/g, '')}-${session.toUpperCase()}`;

      if (existingBatches.length > 0) {
        const existing = existingBatches[0];
        // Calculate dependent commitments
        const currentStock = await calculateBatchStock(conn, existing.food_batch_id);
        const committedOrders = currentStock.new_linked_sales;
        const collectedDonations = currentStock.collected_donations;
        const recordedWaste = currentStock.recorded_waste;
        const totalCommitted = committedOrders + collectedDonations + recordedWaste;

        // Duplicate submission prevention
        if (cookedQuantity === Number(existing.cooked_qty)) {
          const error = new Error(
            `A production batch for "${menuItem.name}" on ${targetDate} (${session}) already exists with ${existing.cooked_qty} plates (Batch #${existing.food_batch_id}). Duplicate submission rejected.`
          );
          error.statusCode = 409;
          error.code = 'DUPLICATE_PRODUCTION_ENTRY';
          throw error;
        }

        // Prevent reduction below already committed stock
        if (cookedQuantity < totalCommitted) {
          const error = new Error(
            `Cannot update prepared plates to ${cookedQuantity}. ${totalCommitted} plates are already committed (${committedOrders} ordered, ${collectedDonations} collected as donation, ${recordedWaste} logged as waste).`
          );
          error.statusCode = 409;
          error.code = 'BELOW_COMMITTED_STOCK';
          throw error;
        }

        // Update existing batch
        const oldVal = { cooked_qty: existing.cooked_qty, notes: existing.notes, batch_code: existing.batch_code };
        const newVal = { cooked_qty: cookedQuantity, notes: notes || existing.notes, batch_code: generatedCode };

        await conn.query(
          `UPDATE food_batches
           SET cooked_qty = ?, notes = ?, batch_code = ?, updated_at = NOW()
           WHERE food_batch_id = ?`,
          [cookedQuantity, notes || existing.notes, generatedCode, existing.food_batch_id]
        );

        // Record audit trail
        await conn.query(
          `INSERT INTO audit_logs (table_name, record_id, action, old_value, new_value, changed_by, changed_at)
           VALUES ('food_batches', ?, 'UPDATE', ?, ?, ?, NOW())`,
          [
            existing.food_batch_id,
            JSON.stringify(oldVal),
            JSON.stringify(newVal),
            req.user.user_id,
          ]
        );

        const updatedStock = await calculateBatchStock(conn, existing.food_batch_id);

        return {
          action: 'UPDATED',
          food_batch_id: existing.food_batch_id,
          menu_item_id: menuItemId,
          item_name: menuItem.name,
          batch_date: targetDate,
          meal_session: session,
          batch_code: generatedCode,
          cooked_qty: cookedQuantity,
          notes: notes || existing.notes,
          stock: updatedStock,
        };
      }

      // 3. Insert new batch
      const [insertRes] = await conn.query(
        `INSERT INTO food_batches (
          menu_item_id, batch_date, meal_session, batch_code, cooked_qty,
          sold_qty, leftover_qty, status, notes, created_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, 0, ?, 'Active', ?, ?, NOW(), NOW())`,
        [
          menuItemId,
          targetDate,
          session,
          generatedCode,
          cookedQuantity,
          cookedQuantity,
          notes || null,
          req.user.user_id,
        ]
      );

      const newBatchId = insertRes.insertId;

      // Record audit log
      await conn.query(
        `INSERT INTO audit_logs (table_name, record_id, action, old_value, new_value, changed_by, changed_at)
         VALUES ('food_batches', ?, 'INSERT', NULL, ?, ?, NOW())`,
        [
          newBatchId,
          JSON.stringify({
            menu_item_id: menuItemId,
            item_name: menuItem.name,
            batch_date: targetDate,
            meal_session: session,
            batch_code: generatedCode,
            cooked_qty: cookedQuantity,
          }),
          req.user.user_id,
        ]
      );

      const initialStock = await calculateBatchStock(conn, newBatchId);

      return {
        action: 'CREATED',
        food_batch_id: newBatchId,
        menu_item_id: menuItemId,
        item_name: menuItem.name,
        batch_date: targetDate,
        meal_session: session,
        batch_code: generatedCode,
        cooked_qty: cookedQuantity,
        notes: notes || null,
        stock: initialStock,
      };
    });

    const isCreated = result.action === 'CREATED';
    res.status(isCreated ? 201 : 200).json({
      success: true,
      message: `Production batch for "${result.item_name}" (${result.cooked_qty} plates, ${result.meal_session}) recorded successfully!`,
      batch: result,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    if (statusCode >= 500) {
      console.error('[API Error] POST /api/kitchen/production:', error);
    }
    res.status(statusCode).json({
      error: error.message || 'Failed to record production batch',
      code: error.code,
    });
  }
});

/**
 * 6c. POST /api/kitchen/waste
 * Kitchen staff records food wastage (preparation waste, contamination, or post-service leftovers).
 * Atomically deducts physical on-hand stock and records auditable log.
 */
router.post('/waste', async (req, res) => {
  const { food_batch_id, quantity, category, reason } = req.body || {};
  const parsedBatchId = parseInt(food_batch_id, 10);
  const parsedQty = parseInt(quantity, 10);

  if (isNaN(parsedBatchId) || parsedBatchId <= 0) {
    return res.status(400).json({ error: 'Valid food_batch_id is required.' });
  }
  if (isNaN(parsedQty) || parsedQty <= 0) {
    return res.status(400).json({ error: 'Waste quantity must be a positive integer.' });
  }

  const validCategories = [
    'Preparation_Waste',
    'Contamination',
    'Post_Service_Leftover',
    'Expired_Unclaimed',
    'Expired_Uncollected',
  ];
  const wasteCategory = validCategories.includes(category) ? category : 'Preparation_Waste';

  try {
    const result = await withTransactionRetry(pool, async (conn) => {
      // Lock batch row
      const [batches] = await conn.query(
        `SELECT food_batch_id, menu_item_id, status FROM food_batches WHERE food_batch_id = ? FOR UPDATE`,
        [parsedBatchId]
      );
      if (batches.length === 0) {
        const error = new Error(`Food batch #${parsedBatchId} not found.`);
        error.statusCode = 404;
        throw error;
      }

      // Check current physical stock
      const stock = await calculateBatchStock(conn, parsedBatchId);
      if (parsedQty > stock.physical_stock_remaining) {
        const error = new Error(
          `Cannot log ${parsedQty} wasted portions. Only ${stock.physical_stock_remaining} physical portions remain on hand.`
        );
        error.statusCode = 409;
        throw error;
      }

      // Insert waste log
      const [insertRes] = await conn.query(
        `INSERT INTO waste_logs (food_batch_id, quantity, category, logged_by, reason, logged_at)
         VALUES (?, ?, ?, ?, ?, NOW())`,
        [parsedBatchId, parsedQty, wasteCategory, req.user.user_id, reason || 'Recorded by kitchen staff']
      );

      // Audit log
      await conn.query(
        `INSERT INTO audit_logs (table_name, record_id, action, old_value, new_value, changed_by, changed_at)
         VALUES ('waste_logs', ?, 'INSERT', NULL, ?, ?, NOW())`,
        [
          insertRes.insertId,
          JSON.stringify({ food_batch_id: parsedBatchId, quantity: parsedQty, category: wasteCategory }),
          req.user.user_id,
        ]
      );

      const updatedStock = await calculateBatchStock(conn, parsedBatchId);
      return {
        waste_log_id: insertRes.insertId,
        food_batch_id: parsedBatchId,
        quantity: parsedQty,
        category: wasteCategory,
        stock: updatedStock,
      };
    });

    res.status(201).json({
      success: true,
      message: `Recorded ${parsedQty} wasted portions successfully.`,
      ...result,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    if (statusCode >= 500) {
      console.error('[API Error] POST /api/kitchen/waste:', error);
    }
    res.status(statusCode).json({ error: error.message || 'Failed to log waste' });
  }
});

/**
 * 6d. GET /api/kitchen/batches/:id/stock
 * Retrieves live real-time stock calculation for a specific batch.
 */
router.get('/batches/:id/stock', async (req, res) => {
  const batchId = parseInt(req.params.id, 10);
  if (isNaN(batchId) || batchId <= 0) {
    return res.status(400).json({ error: 'Valid batch ID is required' });
  }
  try {
    const stock = await calculateBatchStock(pool, batchId);
    if (!stock) {
      return res.status(404).json({ error: 'Food batch not found' });
    }
    res.json(stock);
  } catch (error) {
    console.error('[API Error] GET /api/kitchen/batches/:id/stock:', error);
    res.status(500).json({ error: 'Failed to retrieve batch stock', message: error.message });
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

/**
 * 7. GET /api/kitchen/menu
 * Returns all canteen menu items with availability status and preparation metrics
 */
router.get('/menu', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const [rows] = await pool.query(
      `SELECT
        m.menu_item_id,
        m.name,
        m.category,
        m.price,
        m.is_available,
        m.created_at,
        COALESCE(fb.cooked_qty, 0) AS prepared_today,
        COALESCE(fb.sold_qty, 0) AS sold_today
       FROM menu_items m
       LEFT JOIN food_batches fb ON m.menu_item_id = fb.menu_item_id AND fb.batch_date = ?
       ORDER BY m.category, m.name`,
      [today]
    );

    const formatted = rows.map((item) => ({
      id: item.menu_item_id,
      menu_item_id: item.menu_item_id,
      name: item.name,
      category: item.category,
      price: Number(item.price),
      is_available: Boolean(item.is_available),
      available: Boolean(item.is_available),
      prepared: Number(item.prepared_today || 0),
      sold: Number(item.sold_today || 0),
      maxPortions: Math.max(50, Number(item.prepared_today || 0)),
    }));

    res.json(formatted);
  } catch (error) {
    console.error('[API Error] GET /api/kitchen/menu:', error);
    res.status(500).json({ error: 'Failed to fetch kitchen menu items', message: error.message });
  }
});

/**
 * 8. PATCH /api/kitchen/menu/:id/availability
 * Toggles or updates is_available for a menu item in MySQL.
 * Authorized for 'kitchen' and 'admin' roles.
 * Does not delete items or alter historical orders.
 */
router.patch('/menu/:id/availability', async (req, res) => {
  const menuItemId = parseInt(req.params.id, 10);
  const { is_available } = req.body;

  if (isNaN(menuItemId) || menuItemId <= 0) {
    return res.status(400).json({ error: 'Invalid menu item ID.' });
  }

  if (typeof is_available !== 'boolean') {
    return res.status(400).json({ error: 'is_available must be a boolean (true or false).' });
  }

  try {
    const [existing] = await pool.query(
      `SELECT menu_item_id, name, is_available FROM menu_items WHERE menu_item_id = ?`,
      [menuItemId]
    );

    if (existing.length === 0) {
      return res.status(404).json({ error: `Menu item #${menuItemId} not found.` });
    }

    await pool.query(
      `UPDATE menu_items SET is_available = ? WHERE menu_item_id = ?`,
      [is_available ? 1 : 0, menuItemId]
    );

    const actionText = is_available ? 'live on student app' : 'sold out / unavailable';
    res.json({
      success: true,
      message: `Menu item "${existing[0].name}" is now marked as ${actionText}.`,
      menu_item_id: menuItemId,
      name: existing[0].name,
      is_available,
    });
  } catch (error) {
    console.error(`[API Error] PATCH /api/kitchen/menu/${menuItemId}/availability:`, error);
    res.status(500).json({ error: 'Failed to update menu item availability', message: error.message });
  }
});

/**
 * 9. POST /api/kitchen/donations
 * Kitchen publishes surplus food from a prepared batch as an NGO donation.
 * Strictly verifies available inventory without double allocation.
 */
router.post('/donations', async (req, res) => {
  const { food_batch_id, menu_item_id, quantity, collection_deadline, notes } = req.body;

  let parsedBatchId = parseInt(food_batch_id, 10);
  if ((isNaN(parsedBatchId) || parsedBatchId <= 0) && menu_item_id) {
    const mId = parseInt(menu_item_id, 10);
    const targetDate = req.body.date || new Date().toISOString().split('T')[0];
    const [bRows] = await pool.query(
      `SELECT food_batch_id FROM food_batches WHERE menu_item_id = ? AND batch_date = ? AND status IN ('Active', 'Surplus') ORDER BY food_batch_id DESC LIMIT 1`,
      [mId, targetDate]
    );
    if (bRows.length > 0) {
      parsedBatchId = bRows[0].food_batch_id;
    }
  }

  const parsedQty = parseInt(quantity, 10);

  if (isNaN(parsedBatchId) || parsedBatchId <= 0) {
    return res.status(400).json({ error: 'Valid food_batch_id is required.' });
  }

  if (isNaN(parsedQty) || parsedQty <= 0) {
    return res.status(400).json({ error: 'Donation quantity must be a positive integer.' });
  }

  try {
    const result = await withTransactionRetry(pool, async (conn) => {
      return await createDonation(conn, {
        foodBatchId: parsedBatchId,
        quantity: parsedQty,
        collectionDeadline: collection_deadline,
        staffUserId: req.user.user_id,
        notes,
      });
    });

    res.status(201).json({
      success: true,
      message: `Surplus food donation #${result.donation_id} (${result.quantity} portions) published successfully!`,
      donation: result,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    if (statusCode >= 500) {
      console.error('[API Error] POST /api/kitchen/donations:', error);
    }
    res.status(statusCode).json({
      error: error.message || 'Failed to create donation',
      message: error.message,
    });
  }
});

/**
 * 10. GET /api/kitchen/donations
 * Retrieves list of donations with remaining quantity and child claim summaries.
 */
router.get('/donations', async (req, res) => {
  try {
    const donations = await getKitchenDonations(pool, req.query);
    res.json(donations);
  } catch (error) {
    console.error('[API Error] GET /api/kitchen/donations:', error);
    res.status(500).json({ error: 'Failed to fetch kitchen donations', message: error.message });
  }
});

/**
 * 11. GET /api/kitchen/donations/:id
 * Retrieves details of a specific donation and all its child claims.
 */
router.get('/donations/:id', async (req, res) => {
  const donationId = parseInt(req.params.id, 10);
  if (isNaN(donationId) || donationId <= 0) {
    return res.status(400).json({ error: 'Invalid donation ID' });
  }

  try {
    const donation = await getDonationById(pool, donationId);
    if (!donation) {
      return res.status(404).json({ error: `Donation #${donationId} not found` });
    }
    res.json(donation);
  } catch (error) {
    console.error(`[API Error] GET /api/kitchen/donations/${donationId}:`, error);
    res.status(500).json({ error: 'Failed to fetch donation details', message: error.message });
  }
});

/**
 * 12. POST /api/kitchen/donations/:id/revoke
 * Revokes an active donation offer, cancels pending uncollected claims, and restores batch stock.
 */
router.post('/donations/:id/revoke', async (req, res) => {
  const donationId = parseInt(req.params.id, 10);
  const { reason } = req.body || {};

  if (isNaN(donationId) || donationId <= 0) {
    return res.status(400).json({ error: 'Invalid donation ID' });
  }

  try {
    const result = await withTransactionRetry(pool, async (conn) => {
      return await revokeDonation(conn, {
        donationId,
        staffUserId: req.user.user_id,
        reason,
      });
    });

    res.json({
      success: true,
      message: `Donation offer #${donationId} revoked successfully. Released ${result.released_quantity} portions.`,
      ...result,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    if (statusCode >= 500) {
      console.error(`[API Error] POST /api/kitchen/donations/${donationId}/revoke:`, error);
    }
    res.status(statusCode).json({
      error: error.message || 'Failed to revoke donation',
      message: error.message,
    });
  }
});

/**
 * 13. POST /api/kitchen/donations/expire-check
 * Triggers donation expiry processing: identifies expired offers, cancels uncollected claims,
 * releases reservations, and logs uncollected food to waste_logs idempotently.
 */
router.post('/donations/expire-check', async (req, res) => {
  try {
    const result = await withTransactionRetry(pool, async (conn) => {
      return await processExpiredDonations(conn, req.user.user_id);
    });

    res.json({
      success: true,
      message: `Expiry check complete. ${result.expired_donations_count} donations expired, ${result.waste_logs_created} waste logs created.`,
      ...result,
    });
  } catch (error) {
    console.error('[API Error] POST /api/kitchen/donations/expire-check:', error);
    res.status(500).json({ error: 'Failed to process donation expiration', message: error.message });
  }
});

/**
 * 14. GET /api/kitchen/batches/available
 * Retrieves food batches with positive available stock eligible for publishing as donations.
 */
router.get('/batches/available', async (req, res) => {
  try {
    const batches = await getAvailableBatches(pool);
    res.json(batches);
  } catch (error) {
    console.error('[API Error] GET /api/kitchen/batches/available:', error);
    res.status(500).json({ error: 'Failed to fetch available batches', message: error.message });
  }
});

/**
 * 15. POST /api/kitchen/donations/handover
 * Performs dock handover: verifies NGO claim verification code and marks portions Collected.
 * Physically deducts inventory from the kitchen on-hand balance.
 */
router.post('/donations/handover', async (req, res) => {
  const { verification_code } = req.body || {};

  if (!verification_code || typeof verification_code !== 'string') {
    return res.status(400).json({ error: 'Verification code is required.' });
  }

  try {
    const result = await withTransactionRetry(pool, async (conn) => {
      return await collectClaim(conn, {
        verificationCode: verification_code.trim(),
        staffUserId: req.user.user_id,
      });
    });

    res.json({
      success: true,
      message: `Dock handover verified! ${result.quantity} portions handed over to NGO partner.`,
      ...result,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    if (statusCode >= 500) {
      console.error('[API Error] POST /api/kitchen/donations/handover:', error);
    }
    res.status(statusCode).json({
      error: error.message || 'Failed to complete dock handover',
      message: error.message,
    });
  }
});

export default router;
