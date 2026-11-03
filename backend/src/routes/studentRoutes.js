import { Router } from 'express';
import pool from '../config/db.js';
import { authenticate, requireRole, validateCsrf } from '../middleware/roleMiddleware.js';
import {
  SLOT_CONFIG,
  isValidCalendarDate,
  isDateInPast,
  isSlotInPast,
  computeSlotStatus,
  getCurrentKolkataDate,
} from '../config/slotConfig.js';
import { formatToken } from '../utils/pickupToken.js';
import { withTransactionRetry } from '../utils/transactionHelper.js';
import {
  createSponsorship,
  executeStudentPaymentAttempt,
  getAvailableCommunityCredits,
  getStudentSponsorships,
  getSponsorshipById,
  getCreditHistory,
} from '../services/sponsorshipCreditService.js';
import {
  calculateCheckoutSummary,
  processStudentCheckout,
  cancelStudentOrderWithCreditReversal,
} from '../services/checkoutService.js';
import { calculateBatchStock } from '../services/donationService.js';

const router = Router();

// Student routes require authentication and 'student' role
router.use(authenticate);
router.use(requireRole('student'));

// In-memory idempotency cache for duplicate submission prevention (TTL 30 seconds)
const idempotencyCache = new Map();
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamp] of idempotencyCache.entries()) {
    if (now - timestamp > 30000) {
      idempotencyCache.delete(key);
    }
  }
}, 30000);

/**
 * 1. GET /api/student/dashboard
 * Aggregates student's orders summary, active pickup, and recent 5 orders.
 * Scoped strictly to req.user.user_id.
 */
