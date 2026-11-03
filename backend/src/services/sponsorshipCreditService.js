/**
 * PlateWise Pay-It-Forward Sponsorship and Meal Credit Service
 * Implements Phase 3C.2 & 3C.2.1 Community Meal Sponsorship, Payment Lifecycle,
 * Open Community Credit Pool (beneficiary_user_id IS NULL), Append-Only Event Ledger,
 * and Payment Security Hardening.
 */

import crypto from 'crypto';
import {
  DEFAULT_MEAL_UNIT_PRICE,
  MAX_SPONSORSHIP_MESSAGE_LENGTH,
  DEFAULT_CREDIT_VALIDITY_DAYS,
  VALID_PAYMENT_METHODS,
  isSimulatedPaymentAllowed,
} from '../config/sponsorshipConfig.js';

/**
 * Creates a new meal sponsorship record and associated pending payment attempt.
 *
 * @param {import('mysql2/promise').Connection} conn
 * @param {Object} params
 * @param {number} params.sponsorUserId
 * @param {string} params.donorName
 * @param {string} params.donorEmail
 * @param {number|string} params.amount
 * @param {number} [params.mealsFunded]
 * @param {boolean} [params.isAnonymous=false]
 * @param {string} [params.message]
 * @param {string} [params.paymentMethod='upi_simulated']
 * @param {boolean} [params.simulatePayment=false]
 * @returns {Promise<Object>}
 */
export async function createSponsorship(conn, {
  sponsorUserId,
  donorName,
  donorEmail,
  amount,
  mealsFunded,
  isAnonymous = false,
  message,
  paymentMethod = 'upi_simulated',
  simulatePayment = false,
}) {
  const parsedAmount = parseFloat(parseFloat(amount).toFixed(2));
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    const error = new Error('Sponsorship amount must be a positive decimal value.');
    error.statusCode = 400;
    throw error;
  }

  // Subsidized canonical meal unit price
  const mealUnitPrice = DEFAULT_MEAL_UNIT_PRICE;
  let parsedMeals = mealsFunded !== undefined && mealsFunded !== null ? parseInt(mealsFunded, 10) : null;

  if (parsedMeals !== null) {
    if (isNaN(parsedMeals) || parsedMeals <= 0) {
      const error = new Error('Meals funded must be a positive integer.');
      error.statusCode = 400;
      throw error;
    }
  } else {
    parsedMeals = Math.max(1, Math.floor(parsedAmount / mealUnitPrice));
  }

  const method = VALID_PAYMENT_METHODS.includes(paymentMethod) ? paymentMethod : 'upi_simulated';
  const cleanMessage = message ? String(message).trim().slice(0, MAX_SPONSORSHIP_MESSAGE_LENGTH) : null;
  const anonFlag = Boolean(isAnonymous) ? 1 : 0;

  // 1. Insert meal_sponsorships record in Pending status
  const [sponsorshipRes] = await conn.query(
    `INSERT INTO meal_sponsorships (
      sponsor_user_id, donor_name, donor_email, total_amount, meal_unit_price,
      meals_funded, payment_status, is_anonymous, message, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, 'Pending', ?, ?, NOW())`,
    [
      sponsorUserId || null,
      donorName || 'PlateWise Supporter',
      donorEmail || null,
      parsedAmount,
      mealUnitPrice,
      parsedMeals,
      anonFlag,
      cleanMessage,
    ]
  );

  const sponsorshipId = sponsorshipRes.insertId;

  // 2. Insert initial pending payment record
  const transactionRef = 'TXN-SPON-' + sponsorshipId + '-' + crypto.randomBytes(4).toString('hex').toUpperCase();
  const [paymentRes] = await conn.query(
    `INSERT INTO payments (
      order_id, sponsorship_id, user_id, amount, payment_method,
      status, attempt_number, transaction_reference, gateway_provider,
      gateway_response_payload, created_at, updated_at
    ) VALUES (NULL, ?, ?, ?, ?, 'Pending', 1, ?, 'internal_simulated', ?, NOW(), NOW())`,
    [
      sponsorshipId,
      sponsorUserId || null,
      parsedAmount,
      method,
      transactionRef,
      JSON.stringify({ initiated_at: new Date().toISOString(), simulated: true }),
    ]
  );

  const paymentId = paymentRes.insertId;

  // 3. If immediate simulated payment is requested, process it via trusted simulated verification
  if (simulatePayment) {
    return await executeStudentPaymentAttempt(conn, {
      sponsorshipId,
      studentUserId: sponsorUserId,
      paymentMethod: method,
    });
  }

  return {
    sponsorship_id: sponsorshipId,
    sponsor_user_id: sponsorUserId,
    donor_name: anonFlag ? 'Anonymous Sponsor' : donorName,
    total_amount: parsedAmount,
    meal_unit_price: mealUnitPrice,
    meals_funded: parsedMeals,
    payment_status: 'Pending',
    is_anonymous: Boolean(anonFlag),
    message: cleanMessage,
    payment: {
      payment_id: paymentId,
      amount: parsedAmount,
      payment_method: method,
      status: 'Pending',
      transaction_reference: transactionRef,
    },
    credits_generated: false,
  };
}

