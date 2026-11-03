/**
 * PlateWise Student Checkout & Meal Credit Redemption Service
 * Implements Phase 3C.3: Optional Community Meal Credit Redemption,
 * Deterministic Price Recalculation, Lock-Ordered Allocation,
 * Auditable Payments & Idempotent Order Cancellations.
 */

import crypto from 'crypto';
import {
  DEFAULT_MEAL_UNIT_PRICE,
  VALID_PAYMENT_METHODS,
  isSimulatedPaymentAllowed,
} from '../config/sponsorshipConfig.js';
import {
  SLOT_CONFIG,
  isValidCalendarDate,
  isDateInPast,
  isSlotInPast,
  getCurrentKolkataDate,
} from '../config/slotConfig.js';
import { formatToken } from '../utils/pickupToken.js';
import { getAvailableCommunityCredits } from './sponsorshipCreditService.js';
import { calculateBatchStock } from './donationService.js';

/**
 * Calculates a verified server-authoritative checkout summary.
 * Client-submitted discounts or subtotal calculations are strictly disregarded.
 *
 * @param {import('mysql2/promise').Connection|import('mysql2/promise').Pool} connOrPool
 * @param {Object} params
 * @param {number} params.userId
 * @param {Array<{menu_item_id: number, quantity: number}>} params.items
 * @param {number} [params.redeemCredits=0]
 * @returns {Promise<Object>}
 */
export async function calculateCheckoutSummary(connOrPool, {
  userId,
  items,
  redeemCredits = 0,
}) {
  if (!Array.isArray(items) || items.length === 0) {
    const error = new Error('Order must include at least one valid item');
    error.statusCode = 400;
    throw error;
  }

  // Validate item format
  for (const item of items) {
    const itemId = parseInt(item.menu_item_id, 10);
    const qty = parseInt(item.quantity, 10);
    if (isNaN(itemId) || itemId <= 0 || isNaN(qty) || qty <= 0) {
      const error = new Error('Invalid item id or quantity format');
      error.statusCode = 400;
      throw error;
    }
  }

  const itemIds = items.map((i) => parseInt(i.menu_item_id, 10));
  const [dbItems] = await connOrPool.query(
    `SELECT menu_item_id, name, price, is_available FROM menu_items WHERE menu_item_id IN (?)`,
    [itemIds]
  );

  if (dbItems.length !== itemIds.length) {
    const error = new Error('One or more selected dishes do not exist in the database');
    error.statusCode = 400;
    throw error;
  }

  const unavailableItems = dbItems.filter((d) => !d.is_available);
  if (unavailableItems.length > 0) {
    const unavailableNames = unavailableItems.map((d) => d.name).join(', ');
    const error = new Error(`The following dish(es) are currently sold out: ${unavailableNames}`);
    error.statusCode = 400;
    error.code = 'DISH_UNAVAILABLE';
    error.unavailable_items = unavailableItems.map((d) => d.menu_item_id);
    throw error;
  }

  const priceMap = new Map();
  dbItems.forEach((d) => priceMap.set(d.menu_item_id, Number(d.price)));

  let subtotal = 0.0;
  for (const item of items) {
    const catalogPrice = priceMap.get(item.menu_item_id);
    const unitPrice = item.is_surplus
      ? Math.round(catalogPrice * 0.60 * 100) / 100
      : catalogPrice;
    subtotal += unitPrice * parseInt(item.quantity, 10);
  }
  subtotal = parseFloat(subtotal.toFixed(2));

  // Canonical subsidized meal unit price (from sponsorshipConfig.js)
  const mealUnitPrice = DEFAULT_MEAL_UNIT_PRICE;
  const maxEligibleCredits = Math.floor(subtotal / mealUnitPrice);

  // Fetch available community meal credit pool
  const creditPool = await getAvailableCommunityCredits(connOrPool);
  const availablePoolCredits = creditPool.meals_available;
  const availablePoolBalance = creditPool.available_pool_balance;

  // Validate requested credits
  let requestedCredits = 0;
  if (redeemCredits !== undefined && redeemCredits !== null) {
    const parsed = parseInt(redeemCredits, 10);
    if (isNaN(parsed) || parsed < 0) {
      const error = new Error('Invalid credit redemption quantity. Must be a non-negative integer.');
      error.statusCode = 400;
      throw error;
    }
    requestedCredits = parsed;
  }

  if (requestedCredits > maxEligibleCredits) {
    const error = new Error(
      `Cannot redeem ${requestedCredits} credits. Order subtotal ₹${subtotal.toFixed(2)} can cover at most ${maxEligibleCredits} meal credit(s) (₹${(maxEligibleCredits * mealUnitPrice).toFixed(2)}).`
    );
    error.statusCode = 400;
    error.code = 'EXCEEDS_ELIGIBLE_ORDER_VALUE';
    throw error;
  }

  if (requestedCredits > availablePoolCredits) {
    const error = new Error(
      `Requested ${requestedCredits} credit(s), but only ${availablePoolCredits} community meal credit(s) are currently available in the open pool.`
    );
    error.statusCode = 400;
    error.code = 'INSUFFICIENT_COMMUNITY_CREDITS';
    throw error;
  }

  const creditDiscount = parseFloat((requestedCredits * mealUnitPrice).toFixed(2));
  const remainingPayable = parseFloat((subtotal - creditDiscount).toFixed(2));
  const maxRedeemableCredits = Math.min(maxEligibleCredits, availablePoolCredits);

  return {
    subtotal,
    meal_unit_price: mealUnitPrice,
    max_eligible_credits: maxEligibleCredits,
    available_pool_credits: availablePoolCredits,
    available_pool_balance: availablePoolBalance,
    redeemed_credits: requestedCredits,
    credit_discount: creditDiscount,
    remaining_payable: remainingPayable,
    is_fully_credit_funded: remainingPayable === 0,
    max_redeemable_credits: maxRedeemableCredits,
  };
}