router.get('/dashboard', async (req, res) => {
  const userId = req.user.user_id;

  try {
    // 1. Order counts and total spent
    const [countsRows] = await pool.query(
      `SELECT
        COUNT(*) AS total_orders,
        COUNT(CASE WHEN status IN ('Pending', 'Confirmed', 'Preparing', 'Ready') THEN 1 END) AS active_orders,
        COUNT(CASE WHEN status IN ('Collected', 'picked_up') THEN 1 END) AS completed_orders,
        COUNT(CASE WHEN status = 'Cancelled' THEN 1 END) AS cancelled_orders
       FROM orders
       WHERE user_id = ?`,
      [userId]
    );

    const [spentRows] = await pool.query(
      `SELECT COALESCE(SUM(oi.quantity * oi.unit_price), 0.00) AS total_spent
       FROM orders o
       JOIN order_items oi ON o.order_id = oi.order_id
       WHERE o.user_id = ? AND o.status IN ('Collected', 'picked_up')`,
      [userId]
    );

    const [complaintsCountRows] = await pool.query(
      `SELECT COUNT(*) AS total_complaints FROM complaints WHERE user_id = ?`,
      [userId]
    );

    // 2. Latest active order (if any)
    const [activeOrderRows] = await pool.query(
      `SELECT
        o.order_id,
        o.order_date,
        o.pickup_date,
        o.pickup_slot,
        o.total_amount,
        o.discount_amount,
        o.final_amount,
        o.payment_method,
        o.payment_status,
        o.status,
        COALESCE(SUM(oi.quantity * oi.unit_price), 0.00) AS calculated_amount,
        GROUP_CONCAT(CONCAT(m.name, ' x ', oi.quantity) SEPARATOR ', ') AS items_summary
       FROM orders o
       LEFT JOIN order_items oi ON o.order_id = oi.order_id
       LEFT JOIN menu_items m ON oi.menu_item_id = m.menu_item_id
       WHERE o.user_id = ? AND o.status IN ('Pending', 'Confirmed', 'Preparing', 'Ready')
       GROUP BY o.order_id, o.order_date, o.pickup_date, o.pickup_slot, o.total_amount, o.discount_amount, o.final_amount, o.payment_method, o.payment_status, o.status
       ORDER BY o.order_date DESC
       LIMIT 1`,
      [userId]
    );

    let activeOrder = activeOrderRows[0] || null;
    if (activeOrder) {
      const [items] = await pool.query(
        `SELECT oi.quantity, oi.unit_price, m.name
         FROM order_items oi
         JOIN menu_items m ON oi.menu_item_id = m.menu_item_id
         WHERE oi.order_id = ?`,
        [activeOrder.order_id]
      );
      activeOrder.items = items;
      activeOrder.total_amount = Number(activeOrder.total_amount !== null ? activeOrder.total_amount : activeOrder.calculated_amount);
      activeOrder.discount_amount = Number(activeOrder.discount_amount || 0);
      activeOrder.final_amount = Number(activeOrder.final_amount !== null ? activeOrder.final_amount : activeOrder.total_amount);
      activeOrder.pickup_token = formatToken(activeOrder.order_id);
    }

    // 3. Recent 5 orders
    const [recentRows] = await pool.query(
      `SELECT
        o.order_id,
        o.order_date,
        o.pickup_date,
        o.pickup_slot,
        o.total_amount,
        o.discount_amount,
        o.final_amount,
        o.payment_method,
        o.payment_status,
        o.status,
        COALESCE(SUM(oi.quantity), 0) AS total_quantity,
        COALESCE(SUM(oi.quantity * oi.unit_price), 0.00) AS calculated_amount,
        GROUP_CONCAT(CONCAT(m.name, ' x ', oi.quantity) SEPARATOR ', ') AS items_summary
       FROM orders o
       LEFT JOIN order_items oi ON o.order_id = oi.order_id
       LEFT JOIN menu_items m ON oi.menu_item_id = m.menu_item_id
       WHERE o.user_id = ?
       GROUP BY o.order_id, o.order_date, o.pickup_date, o.pickup_slot, o.total_amount, o.discount_amount, o.final_amount, o.payment_method, o.payment_status, o.status
       ORDER BY o.order_date DESC
       LIMIT 5`,
      [userId]
    );

    const stats = {
      total_orders: Number(countsRows[0]?.total_orders || 0),
      active_orders: Number(countsRows[0]?.active_orders || 0),
      completed_orders: Number(countsRows[0]?.completed_orders || 0),
      cancelled_orders: Number(countsRows[0]?.cancelled_orders || 0),
      total_spent: Number(spentRows[0]?.total_spent || 0),
      complaints_count: Number(complaintsCountRows[0]?.total_complaints || 0),
    };

    res.json({
      student: {
        user_id: req.user.user_id,
        full_name: req.user.full_name,
        email: req.user.email,
        role: req.user.role,
        created_at: req.user.created_at,
      },
      stats,
      active_order: activeOrder,
      recent_orders: recentRows.map((r) => ({
        ...r,
        pickup_token: formatToken(r.order_id),
        total_quantity: Number(r.total_quantity || 0),
        total_amount: Number(r.total_amount !== null ? r.total_amount : r.calculated_amount),
        discount_amount: Number(r.discount_amount || 0),
        final_amount: Number(r.final_amount !== null ? r.final_amount : (r.total_amount !== null ? r.total_amount : r.calculated_amount)),
      })),
    });
  } catch (error) {
    console.error('[API Error] /api/student/dashboard:', error);
    res.status(500).json({ error: 'Failed to fetch student dashboard metrics', message: error.message });
  }
});

/**
 * 2. GET /api/student/menu
 * Returns available dishes from menu_items.
 */