/**
 * Trusted Payment Processing Boundary for Student-Initiated Sponsorship Payments.
 * Ordinary students CANNOT dictate payment_status. The server verifies the simulated gateway result.
 * Only verified successful payments mint credits into the Open Community Pool.
 *
 * @param {import('mysql2/promise').Connection} conn
 * @param {Object} params
 * @param {number} params.sponsorshipId
 * @param {number} params.studentUserId
 * @param {string} [params.paymentMethod]
 * @returns {Promise<Object>}
 */
export async function executeStudentPaymentAttempt(conn, {
  sponsorshipId,
  studentUserId,
  paymentMethod = 'upi_simulated',
}) {
  // Lock the sponsorship row
  const [sponsorships] = await conn.query(
    `SELECT * FROM meal_sponsorships WHERE sponsorship_id = ? FOR UPDATE`,
    [sponsorshipId]
  );

  if (sponsorships.length === 0) {
    const error = new Error(`Sponsorship #${sponsorshipId} not found.`);
    error.statusCode = 404;
    throw error;
  }

  const sponsorship = sponsorships[0];

  // Ownership verification: student must be the creator
  if (sponsorship.sponsor_user_id !== studentUserId) {
    const error = new Error('Access denied: You cannot initiate payment for a sponsorship belonging to another student.');
    error.statusCode = 403;
    throw error;
  }

  // Idempotency: if already paid, return existing state
  if (sponsorship.payment_status === 'Paid') {
    const [existingCredits] = await conn.query(
      `SELECT credit_id, balance, initial_value, status, expires_at FROM meal_credits WHERE sponsorship_id = ?`,
      [sponsorshipId]
    );
    const [existingPayments] = await conn.query(
      `SELECT payment_id, status, transaction_reference FROM payments WHERE sponsorship_id = ? ORDER BY payment_id DESC LIMIT 1`,
      [sponsorshipId]
    );

    return {
      success: true,
      message: 'Payment has already been verified and processed (idempotent response).',
      sponsorship_id: sponsorshipId,
      payment_status: 'Paid',
      total_amount: Number(sponsorship.total_amount),
      already_processed: true,
      payment: existingPayments[0] || null,
      credit: existingCredits[0] || null,
    };
  }

  // SERVER-SIDE SIMULATED GATEWAY EVALUATION
  // In production, this boundary calls an authenticated gateway SDK (e.g. Razorpay/Stripe).
  // In this sandbox environment, simulated failure can only be triggered by deliberate test tokens.
  const isDeclinedTestToken =
    paymentMethod === 'declined_simulated' ||
    paymentMethod === 'failed_simulated' ||
    paymentMethod === 'test_declined';

  const method = VALID_PAYMENT_METHODS.includes(paymentMethod) ? paymentMethod : 'upi_simulated';

  // Strict Production Safeguard: Never allow simulated payments to succeed in production
  if (!isDeclinedTestToken && method.includes('simulated') && !isSimulatedPaymentAllowed()) {
    const error = new Error('Simulated payments are strictly disabled in production. An integrated payment gateway is required.');
    error.statusCode = 403;
    throw error;
  }

  if (isDeclinedTestToken) {
    // Trusted server marks payment as Failed
    await conn.query(
      `UPDATE meal_sponsorships SET payment_status = 'Failed' WHERE sponsorship_id = ?`,
      [sponsorshipId]
    );

    await conn.query(
      `UPDATE payments
       SET status = 'Failed',
           gateway_response_payload = JSON_OBJECT('simulated_outcome', 'FAILED', 'reason', 'Declined by test bank card simulation'),
           updated_at = NOW()
       WHERE sponsorship_id = ?`,
      [sponsorshipId]
    );

    return {
      success: false,
      message: 'Simulated payment was declined by the bank. Zero meal credits have been generated.',
      sponsorship_id: sponsorshipId,
      payment_status: 'Failed',
      credits_generated: false,
    };
  }

  // Trusted server marks payment as Completed and calls internal credit minting
  return await processSponsorshipPayment(conn, {
    sponsorshipId,
    paymentStatus: 'Completed',
    paymentMethod: method,
    requestingUserId: studentUserId,
    requestingRole: 'student',
  });
}

/**
 * Internal/Administrative Trusted Payment Completion Function.
 * Mints meal credits into the Open Community Pool when payment is Completed.
 *
 * @param {import('mysql2/promise').Connection} conn
 * @param {Object} params
 * @param {number} params.sponsorshipId
 * @param {string} params.paymentStatus - 'Completed' | 'Failed' | 'Pending'
 * @param {string} [params.paymentMethod]
 * @param {string} [params.transactionReference]
 * @param {number} [params.requestingUserId]
 * @param {string} [params.requestingRole]
 * @returns {Promise<Object>}
 */