/**
 * Executes atomic student checkout with concurrency protection, pickup slot capacity validation,
 * optional meal credit redemption from the Open Community Pool, and payment ledger entry.
 *
 * @param {import('mysql2/promise').Connection} conn
 * @param {Object} params
 * @param {number} params.userId
 * @param {Array<{menu_item_id: number, quantity: number}>} params.items
 * @param {string} [params.pickupDate]
 * @param {string} [params.pickupSlot]
 * @param {number} [params.redeemCredits=0]
 * @param {string} [params.paymentMethod='upi_simulated']
 * @param {string} [params.idempotencyKey]
 * @returns {Promise<Object>}
 */
export async function processStudentCheckout(conn, {
  userId,
  items,
  pickupDate,
  pickupSlot,
  redeemCredits = 0,
  paymentMethod = 'upi_simulated',
  idempotencyKey,
}) {
  // 1. Basic validation
  if (!Array.isArray(items) || items.length === 0) {
    const error = new Error('Order must include at least one valid item');
    error.statusCode = 400;
    throw error;
  }

  for (const item of items) {
    const itemId = parseInt(item.menu_item_id, 10);
    const qty = parseInt(item.quantity, 10);
    if (isNaN(itemId) || itemId <= 0 || isNaN(qty) || qty <= 0) {
      const error = new Error('Invalid item id or quantity format');
      error.statusCode = 400;
      throw error;
    }
  }

  const targetDate = pickupDate || getCurrentKolkataDate();
  const targetSlot = pickupSlot || '12:30 PM - 01:00 PM';

  if (!isValidCalendarDate(targetDate)) {
    const error = new Error('Please provide a valid calendar date in YYYY-MM-DD format.');
    error.statusCode = 400;
    error.error = 'Invalid Date';
    throw error;
  }

  if (isDateInPast(targetDate)) {
    const error = new Error('Selected pickup date is in the past. Please select today or a future date.');
    error.statusCode = 400;
    error.error = 'Past Date';
    throw error;
  }

  // ---------------------------------------------------------------------------
  // GLOBAL LOCK ORDERING:
  // Step A: Lock menu items (ordered by menu_item_id ASC)
  // Step B: Lock target pickup slot
  // Step C: Lock meal credit lots (if redeemCredits > 0, ordered by expires_at, credit_id ASC)
  // ---------------------------------------------------------------------------

  // Step A: Lock menu items
  const itemIds = [...new Set(items.map((i) => parseInt(i.menu_item_id, 10)))].sort((a, b) => a - b);
  const [dbItems] = await conn.query(
    `SELECT menu_item_id, name, price, is_available FROM menu_items WHERE menu_item_id IN (?) ORDER BY menu_item_id ASC FOR UPDATE`,
    [itemIds]
  );

  if (dbItems.length !== itemIds.length) {
    const error = new Error('One or more selected dishes do not exist in the database');
    error.statusCode = 400;
    throw error;
  }

  const unavailableItems = dbItems.filter((d) => !d.is_available);
  if (unavailableItems.length > 0) {
    const unavailableNames = unavailableItems.map((d) => d.name).join(', ');
    const error = new Error(`The following dish(es) are currently sold out or unavailable: ${unavailableNames}. Please update your order.`);
    error.statusCode = 400;
    error.error = 'Dish Unavailable';
    error.unavailable_items = unavailableItems.map((d) => d.menu_item_id);
    throw error;
  }

  const priceMap = new Map();
  dbItems.forEach((d) => priceMap.set(d.menu_item_id, Number(d.price)));

  let subtotal = 0.0;
  for (const item of items) {
    const catalogPrice = priceMap.get(item.menu_item_id);
    const unitPrice = item.is_surplus
      ? Math.round(catalogPrice * 0.60 * 100) / 100
      : catalogPrice;
    subtotal += unitPrice * parseInt(item.quantity, 10);
  }
  subtotal = parseFloat(subtotal.toFixed(2));

  // Step B: Lock target pickup slot
  const [slotRows] = await conn.query(
    `SELECT slot_id, slot, start_time, end_time, max_capacity, is_active
     FROM pickup_slots
     WHERE slot = ? AND is_active = TRUE
     FOR UPDATE`,
    [targetSlot]
  );

  if (slotRows.length === 0) {
    const error = new Error(`Pickup slot '${targetSlot}' is not recognized or is inactive.`);
    error.statusCode = 400;
    error.error = 'Invalid Slot';
    throw error;
  }

  const slotRow = slotRows[0];
  if (isSlotInPast(slotRow.start_time, targetDate)) {
    const error = new Error(`Pickup slot '${targetSlot}' has already started or passed for the selected date.`);
    error.statusCode = 400;
    error.error = 'Past Slot';
    throw error;
  }

  const [overrideRows] = await conn.query(
    `SELECT max_capacity, is_closed
     FROM pickup_slot_overrides
     WHERE slot_id = ? AND pickup_date = ?`,
    [slotRow.slot_id, targetDate]
  );

  if (overrideRows.length > 0 && overrideRows[0].is_closed) {
    const error = new Error(`Pickup slot '${targetSlot}' is closed for ${targetDate}.`);
    error.statusCode = 409;
    error.code = 'SLOT_FULL';
    error.error = 'Slot Closed';
    throw error;
  }

  const maxCapacity = overrideRows.length > 0
    ? Number(overrideRows[0].max_capacity)
    : Number(slotRow.max_capacity || SLOT_CONFIG.DEFAULT_SLOT_CAPACITY);

  const [countRows] = await conn.query(
    `SELECT COUNT(*) AS booked
     FROM orders
     WHERE pickup_date = ?
       AND pickup_slot = ?
       AND LOWER(status) != 'cancelled'`,
    [targetDate, targetSlot]
  );

  const currentBooked = Number(countRows[0]?.booked || 0);
  if (currentBooked >= maxCapacity) {
    const error = new Error(`Pickup slot '${targetSlot}' is fully booked. Please select another slot or date.`);
    error.statusCode = 409;
    error.code = 'SLOT_FULL';
    error.error = 'Slot Capacity Exceeded';
    error.slot = targetSlot;
    error.date = targetDate;
    error.max_capacity = maxCapacity;
    error.booked_count = currentBooked;
    throw error;
  }

  // Step C: Validate and lock community meal credit lots (if requested)
  let parsedRedeemCredits = 0;
  if (redeemCredits !== undefined && redeemCredits !== null) {
    const parsed = parseInt(redeemCredits, 10);
    if (isNaN(parsed) || parsed < 0) {
      const error = new Error('Invalid credit redemption quantity. Must be a non-negative integer.');
      error.statusCode = 400;
      throw error;
    }
    parsedRedeemCredits = parsed;
  }

  const mealUnitPrice = DEFAULT_MEAL_UNIT_PRICE;
  const maxEligibleCredits = Math.floor(subtotal / mealUnitPrice);

  if (parsedRedeemCredits > maxEligibleCredits) {
    const error = new Error(
      `Cannot redeem ${parsedRedeemCredits} credits. Order subtotal ₹${subtotal.toFixed(2)} can cover at most ${maxEligibleCredits} meal credit(s) (₹${(maxEligibleCredits * mealUnitPrice).toFixed(2)}).`
    );
    error.statusCode = 400;
    error.code = 'EXCEEDS_ELIGIBLE_ORDER_VALUE';
    throw error;
  }

  let lockedCreditLots = [];
  const requiredCreditDiscount = parseFloat((parsedRedeemCredits * mealUnitPrice).toFixed(2));

  if (parsedRedeemCredits > 0) {
    // Lock all active unexpired community credit lots (FIFO by earliest expiration date, then credit_id)
    const [lots] = await conn.query(
      `SELECT credit_id, initial_value, balance, status, expires_at
       FROM meal_credits
       WHERE beneficiary_user_id IS NULL
         AND status = 'Active'
         AND balance > 0
         AND expires_at > NOW()
       ORDER BY expires_at ASC, credit_id ASC
       FOR UPDATE`
    );

    lockedCreditLots = lots.map((l) => ({
      ...l,
      balance: parseFloat(Number(l.balance).toFixed(2)),
      initial_value: parseFloat(Number(l.initial_value).toFixed(2)),
    }));

    const totalAvailablePoolBalance = lockedCreditLots.reduce((acc, l) => acc + l.balance, 0);
    const availablePoolMeals = Math.floor(totalAvailablePoolBalance / mealUnitPrice);

    if (parsedRedeemCredits > availablePoolMeals || totalAvailablePoolBalance < requiredCreditDiscount) {
      const error = new Error(
        `Insufficient available community meal credits. Requested ${parsedRedeemCredits} credit(s), but only ${availablePoolMeals} credit(s) remain in the open pool.`
      );
      error.statusCode = 409;
      error.code = 'INSUFFICIENT_COMMUNITY_CREDITS';
      throw error;
    }
  }

  // ---------------------------------------------------------------------------
  // Step D: Calculate final payable amounts
  // ---------------------------------------------------------------------------
  const finalPayable = parseFloat((subtotal - requiredCreditDiscount).toFixed(2));
  const isZeroPayable = finalPayable === 0.0;

  // Determine order status and payment method
  const chosenMethod = isZeroPayable
    ? 'credit_funded'
    : (VALID_PAYMENT_METHODS.includes(paymentMethod) ? paymentMethod : 'upi_simulated');

  // Verify simulated payment safeguard
  const isDeclinedTestToken =
    paymentMethod === 'declined_simulated' ||
    paymentMethod === 'failed_simulated' ||
    paymentMethod === 'test_declined';

  if (!isZeroPayable && chosenMethod.includes('simulated') && !isDeclinedTestToken && !isSimulatedPaymentAllowed()) {
    const error = new Error('Simulated payments are strictly disabled in production. An integrated payment gateway is required.');
    error.statusCode = 403;
    throw error;
  }

  // If a test decline token is passed, trigger immediate simulated gateway rejection
  // The transaction rolls back cleanly so zero credits are deducted and no order is placed.
  if (isDeclinedTestToken) {
    const error = new Error('Payment declined by simulated provider. Order creation aborted.');
    error.statusCode = 402;
    error.code = 'PAYMENT_DECLINED';
    throw error;
  }

  const orderPaymentStatus = isZeroPayable
    ? 'Paid'
    : (chosenMethod === 'cash_on_pickup' ? 'Pending' : 'Paid');

  // ---------------------------------------------------------------------------
  // Step E: Insert orders record
  // ---------------------------------------------------------------------------
  const [orderInsert] = await conn.query(
    `INSERT INTO orders (
      user_id, pickup_date, pickup_slot, total_amount, discount_amount,
      final_amount, payment_status, payment_method, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Pending')`,
    [
      userId,
      targetDate,
      targetSlot,
      subtotal,
      requiredCreditDiscount,
      finalPayable,
      orderPaymentStatus,
      chosenMethod,
    ]
  );

  const orderId = orderInsert.insertId;

  // ---------------------------------------------------------------------------
  // Step F: Insert order items & link to production batches
  // ---------------------------------------------------------------------------
  for (const item of items) {
    const catalogPrice = priceMap.get(item.menu_item_id);
    const isSurplus = Boolean(item.is_surplus);
    const unitPrice = isSurplus
      ? Math.round(catalogPrice * 0.60 * 100) / 100
      : catalogPrice;
    const origPrice = isSurplus ? catalogPrice : null;

    let batchId = item.food_batch_id ? parseInt(item.food_batch_id, 10) : null;
    if (!batchId) {
      // Find active production batch for this menu item on target date
      const [activeBatches] = await conn.query(
        `SELECT food_batch_id FROM food_batches
         WHERE menu_item_id = ? AND batch_date = ? AND status IN ('Active', 'Surplus')
         ORDER BY food_batch_id DESC LIMIT 1 FOR UPDATE`,
        [item.menu_item_id, targetDate]
      );
      if (activeBatches.length > 0) {
        batchId = activeBatches[0].food_batch_id;
      }
    }

    if (batchId) {
      // Lock batch row and verify real-time available stock
      const [batchRows] = await conn.query(
        `SELECT food_batch_id, menu_item_id FROM food_batches WHERE food_batch_id = ? FOR UPDATE`,
        [batchId]
      );
      if (batchRows.length === 0) {
        const error = new Error(`Associated food batch #${batchId} not found.`);
        error.statusCode = 404;
        throw error;
      }

      const stock = await calculateBatchStock(conn, batchId);
      if (stock && stock.available_stock < item.quantity) {
        const [mItem] = await conn.query(
          `SELECT name FROM menu_items WHERE menu_item_id = ?`,
          [item.menu_item_id]
        );
        const itemName = mItem[0]?.name || `Item #${item.menu_item_id}`;
        const error = new Error(
          `Insufficient stock for "${itemName}". Only ${stock.available_stock} portions available, but ${item.quantity} requested.`
        );
        error.statusCode = 409;
        error.code = 'INSUFFICIENT_STOCK';
        throw error;
      }
    }

    await conn.query(
      `INSERT INTO order_items (order_id, menu_item_id, food_batch_id, quantity, unit_price, original_price, is_surplus)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [orderId, item.menu_item_id, batchId, item.quantity, unitPrice, origPrice, isSurplus ? 1 : 0]
    );

    if (batchId) {
      // Update leftover_qty cache to match latest available stock without double-counting sold_qty
      const stockAfter = await calculateBatchStock(conn, batchId);
      const remainingAvail = stockAfter ? stockAfter.available_stock : 0;
      await conn.query(
        `UPDATE food_batches
         SET leftover_qty = ?
         WHERE food_batch_id = ?`,
        [remainingAvail, batchId]
      );
    }
  }

  // ---------------------------------------------------------------------------
  // Step G: Deduct community credits & record immutable ledger entries
  // ---------------------------------------------------------------------------
  const redemptionsCreated = [];
  if (parsedRedeemCredits > 0) {
    let remainingToDeduct = requiredCreditDiscount;

    for (const lot of lockedCreditLots) {
      if (remainingToDeduct <= 0) break;

      const deductAmount = parseFloat(Math.min(lot.balance, remainingToDeduct).toFixed(2));
      const newLotBalance = parseFloat((lot.balance - deductAmount).toFixed(2));
      const newLotStatus = newLotBalance === 0 ? 'Depleted' : 'Active';

      // Update credit lot balance
      await conn.query(
        `UPDATE meal_credits
         SET balance = ?, status = ?, updated_at = NOW()
         WHERE credit_id = ?`,
        [newLotBalance, newLotStatus, lot.credit_id]
      );

      // Record credit_redemptions junction entry
      const [redemptionRes] = await conn.query(
        `INSERT INTO credit_redemptions (
          order_id, credit_id, amount_redeemed, status, redeemed_at
        ) VALUES (?, ?, ?, 'Active', NOW())`,
        [orderId, lot.credit_id, deductAmount]
      );

      // Record immutable REDEMPTION entry in credit_ledger_entries
      const redemptionKey = `REDEMPTION-ORD-${orderId}-CRED-${lot.credit_id}`;
      await conn.query(
        `INSERT INTO credit_ledger_entries (
          credit_id, order_id, entry_type, amount, balance_before,
          balance_after, performed_by, idempotency_key, reason, created_at
        ) VALUES (?, ?, 'REDEMPTION', ?, ?, ?, ?, ?, ?, NOW())`,
        [
          lot.credit_id,
          orderId,
          deductAmount,
          lot.balance,
          newLotBalance,
          userId,
          redemptionKey,
          `Redeemed community meal credit for Order #${orderId} (₹${deductAmount.toFixed(2)})`,
        ]
      );

      redemptionsCreated.push({
        redemption_id: redemptionRes.insertId,
        credit_id: lot.credit_id,
        amount_redeemed: deductAmount,
      });

      remainingToDeduct = parseFloat((remainingToDeduct - deductAmount).toFixed(2));
    }
  }

  // ---------------------------------------------------------------------------
  // Step H: Payment record handling
  // If order is 100% funded by credits (finalPayable === 0), do not create external payment
  // If finalPayable > 0, insert non-polymorphic payments entry
  // ---------------------------------------------------------------------------
  let paymentRecord = null;
  if (!isZeroPayable && finalPayable > 0) {
    const transactionRef = 'TXN-ORD-' + orderId + '-' + crypto.randomBytes(4).toString('hex').toUpperCase();
    const paymentStatus = chosenMethod === 'cash_on_pickup' ? 'Pending' : 'Completed';

    const [paymentRes] = await conn.query(
      `INSERT INTO payments (
        order_id, sponsorship_id, user_id, amount, payment_method,
        status, attempt_number, transaction_reference, gateway_provider,
        gateway_response_payload, created_at, updated_at
      ) VALUES (?, NULL, ?, ?, ?, ?, 1, ?, 'internal_simulated', ?, NOW(), NOW())`,
      [
        orderId,
        userId,
        finalPayable,
        chosenMethod,
        paymentStatus,
        transactionRef,
        JSON.stringify({
          order_id: orderId,
          total_subtotal: subtotal,
          credit_discount: requiredCreditDiscount,
          remaining_payable: finalPayable,
          simulated: true,
        }),
      ]
    );

    paymentRecord = {
      payment_id: paymentRes.insertId,
      amount: finalPayable,
      payment_method: chosenMethod,
      status: paymentStatus,
      transaction_reference: transactionRef,
    };
  }

  const token = formatToken(orderId);

  return {
    message: 'Order created successfully',
    order_id: orderId,
    pickup_token: token,
    order: {
      order_id: orderId,
      user_id: userId,
      pickup_token: token,
      pickup_date: targetDate,
      pickup_slot: targetSlot,
      total_amount: subtotal,
      discount_amount: requiredCreditDiscount,
      final_amount: finalPayable,
      redeemed_credits: parsedRedeemCredits,
      payment_status: orderPaymentStatus,
      payment_method: chosenMethod,
      status: 'Pending',
      payment: paymentRecord,
      redemptions: redemptionsCreated,
    },
  };
}