router.get('/menu', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT menu_item_id, name, category, price, is_available, created_at FROM menu_items ORDER BY category, name`
    );

    const formatted = rows.map((item) => ({
      ...item,
      price: Number(item.price),
      is_available: Boolean(item.is_available),
      stock: 50, // Standard healthy canteen prep stock
    }));

    res.json(formatted);
  } catch (error) {
    console.error('[API Error] /api/student/menu:', error);
    res.status(500).json({ error: 'Failed to load canteen menu items', message: error.message });
  }
});

/**
 * 2a. GET /api/student/surplus
 * Returns real-time available flash surplus deals with 40% discount on end-of-day cafeteria batches.
 */
router.get('/surplus', async (req, res) => {
  try {
    const [batches] = await pool.query(
      `SELECT
        fb.food_batch_id,
        fb.menu_item_id,
        fb.batch_date,
        fb.cooked_qty,
        fb.sold_qty,
        fb.leftover_qty,
        fb.status,
        m.name,
        m.category,
        m.price
       FROM food_batches fb
       JOIN menu_items m ON fb.menu_item_id = m.menu_item_id
       WHERE fb.status IN ('Active', 'Surplus')
       ORDER BY fb.batch_date DESC, fb.food_batch_id DESC`
    );

    const deals = [];
    for (const b of batches) {
      const stock = await calculateBatchStock(pool, b.food_batch_id);
      const availablePortions = stock ? stock.available_stock : Math.max(0, b.leftover_qty);
      if (availablePortions > 0) {
        const catalogPrice = Number(b.price);
        const discountPercentage = 40; // Approved 40% surplus discount
        const surplusPrice = Math.round(catalogPrice * 0.60 * 100) / 100;
        const savings = Math.round(catalogPrice * 0.40 * 100) / 100;

        deals.push({
          deal_id: `deal_${b.food_batch_id}`,
          food_batch_id: b.food_batch_id,
          menu_item_id: b.menu_item_id,
          name: b.name,
          category: b.category,
          original_price: catalogPrice,
          discount_percentage: discountPercentage,
          surplus_price: surplusPrice,
          savings,
          available_portions: availablePortions,
          batch_date: b.batch_date,
          pickup_window: 'Today • Counter 2 Quick Pickup',
          status: 'Active',
        });
      }
    }

    res.json({
      deals,
      total_deals: deals.length,
      discount_percentage: 40,
      canteen_status: 'Surplus Rescue Active',
    });
  } catch (error) {
    console.error('[API Error] GET /api/student/surplus:', error);
    res.status(500).json({ error: 'Failed to load surplus deals', message: error.message });
  }
});

/**
 * 3. GET /api/student/pickup-slots?date=YYYY-MM-DD
 * Dynamic pickup slot capacity management and overbooking prevention.
 * Validates date calendar authenticity and rejects past dates with 400.
 * Computes booked count strictly excluding cancelled orders.
 * Returns each slot's max capacity, booked count, remaining capacity, and status.
 */
router.get('/pickup-slots', async (req, res) => {
  try {
    const { date } = req.query;

    if (!date || !isValidCalendarDate(date)) {
      return res.status(400).json({
        error: 'Invalid Date',
        message: 'Please provide a valid calendar date in YYYY-MM-DD format (e.g. 2026-11-01).',
      });
    }

    if (isDateInPast(date)) {
      return res.status(400).json({
        error: 'Past Date',
        message: 'Selected pickup date is in the past. Please select today or a future date.',
      });
    }

    // 1. Fetch active slots and optional per-date overrides
    const [slotRows] = await pool.query(
      `SELECT
        s.slot_id,
        s.slot,
        s.start_time,
        s.end_time,
        COALESCE(o.max_capacity, s.max_capacity) AS max_capacity,
        COALESCE(o.is_closed, FALSE) AS is_closed,
        s.sort_order
       FROM pickup_slots s
       LEFT JOIN pickup_slot_overrides o
         ON s.slot_id = o.slot_id AND o.pickup_date = ?
       WHERE s.is_active = TRUE
       ORDER BY s.sort_order, s.start_time`,
      [date]
    );

    // 2. Fetch non-cancelled order counts for that date by slot
    const [bookedRows] = await pool.query(
      `SELECT
        pickup_slot,
        COUNT(*) AS booked_count
       FROM orders
       WHERE pickup_date = ?
         AND LOWER(status) != 'cancelled'
       GROUP BY pickup_slot`,
      [date]
    );

    const bookedMap = new Map();
    for (const b of bookedRows) {
      bookedMap.set(b.pickup_slot, Number(b.booked_count || 0));
    }

    // 3. Format slot objects with deterministic status computation
    const formattedSlots = slotRows.map((row) => {
      const maxCap = Math.max(0, Number(row.max_capacity || SLOT_CONFIG.DEFAULT_SLOT_CAPACITY));
      const booked = bookedMap.get(row.slot) || 0;
      const isClosed = Boolean(row.is_closed);
      const isPast = isSlotInPast(row.start_time, date);
      const availableCap = isClosed || isPast ? 0 : Math.max(0, maxCap - booked);
      const isFull = isClosed || availableCap === 0;

      const status = computeSlotStatus({
        isPast,
        maxCapacity: maxCap,
        bookedCount: booked,
        thresholdPercent: SLOT_CONFIG.FILLING_FAST_THRESHOLD_PERCENT,
      });

      return {
        slot: row.slot,
        start_time: String(row.start_time).substring(0, 8),
        end_time: String(row.end_time).substring(0, 8),
        max_capacity: maxCap,
        booked_count: booked,
        available_capacity: availableCap,
        is_full: isFull,
        is_past: isPast,
        status,
      };
    });

    res.json(formattedSlots);
  } catch (error) {
    console.error('[API Error] GET /api/student/pickup-slots:', error);
    res.status(500).json({ error: 'Failed to fetch pickup slots', message: error.message });
  }
});

/**
 * 4. POST /api/student/orders
 * Atomic order creation with optional Open Community Pool meal credit redemption,
 * concurrency-safe slot capacity locking, and financial audit ledger recording.
 * Security: user_id is derived exclusively from req.user.user_id. Prices are re-verified from DB.
 */
router.post('/orders', validateCsrf, async (req, res) => {
  const userId = req.user.user_id;
  const {
    items,
    pickup_slot,
    pickup_date,
    idempotency_key,
    redeem_credits,
    payment_method,
  } = req.body;

  // Validation
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Order must include at least one valid item' });
  }

  for (const item of items) {
    const itemId = parseInt(item.menu_item_id, 10);
    const qty = parseInt(item.quantity, 10);
    if (isNaN(itemId) || itemId <= 0 || isNaN(qty) || qty <= 0) {
      return res.status(400).json({ error: 'Invalid item id or quantity format' });
    }
  }

  const targetDate = pickup_date || getCurrentKolkataDate();
  const targetSlot = pickup_slot || '12:30 PM - 01:00 PM';

  // Date calendar validity checks
  if (!isValidCalendarDate(targetDate)) {
    return res.status(400).json({
      error: 'Invalid Date',
      message: 'Please provide a valid calendar date in YYYY-MM-DD format.',
    });
  }

  if (isDateInPast(targetDate)) {
    return res.status(400).json({
      error: 'Past Date',
      message: 'Selected pickup date is in the past. Please select today or a future date.',
    });
  }

  // Idempotency / Double-submit check
  if (idempotency_key) {
    const userKey = `${userId}:${idempotency_key}`;
    if (idempotencyCache.has(userKey)) {
      return res.status(409).json({
        error: 'Duplicate submission rejected',
        message: 'This order is already being processed or has been created.',
      });
    }
    idempotencyCache.set(userKey, Date.now());
  }

  // Double-submit time-window check: reject identical order created in last 5 seconds
  const [recentDupes] = await pool.query(
    `SELECT order_id FROM orders
     WHERE user_id = ? AND order_date >= NOW() - INTERVAL 5 SECOND`,
    [userId]
  );
  if (recentDupes.length > 0) {
    return res.status(429).json({
      error: 'Too many requests',
      message: 'An order was placed moments ago. Please wait before placing another order.',
    });
  }

  try {
    const result = await withTransactionRetry(pool, async (conn) => {
      return await processStudentCheckout(conn, {
        userId,
        items,
        pickupDate: targetDate,
        pickupSlot: targetSlot,
        redeemCredits: redeem_credits,
        paymentMethod: payment_method,
        idempotencyKey: idempotency_key,
      });
    });

    res.status(201).json(result);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    if (statusCode >= 500) {
      console.error('[API Error] POST /api/student/orders:', error);
    }
    res.status(statusCode).json({
      error: error.error || error.message || 'Failed to place order transaction',
      code: error.code,
      message: error.message,
      slot: error.slot,
      date: error.date,
      max_capacity: error.max_capacity,
      booked_count: error.booked_count,
      unavailable_items: error.unavailable_items,
    });
  }
});

/**
 * 4a. POST /api/student/orders/preview
 * Calculates verified server-authoritative checkout breakdown (subtotal, eligible credits, discount, payable).
 */
router.post('/orders/preview', async (req, res) => {
  const userId = req.user.user_id;
  const { items, redeem_credits } = req.body;

  try {
    const summary = await calculateCheckoutSummary(pool, {
      userId,
      items,
      redeemCredits: redeem_credits,
    });
    res.json(summary);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      error: error.message || 'Failed to calculate checkout summary',
      code: error.code,
      message: error.message,
    });
  }
});

/**
 * 5. GET /api/student/orders
 * Returns all orders for the authenticated student with items details.
 * Scoped strictly to WHERE o.user_id = req.user.user_id.
 */
router.get('/orders', async (req, res) => {
  const userId = req.user.user_id;

  try {
    const [orders] = await pool.query(
      `SELECT
        o.order_id,
        o.user_id,
        o.order_date,
        o.pickup_date,
        o.pickup_slot,
        o.total_amount,
        o.discount_amount,
        o.final_amount,
        o.payment_method,
        o.payment_status,
        o.status,
        COALESCE(SUM(oi.quantity), 0) AS total_quantity,
        COALESCE(o.final_amount, o.total_amount, SUM(oi.quantity * oi.unit_price), 0.00) AS display_amount,
        GROUP_CONCAT(CONCAT(m.name, ' x ', oi.quantity) SEPARATOR ', ') AS items_summary
       FROM orders o
       LEFT JOIN order_items oi ON o.order_id = oi.order_id
       LEFT JOIN menu_items m ON oi.menu_item_id = m.menu_item_id
       WHERE o.user_id = ?
       GROUP BY o.order_id, o.user_id, o.order_date, o.pickup_date, o.pickup_slot, o.total_amount, o.discount_amount, o.final_amount, o.payment_method, o.payment_status, o.status
       ORDER BY o.order_date DESC`,
      [userId]
    );

    const orderIds = orders.map((o) => o.order_id);
    let itemsByOrder = {};

    if (orderIds.length > 0) {
      const [items] = await pool.query(
        `SELECT
          oi.order_id,
          oi.menu_item_id,
          m.name,
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

    const formatted = orders.map((o) => ({
      ...o,
      pickup_token: formatToken(o.order_id),
      total_quantity: Number(o.total_quantity || 0),
      total_amount: Number(o.total_amount !== null ? o.total_amount : o.display_amount),
      discount_amount: Number(o.discount_amount || 0),
      final_amount: Number(o.final_amount !== null ? o.final_amount : o.display_amount),
      items: itemsByOrder[o.order_id] || [],
    }));

    res.json(formatted);
  } catch (error) {
    console.error('[API Error] GET /api/student/orders:', error);
    res.status(500).json({ error: 'Failed to retrieve orders', message: error.message });
  }
});