export async function processSponsorshipPayment(conn, {
  sponsorshipId,
  paymentStatus,
  paymentMethod,
  transactionReference,
  requestingUserId,
  requestingRole,
}) {
  // Lock sponsorship row
  const [sponsorships] = await conn.query(
    `SELECT * FROM meal_sponsorships WHERE sponsorship_id = ? FOR UPDATE`,
    [sponsorshipId]
  );

  if (sponsorships.length === 0) {
    const error = new Error(`Sponsorship #${sponsorshipId} not found.`);
    error.statusCode = 404;
    throw error;
  }

  const sponsorship = sponsorships[0];

  const normalizedStatus = String(paymentStatus).trim();
  const validStatuses = ['Completed', 'Paid', 'Failed', 'Pending'];
  if (!validStatuses.includes(normalizedStatus)) {
    const error = new Error(`Invalid payment status '${paymentStatus}'.`);
    error.statusCode = 400;
    throw error;
  }

  const isSuccess = normalizedStatus === 'Completed' || normalizedStatus === 'Paid';

  // Strict Production Safeguard
  if (isSuccess && (paymentMethod || '').includes('simulated') && !isSimulatedPaymentAllowed()) {
    const error = new Error('Simulated payments are strictly disabled in production. An integrated payment gateway is required.');
    error.statusCode = 403;
    throw error;
  }

  // IDEMPOTENCY CHECK
  if (sponsorship.payment_status === 'Paid') {
    if (isSuccess) {
      const [existingCredits] = await conn.query(
        `SELECT credit_id, balance, initial_value, status, expires_at FROM meal_credits WHERE sponsorship_id = ?`,
        [sponsorshipId]
      );
      const [existingPayments] = await conn.query(
        `SELECT payment_id, status, transaction_reference FROM payments WHERE sponsorship_id = ? ORDER BY payment_id DESC LIMIT 1`,
        [sponsorshipId]
      );

      return {
        success: true,
        message: 'Payment already processed and meal credits previously minted (idempotent response).',
        sponsorship_id: sponsorshipId,
        payment_status: 'Paid',
        total_amount: Number(sponsorship.total_amount),
        already_processed: true,
        payment: existingPayments[0] || null,
        credit: existingCredits[0] || null,
      };
    } else {
      const error = new Error('Cannot mark a successfully Paid sponsorship as Failed or Pending.');
      error.statusCode = 409;
      throw error;
    }
  }

  // Handle SUCCESSFUL PAYMENT -> Mint Credits into Community Pool
  if (isSuccess) {
    const [existingPayments] = await conn.query(
      `SELECT payment_id FROM payments WHERE sponsorship_id = ? ORDER BY payment_id DESC LIMIT 1 FOR UPDATE`,
      [sponsorshipId]
    );

    let paymentId = null;
    const finalTxnRef =
      transactionReference ||
      'TXN-SPON-' + sponsorshipId + '-' + crypto.randomBytes(4).toString('hex').toUpperCase();

    if (existingPayments.length > 0) {
      paymentId = existingPayments[0].payment_id;
      await conn.query(
        `UPDATE payments
         SET status = 'Completed',
             payment_method = COALESCE(?, payment_method),
             transaction_reference = COALESCE(?, transaction_reference),
             gateway_response_payload = JSON_OBJECT('status', 'Completed', 'settled_at', NOW()),
             updated_at = NOW()
         WHERE payment_id = ?`,
        [paymentMethod || null, transactionReference || null, paymentId]
      );
    } else {
      const [newPay] = await conn.query(
        `INSERT INTO payments (
          order_id, sponsorship_id, user_id, amount, payment_method,
          status, attempt_number, transaction_reference, gateway_provider,
          gateway_response_payload, created_at, updated_at
        ) VALUES (NULL, ?, ?, ?, COALESCE(?, 'upi_simulated'), 'Completed', 1, ?, 'internal_simulated', JSON_OBJECT('status', 'Completed'), NOW(), NOW())`,
        [
          sponsorshipId,
          sponsorship.sponsor_user_id,
          sponsorship.total_amount,
          paymentMethod,
          finalTxnRef,
        ]
      );
      paymentId = newPay.insertId;
    }

    // Update meal_sponsorships status to Paid
    await conn.query(
      `UPDATE meal_sponsorships SET payment_status = 'Paid' WHERE sponsorship_id = ?`,
      [sponsorshipId]
    );

    // Atomically Mint Meal Credit into Open Community Pool (beneficiary_user_id IS NULL)
    const [creditRes] = await conn.query(
      `INSERT INTO meal_credits (
        sponsorship_id, beneficiary_user_id, initial_value, balance,
        status, expires_at, created_at, updated_at
      ) VALUES (?, NULL, ?, ?, 'Active', DATE_ADD(NOW(), INTERVAL ? DAY), NOW(), NOW())`,
      [sponsorshipId, sponsorship.total_amount, sponsorship.total_amount, DEFAULT_CREDIT_VALIDITY_DAYS]
    );
    const creditId = creditRes.insertId;

    // Record append-only MINT entry in credit_ledger_entries with deterministic idempotency key
    const mintKey = `MINT-SPON-${sponsorshipId}`;
    await conn.query(
      `INSERT INTO credit_ledger_entries (
        credit_id, order_id, entry_type, amount, balance_before,
        balance_after, performed_by, idempotency_key, reason, created_at
      ) VALUES (?, NULL, 'MINT', ?, 0.00, ?, ?, ?, 'Pay-It-Forward community meal pool contribution', NOW())`,
      [creditId, sponsorship.total_amount, sponsorship.total_amount, sponsorship.sponsor_user_id, mintKey]
    );

    const [createdCredit] = await conn.query(
      `SELECT credit_id, sponsorship_id, beneficiary_user_id, initial_value, balance, status, expires_at, created_at
       FROM meal_credits WHERE credit_id = ?`,
      [creditId]
    );

    return {
      success: true,
      message: `Payment verified! ₹${Number(sponsorship.total_amount).toFixed(2)} (${sponsorship.meals_funded} meals) added to the open community pool.`,
      sponsorship_id: sponsorshipId,
      payment_status: 'Paid',
      total_amount: Number(sponsorship.total_amount),
      meals_funded: sponsorship.meals_funded,
      payment: {
        payment_id: paymentId,
        status: 'Completed',
        transaction_reference: finalTxnRef,
      },
      credit: {
        ...createdCredit[0],
        initial_value: Number(createdCredit[0].initial_value),
        balance: Number(createdCredit[0].balance),
        is_community_pool: true,
      },
      ledger_entry: {
        entry_type: 'MINT',
        amount: Number(sponsorship.total_amount),
        idempotency_key: mintKey,
      },
    };
  }

  // Handle FAILED PAYMENT -> No Credits Minted
  if (normalizedStatus === 'Failed') {
    await conn.query(
      `UPDATE meal_sponsorships SET payment_status = 'Failed' WHERE sponsorship_id = ?`,
      [sponsorshipId]
    );

    await conn.query(
      `UPDATE payments
       SET status = 'Failed',
           gateway_response_payload = JSON_OBJECT('status', 'Failed', 'reason', 'Server-side payment processing marked failed'),
           updated_at = NOW()
       WHERE sponsorship_id = ?`,
      [sponsorshipId]
    );

    return {
      success: false,
      message: 'Sponsorship payment failed. No meal credits have been generated.',
      sponsorship_id: sponsorshipId,
      payment_status: 'Failed',
      credits_generated: false,
    };
  }

  // Handle PENDING PAYMENT -> No Credits Minted
  if (normalizedStatus === 'Pending') {
    await conn.query(
      `UPDATE meal_sponsorships SET payment_status = 'Pending' WHERE sponsorship_id = ?`,
      [sponsorshipId]
    );

    return {
      success: true,
      message: 'Sponsorship payment is pending. Credits will be minted upon completion.',
      sponsorship_id: sponsorshipId,
      payment_status: 'Pending',
      credits_generated: false,
    };
  }
}