/**
 * Idempotent order cancellation with automatic community credit restoration.
 * If the order was funded with community meal credits, restores the unspent balances
 * to the original credit lots and logs immutable REVERSAL ledger entries.
 *
 * @param {import('mysql2/promise').Connection} conn
 * @param {Object} params
 * @param {number} params.orderId
 * @param {number} params.userId
 * @returns {Promise<Object>}
 */
export async function cancelStudentOrderWithCreditReversal(conn, {
  orderId,
  userId,
}) {
  // Lock target order
  const [orderRows] = await conn.query(
    `SELECT * FROM orders WHERE order_id = ? FOR UPDATE`,
    [orderId]
  );

  if (orderRows.length === 0) {
    const error = new Error('Order not found');
    error.statusCode = 404;
    throw error;
  }

  const order = orderRows[0];

  // Ownership check
  if (order.user_id !== userId) {
    const error = new Error('Access denied: You cannot cancel an order belonging to another student.');
    error.statusCode = 403;
    error.error = 'Forbidden';
    throw error;
  }

  // State check: only Pending orders can be cancelled
  if (order.status?.toLowerCase() !== 'pending') {
    const error = new Error(`Orders in "${order.status}" status cannot be cancelled. Only Pending orders may be cancelled.`);
    error.statusCode = 409;
    error.error = 'Order cannot be cancelled';
    throw error;
  }

  // Transition order status to Cancelled
  await conn.query(
    `UPDATE orders SET status = 'Cancelled' WHERE order_id = ?`,
    [orderId]
  );

  // Sync food batch leftover_qty cache for affected items
  const [affectedBatches] = await conn.query(
    `SELECT DISTINCT food_batch_id FROM order_items WHERE order_id = ? AND food_batch_id IS NOT NULL`,
    [orderId]
  );
  for (const b of affectedBatches) {
    const stock = await calculateBatchStock(conn, b.food_batch_id);
    if (stock) {
      await conn.query(
        `UPDATE food_batches SET leftover_qty = ? WHERE food_batch_id = ?`,
        [stock.available_stock, b.food_batch_id]
      );
    }
  }

  // ---------------------------------------------------------------------------
  // Restore redeemed meal credits (if any)
  // ---------------------------------------------------------------------------
  const [activeRedemptions] = await conn.query(
    `SELECT redemption_id, credit_id, amount_redeemed, status
     FROM credit_redemptions
     WHERE order_id = ? AND status = 'Active'
     FOR UPDATE`,
    [orderId]
  );

  let totalCreditsRestored = 0.0;

  for (const redemption of activeRedemptions) {
    // Check if reversal ledger entry already exists for idempotency
    const reversalKey = `REVERSAL-ORD-${orderId}-CRED-${redemption.credit_id}`;
    const [existingReversal] = await conn.query(
      `SELECT entry_id FROM credit_ledger_entries WHERE idempotency_key = ?`,
      [reversalKey]
    );

    if (existingReversal.length > 0) {
      // Already reversed, avoid duplicate ledger writes
      continue;
    }

    // Lock target credit lot
    const [creditRows] = await conn.query(
      `SELECT credit_id, initial_value, balance, status
       FROM meal_credits
       WHERE credit_id = ?
       FOR UPDATE`,
      [redemption.credit_id]
    );

    if (creditRows.length > 0) {
      const credit = creditRows[0];
      const currentBalance = parseFloat(Number(credit.balance).toFixed(2));
      const initialValue = parseFloat(Number(credit.initial_value).toFixed(2));
      const restoreAmount = parseFloat(Number(redemption.amount_redeemed).toFixed(2));

      // Ensure balance never exceeds initial_value (chk_credit_balance constraint)
      const newBalance = parseFloat(Math.min(initialValue, currentBalance + restoreAmount).toFixed(2));
      const newStatus = 'Active';

      await conn.query(
        `UPDATE meal_credits
         SET balance = ?, status = ?, updated_at = NOW()
         WHERE credit_id = ?`,
        [newBalance, newStatus, credit.credit_id]
      );

      // Mark redemption as Reversed
      await conn.query(
        `UPDATE credit_redemptions
         SET status = 'Reversed'
         WHERE redemption_id = ?`,
        [redemption.redemption_id]
      );

      // Insert immutable REVERSAL entry in credit_ledger_entries
      await conn.query(
        `INSERT INTO credit_ledger_entries (
          credit_id, order_id, entry_type, amount, balance_before,
          balance_after, performed_by, idempotency_key, reason, created_at
        ) VALUES (?, ?, 'REVERSAL', ?, ?, ?, ?, ?, ?, NOW())`,
        [
          credit.credit_id,
          orderId,
          restoreAmount,
          currentBalance,
          newBalance,
          userId,
          reversalKey,
          `Order #${orderId} cancelled by student - community meal credit restored to open pool`,
        ]
      );

      totalCreditsRestored += restoreAmount;
    }
  }

  // ---------------------------------------------------------------------------
  // Handle payment refund record (if external payment existed)
  // ---------------------------------------------------------------------------
  const [payments] = await conn.query(
    `SELECT payment_id, amount, payment_method, status
     FROM payments
     WHERE order_id = ?
     ORDER BY payment_id DESC LIMIT 1
     FOR UPDATE`,
    [orderId]
  );

  if (payments.length > 0) {
    const payment = payments[0];
    if (payment.status === 'Completed') {
      const refundTxnRef = 'REFUND-ORD-' + orderId + '-' + crypto.randomBytes(4).toString('hex').toUpperCase();
      await conn.query(
        `INSERT INTO payments (
          order_id, sponsorship_id, user_id, amount, payment_method,
          status, attempt_number, transaction_reference, gateway_provider,
          gateway_response_payload, created_at, updated_at
        ) VALUES (?, NULL, ?, ?, ?, 'Refunded', 2, ?, 'internal_simulated', ?, NOW(), NOW())`,
        [
          orderId,
          userId,
          payment.amount,
          payment.payment_method,
          refundTxnRef,
          JSON.stringify({
            order_id: orderId,
            refund_reason: 'Order cancelled by student',
            original_payment_id: payment.payment_id,
          }),
        ]
      );
      await conn.query(`UPDATE orders SET payment_status = 'Refunded' WHERE order_id = ?`, [orderId]);
    } else if (payment.status === 'Pending') {
      await conn.query(`UPDATE payments SET status = 'Failed', updated_at = NOW() WHERE payment_id = ?`, [payment.payment_id]);
      await conn.query(`UPDATE orders SET payment_status = 'Failed' WHERE order_id = ?`, [orderId]);
    }
  }

  return {
    success: true,
    message: 'Order cancelled successfully',
    order_id: orderId,
    status: 'Cancelled',
    credits_restored: totalCreditsRestored,
  };
}