/**
 * 6. PATCH /api/student/orders/:id/cancel
 * Allows student to cancel an order only if it belongs to them and status is 'Pending'.
 * Atomically reverses any redeemed community meal credits back to the open pool.
 */
router.patch('/orders/:id/cancel', validateCsrf, async (req, res) => {
  const userId = req.user.user_id;
  const orderId = parseInt(req.params.id, 10);

  if (isNaN(orderId) || orderId <= 0) {
    return res.status(400).json({ error: 'Invalid order ID' });
  }

  try {
    const result = await withTransactionRetry(pool, async (conn) => {
      return await cancelStudentOrderWithCreditReversal(conn, {
        orderId,
        userId,
      });
    });

    res.json(result);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    if (statusCode >= 500) {
      console.error('[API Error] PATCH /api/student/orders/:id/cancel:', error);
    }
    res.status(statusCode).json({
      error: error.error || error.message || 'Failed to cancel order',
      message: error.message,
    });
  }
});

/**
 * 7. POST /api/student/sponsorships
 * Create a new Pay-It-Forward meal sponsorship with optional simulated payment.
 */
router.post('/sponsorships', validateCsrf, async (req, res) => {
  const {
    amount,
    total_amount,
    meals_funded,
    is_anonymous,
    message,
    payment_method,
    simulate_payment,
  } = req.body;

  const finalAmount = amount !== undefined ? amount : total_amount;

  try {
    const result = await withTransactionRetry(pool, async (conn) => {
      return await createSponsorship(conn, {
        sponsorUserId: req.user.user_id,
        donorName: req.user.full_name,
        donorEmail: req.user.email,
        amount: finalAmount,
        mealsFunded: meals_funded,
        isAnonymous: is_anonymous,
        message,
        paymentMethod: payment_method,
        simulatePayment: Boolean(simulate_payment),
      });
    });

    res.status(201).json({
      success: true,
      message: result.message || `Sponsorship #${result.sponsorship_id} created successfully!`,
      sponsorship: result,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    if (statusCode >= 500) {
      console.error('[API Error] POST /api/student/sponsorships:', error);
    }
    res.status(statusCode).json({
      error: error.message || 'Failed to create meal sponsorship',
      message: error.message,
    });
  }
});

/**
 * 8. POST /api/student/sponsorships/:id/pay
 * Initiate/submit payment for an existing sponsorship attempt.
 * SECURITY: Students CANNOT supply payment_status. The server verifies simulated gateway outcome.
 * Only verified successful payment atomically mints meal credits into the Open Community Pool.
 */
router.post('/sponsorships/:id/pay', validateCsrf, async (req, res) => {
  const sponsorshipId = parseInt(req.params.id, 10);

  if (isNaN(sponsorshipId) || sponsorshipId <= 0) {
    return res.status(400).json({ error: 'Invalid sponsorship ID' });
  }

  // SECURITY ENFORCEMENT: Reject any client-supplied payment_status parameter
  if (req.body && req.body.payment_status !== undefined) {
    return res.status(400).json({
      error: 'Forbidden Parameter',
      message: 'Direct specification of payment_status is forbidden. Payment verification is strictly controlled by the backend.',
    });
  }

  const { payment_method } = req.body || {};

  try {
    const result = await withTransactionRetry(pool, async (conn) => {
      return await executeStudentPaymentAttempt(conn, {
        sponsorshipId,
        studentUserId: req.user.user_id,
        paymentMethod: payment_method,
      });
    });

    res.json({
      success: result.success,
      message: result.message,
      ...result,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    if (statusCode >= 500) {
      console.error(`[API Error] POST /api/student/sponsorships/${sponsorshipId}/pay:`, error);
    }
    res.status(statusCode).json({
      error: error.message || 'Failed to process sponsorship payment',
      message: error.message,
    });
  }
});

/**
 * 9. GET /api/student/sponsorships/my
 * List all sponsorships contributed by the authenticated student.
 */
router.get('/sponsorships/my', async (req, res) => {
  try {
    const list = await getStudentSponsorships(pool, req.user.user_id);
    res.json(list);
  } catch (error) {
    console.error('[API Error] GET /api/student/sponsorships/my:', error);
    res.status(500).json({ error: 'Failed to fetch student sponsorships', message: error.message });
  }
});

/**
 * 10. GET /api/student/sponsorships/:id
 * Retrieve details of a specific sponsorship. Validates ownership.
 */
router.get('/sponsorships/:id', async (req, res) => {
  const sponsorshipId = parseInt(req.params.id, 10);
  if (isNaN(sponsorshipId) || sponsorshipId <= 0) {
    return res.status(400).json({ error: 'Invalid sponsorship ID' });
  }

  try {
    const sponsorship = await getSponsorshipById(pool, sponsorshipId, req.user.user_id, req.user.role);
    res.json(sponsorship);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    if (statusCode >= 500) {
      console.error(`[API Error] GET /api/student/sponsorships/${sponsorshipId}:`, error);
    }
    res.status(statusCode).json({
      error: error.message || 'Failed to fetch sponsorship details',
      message: error.message,
    });
  }
});

/**
 * 11. GET /api/student/credits/available
 * Retrieves the live available Open Community Credit Pool balance.
 * Accessible to any verified student.
 */
router.get('/credits/available', async (req, res) => {
  try {
    const poolData = await getAvailableCommunityCredits(pool);
    res.json(poolData);
  } catch (error) {
    console.error('[API Error] GET /api/student/credits/available:', error);
    res.status(500).json({ error: 'Failed to fetch available community credits', message: error.message });
  }
});

/**
 * 12. GET /api/student/credits/history
 * Transparent append-only community credit ledger event history.
 */
router.get('/credits/history', async (req, res) => {
  try {
    const history = await getCreditHistory(pool, req.query);
    res.json(history);
  } catch (error) {
    console.error('[API Error] GET /api/student/credits/history:', error);
    res.status(500).json({ error: 'Failed to fetch credit ledger history', message: error.message });
  }
});

export default router;