/**
 * Administrative Refund Service.
 * Strictly restricted to administrators. Cancels only unspent credit balance,
 * preserves historical redemptions and payments, and logs CANCELLATION ledger entry idempotently.
 *
 * @param {import('mysql2/promise').Connection} conn
 * @param {Object} params
 * @param {number} params.sponsorshipId
 * @param {number} params.adminUserId
 * @param {string} [params.reason]
 * @returns {Promise<Object>}
 */
export async function refundSponsorship(conn, {
  sponsorshipId,
  adminUserId,
  reason,
}) {
  // Lock sponsorship row
  const [sponsorships] = await conn.query(
    `SELECT * FROM meal_sponsorships WHERE sponsorship_id = ? FOR UPDATE`,
    [sponsorshipId]
  );

  if (sponsorships.length === 0) {
    const error = new Error(`Sponsorship #${sponsorshipId} not found.`);
    error.statusCode = 404;
    throw error;
  }

  const sponsorship = sponsorships[0];

  // Idempotency: check if already refunded
  const [existingRefundPayments] = await conn.query(
    `SELECT payment_id FROM payments WHERE sponsorship_id = ? AND status = 'Refunded' LIMIT 1`,
    [sponsorshipId]
  );

  if (existingRefundPayments.length > 0) {
    return {
      success: true,
      message: 'Sponsorship has already been refunded (idempotent response).',
      already_refunded: true,
      sponsorship_id: sponsorshipId,
      payment_status: 'Refunded',
    };
  }

  // Only Paid sponsorships are eligible for refund
  if (sponsorship.payment_status !== 'Paid') {
    const error = new Error(
      `Cannot refund sponsorship in '${sponsorship.payment_status}' status. Only Paid sponsorships can be refunded.`
    );
    error.statusCode = 400;
    throw error;
  }

  // Find credit lot
  const [credits] = await conn.query(
    `SELECT credit_id, initial_value, balance, status FROM meal_credits WHERE sponsorship_id = ? FOR UPDATE`,
    [sponsorshipId]
  );

  let unspentBalance = 0.0;
  let redeemedAmount = 0.0;
  let creditId = null;

  if (credits.length > 0) {
    const credit = credits[0];
    creditId = credit.credit_id;
    unspentBalance = parseFloat(Number(credit.balance).toFixed(2));
    const initialVal = parseFloat(Number(credit.initial_value).toFixed(2));
    redeemedAmount = parseFloat((initialVal - unspentBalance).toFixed(2));

    // Cancel unspent remaining pool balance
    if (unspentBalance > 0) {
      await conn.query(
        `UPDATE meal_credits SET balance = 0.00, status = 'Cancelled', updated_at = NOW() WHERE credit_id = ?`,
        [creditId]
      );

      const refundKey = `REFUND-SPON-${sponsorshipId}`;
      const refundReason =
        reason ||
        `Sponsorship #${sponsorshipId} administrative refund. Reversed unspent pool balance: ₹${unspentBalance.toFixed(2)}` +
        (redeemedAmount > 0
          ? `. Note: ₹${redeemedAmount.toFixed(2)} was already redeemed by peer students and remains intact in audit history.`
          : '');

      await conn.query(
        `INSERT INTO credit_ledger_entries (
          credit_id, order_id, entry_type, amount, balance_before,
          balance_after, performed_by, idempotency_key, reason, created_at
        ) VALUES (?, NULL, 'CANCELLATION', ?, ?, 0.00, ?, ?, ?, NOW())`,
        [creditId, unspentBalance, unspentBalance, adminUserId, refundKey, refundReason]
      );
    } else {
      // Balance was already 0 (fully redeemed)
      await conn.query(
        `UPDATE meal_credits SET status = 'Cancelled', updated_at = NOW() WHERE credit_id = ?`,
        [creditId]
      );
    }
  }

  // Preserve historical payment records: insert distinct Refunded payment entry
  const refundTxnRef =
    'REFUND-TXN-' + sponsorshipId + '-' + crypto.randomBytes(4).toString('hex').toUpperCase();

  await conn.query(
    `INSERT INTO payments (
      order_id, sponsorship_id, user_id, amount, payment_method,
      status, attempt_number, transaction_reference, gateway_provider,
      gateway_response_payload, created_at, updated_at
    ) VALUES (NULL, ?, ?, ?, 'upi_simulated', 'Refunded', 2, ?, 'internal_simulated', ?, NOW(), NOW())`,
    [
      sponsorshipId,
      sponsorship.sponsor_user_id,
      unspentBalance > 0 ? unspentBalance : sponsorship.total_amount,
      refundTxnRef,
      JSON.stringify({
        action: 'administrative_refund',
        original_amount: Number(sponsorship.total_amount),
        reversed_unspent_balance: unspentBalance,
        already_redeemed_amount: redeemedAmount,
        reason: reason || 'Administrative sponsor request',
        refunded_by: adminUserId,
      }),
    ]
  );

  // Update meal_sponsorships status
  await conn.query(
    `UPDATE meal_sponsorships SET payment_status = 'Failed' WHERE sponsorship_id = ?`,
    [sponsorshipId]
  );

  return {
    success: true,
    message:
      `Sponsorship #${sponsorshipId} refunded successfully. Reversed ₹${unspentBalance.toFixed(2)} unspent credits.` +
      (redeemedAmount > 0
        ? ` Note: ₹${redeemedAmount.toFixed(2)} was previously redeemed by peer students and is preserved in audit history.`
        : ''),
    sponsorship_id: sponsorshipId,
    original_amount: Number(sponsorship.total_amount),
    reversed_unspent_balance: unspentBalance,
    already_redeemed_amount: redeemedAmount,
    credit_status: 'Cancelled',
    payment_status: 'Refunded',
  };
}

/**
 * Retrieves the total active, unexpired Open Community Pool credit balance
 * accessible to any verified student.
 *
 * @param {import('mysql2/promise').Connection|import('mysql2/promise').Pool} connOrPool
 * @returns {Promise<Object>}
 */
export async function getAvailableCommunityCredits(connOrPool) {
  const [balanceRows] = await connOrPool.query(
    `SELECT
      COALESCE(SUM(balance), 0.00) AS available_pool_balance,
      COUNT(CASE WHEN status = 'Active' AND balance > 0 AND expires_at > NOW() THEN 1 END) AS active_lots_count,
      MIN(CASE WHEN status = 'Active' AND balance > 0 AND expires_at > NOW() THEN expires_at END) AS earliest_expiry
     FROM meal_credits
     WHERE beneficiary_user_id IS NULL
       AND status = 'Active'
       AND balance > 0
       AND expires_at > NOW()`
  );

  const [impactRows] = await connOrPool.query(
    `SELECT
      (SELECT COALESCE(SUM(initial_value), 0.00) FROM meal_credits WHERE beneficiary_user_id IS NULL) AS total_minted_amount,
      (SELECT COALESCE(SUM(meals_funded), 0) FROM meal_sponsorships WHERE payment_status = 'Paid') AS total_meals_funded,
      (SELECT COALESCE(SUM(amount), 0.00) FROM credit_ledger_entries WHERE entry_type = 'REDEMPTION') AS total_redeemed_amount,
      (SELECT COALESCE(SUM(amount), 0.00) FROM credit_ledger_entries WHERE entry_type = 'EXPIRATION') AS total_expired_amount`
  );

  const avail = Number(balanceRows[0]?.available_pool_balance) || 0;
  const mealUnitPrice = DEFAULT_MEAL_UNIT_PRICE;
  const mealsAvailable = Math.floor(avail / mealUnitPrice);

  return {
    available_pool_balance: parseFloat(avail.toFixed(2)),
    meal_unit_price: mealUnitPrice,
    meals_available: mealsAvailable,
    active_lots_count: Number(balanceRows[0]?.active_lots_count) || 0,
    earliest_expiry: balanceRows[0]?.earliest_expiry || null,
    total_meals_funded: Number(impactRows[0]?.total_meals_funded) || 0,
    total_minted_amount: parseFloat(Number(impactRows[0]?.total_minted_amount || 0).toFixed(2)),
    total_redeemed_amount: parseFloat(Number(impactRows[0]?.total_redeemed_amount || 0).toFixed(2)),
    total_expired_amount: parseFloat(Number(impactRows[0]?.total_expired_amount || 0).toFixed(2)),
  };
}

/**
 * Retrieves all sponsorships contributed by a specific student.
 *
 * @param {import('mysql2/promise').Pool} pool
 * @param {number} sponsorUserId
 * @returns {Promise<Array>}
 */
export async function getStudentSponsorships(pool, sponsorUserId) {
  const [rows] = await pool.query(
    `SELECT
      s.sponsorship_id,
      s.total_amount,
      s.meals_funded,
      s.meal_unit_price,
      s.payment_status,
      s.is_anonymous,
      s.message,
      s.created_at,
      p.payment_id,
      p.payment_method,
      p.transaction_reference,
      p.status AS payment_record_status,
      mc.credit_id,
      mc.balance AS remaining_credit_balance,
      mc.status AS credit_status,
      mc.expires_at AS credit_expires_at
     FROM meal_sponsorships s
     LEFT JOIN payments p ON s.sponsorship_id = p.sponsorship_id
     LEFT JOIN meal_credits mc ON s.sponsorship_id = mc.sponsorship_id
     WHERE s.sponsor_user_id = ?
     ORDER BY s.created_at DESC`,
    [sponsorUserId]
  );

  return rows.map((r) => ({
    sponsorship_id: r.sponsorship_id,
    total_amount: Number(r.total_amount),
    meals_funded: r.meals_funded,
    meal_unit_price: Number(r.meal_unit_price),
    payment_status: r.payment_record_status === 'Refunded' ? 'Refunded' : r.payment_status,
    is_anonymous: Boolean(r.is_anonymous),
    message: r.message,
    created_at: r.created_at,
    payment: r.payment_id
      ? {
          payment_id: r.payment_id,
          payment_method: r.payment_method,
          transaction_reference: r.transaction_reference,
          status: r.payment_record_status,
        }
      : null,
    credit: r.credit_id
      ? {
          credit_id: r.credit_id,
          remaining_balance: Number(r.remaining_credit_balance),
          status: r.credit_status,
          expires_at: r.credit_expires_at,
        }
      : null,
  }));
}

/**
 * Retrieves a single sponsorship by ID. Validates user ownership or admin privileges.
 *
 * @param {import('mysql2/promise').Pool} pool
 * @param {number} sponsorshipId
 * @param {number} requestingUserId
 * @param {string} requestingRole
 * @returns {Promise<Object>}
 */
export async function getSponsorshipById(pool, sponsorshipId, requestingUserId, requestingRole) {
  const [rows] = await pool.query(
    `SELECT
      s.*,
      p.payment_id,
      p.payment_method,
      p.transaction_reference,
      p.status AS payment_record_status,
      mc.credit_id,
      mc.balance AS remaining_credit_balance,
      mc.status AS credit_status,
      mc.expires_at AS credit_expires_at
     FROM meal_sponsorships s
     LEFT JOIN payments p ON s.sponsorship_id = p.sponsorship_id
     LEFT JOIN meal_credits mc ON s.sponsorship_id = mc.sponsorship_id
     WHERE s.sponsorship_id = ?`,
    [sponsorshipId]
  );

  if (rows.length === 0) {
    const error = new Error(`Sponsorship #${sponsorshipId} not found.`);
    error.statusCode = 404;
    throw error;
  }

  const s = rows[0];

  // RBAC ownership check
  if (
    s.sponsor_user_id !== null &&
    s.sponsor_user_id !== requestingUserId &&
    !['admin'].includes(requestingRole)
  ) {
    const error = new Error('Access denied: You cannot view details of another user’s sponsorship.');
    error.statusCode = 403;
    throw error;
  }

  return {
    sponsorship_id: s.sponsorship_id,
    sponsor_user_id: s.sponsor_user_id,
    donor_name: s.is_anonymous && requestingRole !== 'admin' ? 'Anonymous Sponsor' : s.donor_name,
    donor_email: requestingRole === 'admin' || s.sponsor_user_id === requestingUserId ? s.donor_email : null,
    total_amount: Number(s.total_amount),
    meals_funded: s.meals_funded,
    meal_unit_price: Number(s.meal_unit_price),
    payment_status: s.payment_record_status === 'Refunded' ? 'Refunded' : s.payment_status,
    is_anonymous: Boolean(s.is_anonymous),
    message: s.message,
    created_at: s.created_at,
    payment: s.payment_id
      ? {
          payment_id: s.payment_id,
          payment_method: s.payment_method,
          transaction_reference: s.transaction_reference,
          status: s.payment_record_status,
        }
      : null,
    credit: s.credit_id
      ? {
          credit_id: r => r.credit_id,
          remaining_balance: Number(s.remaining_credit_balance),
          status: s.credit_status,
          expires_at: s.credit_expires_at,
        }
      : null,
  };
}

/**
 * Retrieves the transparent, append-only credit ledger transaction history.
 *
 * @param {import('mysql2/promise').Pool} pool
 * @param {Object} [filters]
 * @returns {Promise<Array>}
 */
export async function getCreditHistory(pool, filters = {}) {
  const limit = Math.min(Number(filters.limit) || 50, 100);

  const [rows] = await pool.query(
    `SELECT
      cle.entry_id,
      cle.credit_id,
      cle.order_id,
      cle.entry_type,
      cle.amount,
      cle.balance_before,
      cle.balance_after,
      cle.idempotency_key,
      cle.reason,
      cle.created_at,
      mc.sponsorship_id,
      s.is_anonymous,
      CASE WHEN s.is_anonymous = 1 THEN 'Anonymous Sponsor' ELSE s.donor_name END AS display_donor_name,
      s.message AS sponsorship_message
     FROM credit_ledger_entries cle
     JOIN meal_credits mc ON cle.credit_id = mc.credit_id
     LEFT JOIN meal_sponsorships s ON mc.sponsorship_id = s.sponsorship_id
     ORDER BY cle.created_at DESC, cle.entry_id DESC
     LIMIT ?`,
    [limit]
  );

  return rows.map((r) => ({
    entry_id: r.entry_id,
    credit_id: r.credit_id,
    order_id: r.order_id,
    entry_type: r.entry_type,
    amount: Number(r.amount),
    balance_before: Number(r.balance_before),
    balance_after: Number(r.balance_after),
    idempotency_key: r.idempotency_key,
    reason: r.reason,
    created_at: r.created_at,
    sponsorship_id: r.sponsorship_id,
    display_donor_name: r.display_donor_name,
    sponsorship_message: r.sponsorship_message,
  }));
}

/**
 * Identifies expired meal credits past their expires_at date, expires remaining balance,
 * and records an EXPIRATION ledger entry idempotently.
 *
 * @param {import('mysql2/promise').Connection} conn
 * @param {number} [adminUserId=null]
 * @returns {Promise<Object>}
 */
export async function processExpiredCredits(conn, adminUserId = null) {
  const [expiredCredits] = await conn.query(
    `SELECT credit_id, sponsorship_id, initial_value, balance, status, expires_at
     FROM meal_credits
     WHERE status = 'Active'
       AND expires_at <= NOW()
       AND balance > 0
     FOR UPDATE`
  );

  const results = {
    expired_credits_count: expiredCredits.length,
    total_expired_amount: 0.0,
    ledger_entries_created: 0,
  };

  for (const credit of expiredCredits) {
    const remainingBalance = Number(credit.balance);
    if (remainingBalance <= 0) continue;

    // 1. Mark credit as Expired with 0 balance
    await conn.query(
      `UPDATE meal_credits
       SET balance = 0.00, status = 'Expired', updated_at = NOW()
       WHERE credit_id = ?`,
      [credit.credit_id]
    );

    // 2. Insert EXPIRATION ledger entry with deterministic idempotency key
    const expKey = `EXP-CREDIT-${credit.credit_id}`;
    const [existing] = await conn.query(
      `SELECT entry_id FROM credit_ledger_entries WHERE idempotency_key = ?`,
      [expKey]
    );

    if (existing.length === 0) {
      await conn.query(
        `INSERT INTO credit_ledger_entries (
          credit_id, order_id, entry_type, amount, balance_before,
          balance_after, performed_by, idempotency_key, reason, created_at
        ) VALUES (?, NULL, 'EXPIRATION', ?, ?, 0.00, ?, ?, ?, NOW())`,
        [
          credit.credit_id,
          remainingBalance,
          remainingBalance,
          adminUserId,
          expKey,
          `Meal credit expired past cutoff ${credit.expires_at}`,
        ]
      );
      results.ledger_entries_created++;
    }

    results.total_expired_amount += remainingBalance;
  }

  results.total_expired_amount = parseFloat(results.total_expired_amount.toFixed(2));
  return results;
}

/**
 * Performs an eligible administrative balance adjustment on a meal credit lot.
 * Strictly prevents negative balances and records an immutable ADJUSTMENT ledger entry.
 *
 * @param {import('mysql2/promise').Connection} conn
 * @param {Object} params
 * @param {number} params.creditId
 * @param {number|string} params.adjustmentAmount
 * @param {string} params.reason
 * @param {string} [params.idempotencyKey]
 * @param {number} params.adminUserId
 * @returns {Promise<Object>}
 */
export async function adjustCreditBalance(conn, {
  creditId,
  adjustmentAmount,
  reason,
  idempotencyKey,
  adminUserId,
}) {
  const parsedAdj = parseFloat(parseFloat(adjustmentAmount).toFixed(2));
  if (isNaN(parsedAdj) || parsedAdj === 0) {
    const error = new Error('Adjustment amount must be a non-zero number.');
    error.statusCode = 400;
    throw error;
  }

  if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
    const error = new Error('Reason is required for administrative credit adjustments.');
    error.statusCode = 400;
    throw error;
  }

  // Lock credit row
  const [credits] = await conn.query(
    `SELECT * FROM meal_credits WHERE credit_id = ? FOR UPDATE`,
    [creditId]
  );

  if (credits.length === 0) {
    const error = new Error(`Meal credit #${creditId} not found.`);
    error.statusCode = 404;
    throw error;
  }

  const credit = credits[0];
  const currentBalance = Number(credit.balance);
  const newBalance = parseFloat((currentBalance + parsedAdj).toFixed(2));

  if (newBalance < 0) {
    const error = new Error(
      `Adjustment would cause negative credit balance. Current: ₹${currentBalance.toFixed(2)}, Adjustment: ₹${parsedAdj.toFixed(2)}.`
    );
    error.statusCode = 400;
    throw error;
  }

  // Deterministic idempotency key
  const finalKey = idempotencyKey || `ADJ-${creditId}-${Date.now()}`;
  const [existingLedger] = await conn.query(
    `SELECT entry_id, amount, balance_after FROM credit_ledger_entries WHERE idempotency_key = ?`,
    [finalKey]
  );

  if (existingLedger.length > 0) {
    return {
      success: true,
      message: 'Adjustment was previously executed (idempotent response).',
      credit_id: creditId,
      balance: Number(credit.balance),
      already_processed: true,
      ledger_entry: existingLedger[0],
    };
  }

  // Update credit status, balance, and initial_value if newBalance exceeds initial_value
  let newStatus = credit.status;
  if (newBalance === 0) {
    newStatus = 'Depleted';
  } else if (credit.status === 'Depleted' && newBalance > 0) {
    newStatus = 'Active';
  }

  const newInitialValue = Math.max(Number(credit.initial_value), newBalance);

  await conn.query(
    `UPDATE meal_credits SET balance = ?, initial_value = ?, status = ?, updated_at = NOW() WHERE credit_id = ?`,
    [newBalance, newInitialValue, newStatus, creditId]
  );

  // Insert ADJUSTMENT into ledger
  const [ledgerRes] = await conn.query(
    `INSERT INTO credit_ledger_entries (
      credit_id, order_id, entry_type, amount, balance_before,
      balance_after, performed_by, idempotency_key, reason, created_at
    ) VALUES (?, NULL, 'ADJUSTMENT', ?, ?, ?, ?, ?, ?, NOW())`,
    [
      creditId,
      Math.abs(parsedAdj),
      currentBalance,
      newBalance,
      adminUserId,
      finalKey,
      reason.trim(),
    ]
  );

  return {
    success: true,
    message: `Credit balance adjusted successfully from ₹${currentBalance.toFixed(2)} to ₹${newBalance.toFixed(2)}.`,
    credit_id: creditId,
    balance_before: currentBalance,
    balance_after: newBalance,
    adjustment_amount: parsedAdj,
    status: newStatus,
    ledger_entry: {
      entry_id: ledgerRes.insertId,
      entry_type: 'ADJUSTMENT',
      idempotency_key: finalKey,
    },
  };
}

/**
 * Retrieves all sponsorships for admin oversight.
 *
 * @param {import('mysql2/promise').Pool} pool
 * @param {Object} [filters]
 * @returns {Promise<Array>}
 */
export async function getAdminSponsorships(pool, filters = {}) {
  const { payment_status, limit = 50 } = filters;

  let query = `
    SELECT
      s.sponsorship_id,
      s.sponsor_user_id,
      s.donor_name,
      s.donor_email,
      s.total_amount,
      s.meals_funded,
      s.meal_unit_price,
      s.payment_status,
      s.is_anonymous,
      s.message,
      s.created_at,
      p.payment_id,
      p.payment_method,
      p.transaction_reference,
      p.status AS payment_record_status,
      mc.credit_id,
      mc.balance AS remaining_credit_balance,
      mc.status AS credit_status
    FROM meal_sponsorships s
    LEFT JOIN payments p ON s.sponsorship_id = p.sponsorship_id
    LEFT JOIN meal_credits mc ON s.sponsorship_id = mc.sponsorship_id
  `;

  const params = [];
  if (payment_status && payment_status !== 'all') {
    query += ` WHERE s.payment_status = ?`;
    params.push(payment_status);
  }

  query += ` ORDER BY s.created_at DESC LIMIT ?`;
  params.push(Number(limit) || 50);

  const [rows] = await pool.query(query, params);

  return rows.map((r) => ({
    sponsorship_id: r.sponsorship_id,
    sponsor_user_id: r.sponsor_user_id,
    donor_name: r.donor_name,
    donor_email: r.donor_email,
    total_amount: Number(r.total_amount),
    meals_funded: r.meals_funded,
    meal_unit_price: Number(r.meal_unit_price),
    payment_status: r.payment_record_status === 'Refunded' ? 'Refunded' : r.payment_status,
    is_anonymous: Boolean(r.is_anonymous),
    message: r.message,
    created_at: r.created_at,
    payment: r.payment_id
      ? {
          payment_id: r.payment_id,
          payment_method: r.payment_method,
          transaction_reference: r.transaction_reference,
          status: r.payment_record_status,
        }
      : null,
    credit: r.credit_id
      ? {
          credit_id: r.credit_id,
          remaining_balance: Number(r.remaining_credit_balance),
          status: r.credit_status,
        }
      : null,
  }));
}

/**
 * Retrieves all meal credit lots for admin auditing.
 *
 * @param {import('mysql2/promise').Pool} pool
 * @param {Object} [filters]
 * @returns {Promise<Array>}
 */
export async function getAdminCredits(pool, filters = {}) {
  const { status, limit = 50 } = filters;

  let query = `
    SELECT
      mc.credit_id,
      mc.sponsorship_id,
      mc.beneficiary_user_id,
      mc.initial_value,
      mc.balance,
      mc.status,
      mc.expires_at,
      mc.created_at,
      mc.updated_at,
      s.donor_name,
      s.total_amount AS sponsored_amount,
      s.is_anonymous
    FROM meal_credits mc
    JOIN meal_sponsorships s ON mc.sponsorship_id = s.sponsorship_id
  `;

  const params = [];
  if (status && status !== 'all') {
    query += ` WHERE mc.status = ?`;
    params.push(status);
  }

  query += ` ORDER BY mc.created_at DESC LIMIT ?`;
  params.push(Number(limit) || 50);

  const [rows] = await pool.query(query, params);

  return rows.map((r) => ({
    credit_id: r.credit_id,
    sponsorship_id: r.sponsorship_id,
    beneficiary_user_id: r.beneficiary_user_id,
    is_community_pool: r.beneficiary_user_id === null,
    initial_value: Number(r.initial_value),
    balance: Number(r.balance),
    status: r.status,
    expires_at: r.expires_at,
    created_at: r.created_at,
    updated_at: r.updated_at,
    donor_name: r.donor_name,
    is_anonymous: Boolean(r.is_anonymous),
  }));
}
