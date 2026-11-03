/* global process */
/**
 * PlateWise Phase 3C.2 & 3C.2.1 Pay-It-Forward Sponsorship & Meal Credit Test Suite
 * Validates all security, functional, financial, lifecycle, ledger, expiry,
 * concurrency, and regression requirements against isolated test database platewise_test_db.
 */

process.env.DB_NAME = 'platewise_test_db';

import http from 'http';
import axios from 'axios';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure process.env.DB_NAME is strictly preserved
process.env.DB_NAME = 'platewise_test_db';

const { default: pool } = await import('../config/db.js');
const { default: app } = await import('../server.js');

let passed = 0;
let failed = 0;
const testResults = [];

function assert(condition, message, details = '') {
  if (condition) {
    passed++;
    console.log(`  ✓ [PASSED] ${message} ${details ? '(' + details + ')' : ''}`);
    testResults.push({ name: message, status: 'PASSED', details });
  } else {
    failed++;
    console.error(`  ✗ [FAILED] ${message} ${details ? '(' + details + ')' : ''}`);
    testResults.push({ name: message, status: 'FAILED', details });
  }
}

async function loginUser(baseUrl, email, password, loginAs = null) {
  const client = axios.create({
    baseURL: baseUrl,
    validateStatus: () => true,
    withCredentials: true,
  });

  const body = { email, password };
  if (loginAs) body.login_as = loginAs;

  const res = await client.post('/auth/login', body);
  const cookieHeaders = res.headers['set-cookie'] || [];

  let authCookie = null;
  let csrfToken = null;

  for (const c of cookieHeaders) {
    if (c.startsWith('platewise_auth=')) {
      authCookie = c.split(';')[0];
    }
    if (c.startsWith('csrf_token=')) {
      csrfToken = c.split(';')[0].replace('csrf_token=', '');
    }
  }

  const authenticatedClient = axios.create({
    baseURL: baseUrl,
    validateStatus: () => true,
    withCredentials: true,
    headers: {
      Cookie: cookieHeaders.map((c) => c.split(';')[0]).join('; '),
      ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
    },
  });

  return { res, client: authenticatedClient, authCookie, csrfToken, user: res.data?.user };
}

async function runAllTests() {
  console.log('================================================================================');
  console.log(' PlateWise Phase 3C.2.1 Sponsorship Payment Security & Meal Credit Test Suite');
  console.log(' Target Database: platewise_test_db');
  console.log('================================================================================');

  // Verify connected database
  const [dbRow] = await pool.query('SELECT DATABASE() AS current_db');
  if (dbRow[0].current_db !== 'platewise_test_db') {
    throw new Error(`SAFETY ABORT: Connected to ${dbRow[0].current_db}, expected platewise_test_db!`);
  }
  console.log(`[Safety Verified] Connected to isolated test database: ${dbRow[0].current_db}`);

  // Start test server on dynamic port
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api`;
  console.log(`[Test Server] Ephemeral backend listening at: ${baseUrl}\n`);

  const createdSponsorshipIds = [];
  const createdCreditIds = [];

  try {
    // 0. Authenticate test personas
    console.log('[Setup] Logging in test personas...');
    const student1Auth = await loginUser(baseUrl, 'aarav.sharma@campus.edu', 'Student@123', 'student');
    const student2Auth = await loginUser(baseUrl, 'ananya.verma@campus.edu', 'Student@123', 'student');
    const adminAuth = await loginUser(baseUrl, 'admin@platewise.campus', 'Admin@123', 'admin');

    assert(student1Auth.res.status === 200, 'Student 1 logs in successfully');
    assert(student2Auth.res.status === 200, 'Student 2 logs in successfully');
    assert(adminAuth.res.status === 200, 'Admin logs in successfully');

    // Clean up any old test sponsorships/credits to start with a known baseline
    await pool.query('DELETE FROM credit_ledger_entries WHERE credit_id IN (SELECT credit_id FROM meal_credits WHERE sponsorship_id > 0)');
    await pool.query('DELETE FROM credit_redemptions WHERE credit_id IN (SELECT credit_id FROM meal_credits WHERE sponsorship_id > 0)');
    await pool.query('DELETE FROM meal_credits WHERE sponsorship_id > 0');
    await pool.query('DELETE FROM payments WHERE sponsorship_id > 0');
    await pool.query('DELETE FROM meal_sponsorships WHERE sponsorship_id > 0');
    console.log('[Setup] Initialized clean sponsorship/credit test environment\n');

    // -------------------------------------------------------------------------
    // TEST 1: Valid sponsorship creation
    // -------------------------------------------------------------------------
    console.log('--- TEST 1: Valid sponsorship creation ---');
    const createRes = await student1Auth.client.post('/student/sponsorships', {
      amount: 120.0,
      meals_funded: 3,
      is_anonymous: false,
      message: 'Keep going campus friends!',
      payment_method: 'upi_simulated',
    });

    assert(
      createRes.status === 201 && createRes.data.success === true,
      'Student creates a valid sponsorship for ₹120 (3 meals)',
      `HTTP ${createRes.status}, sponsorship_id: ${createRes.data.sponsorship?.sponsorship_id}`
    );
    const spon1Id = createRes.data.sponsorship.sponsorship_id;
    createdSponsorshipIds.push(spon1Id);

    assert(
      createRes.data.sponsorship.payment_status === 'Pending' &&
        createRes.data.sponsorship.payment?.status === 'Pending',
      'Sponsorship and payment record start in Pending state'
    );

    // -------------------------------------------------------------------------
    // TEST 2: Invalid amount rejection
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 2: Invalid amount rejection ---');
    const negAmountRes = await student1Auth.client.post('/student/sponsorships', {
      amount: -50.0,
      meals_funded: 1,
    });
    assert(
      negAmountRes.status === 400,
      'Negative sponsorship amount rejected with 400 Bad Request',
      `HTTP ${negAmountRes.status}`
    );

    const zeroAmountRes = await student1Auth.client.post('/student/sponsorships', {
      amount: 0,
    });
    assert(
      zeroAmountRes.status === 400,
      'Zero sponsorship amount rejected with 400 Bad Request',
      `HTTP ${zeroAmountRes.status}`
    );

    const stringAmountRes = await student1Auth.client.post('/student/sponsorships', {
      amount: 'invalid_number',
    });
    assert(
      stringAmountRes.status === 400,
      'Non-numeric amount rejected with 400 Bad Request',
      `HTTP ${stringAmountRes.status}`
    );

    // -------------------------------------------------------------------------
    // TEST 3: Security: Client-supplied payment_status='Completed' REJECTED
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 3: Security Hardening: Client cannot force payment_status: Completed ---');
    const studentStatusCompRes = await student1Auth.client.post(`/student/sponsorships/${spon1Id}/pay`, {
      payment_status: 'Completed',
    });
    assert(
      studentStatusCompRes.status === 400,
      'Student request supplying payment_status: Completed rejected with HTTP 400 Forbidden Parameter',
      `HTTP ${studentStatusCompRes.status}: ${JSON.stringify(studentStatusCompRes.data)}`
    );

    // -------------------------------------------------------------------------
    // TEST 4: Security: Client-supplied payment_status='Refunded' REJECTED
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 4: Security Hardening: Client cannot force payment_status: Refunded ---');
    const studentStatusRefRes = await student1Auth.client.post(`/student/sponsorships/${spon1Id}/pay`, {
      payment_status: 'Refunded',
    });
    assert(
      studentStatusRefRes.status === 400,
      'Student request supplying payment_status: Refunded rejected with HTTP 400 Forbidden Parameter',
      `HTTP ${studentStatusRefRes.status}: ${JSON.stringify(studentStatusRefRes.data)}`
    );

    // -------------------------------------------------------------------------
    // TEST 5: Trusted simulated payment mints community meal credits
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 5: Trusted simulated payment mints community meal credits ---');
    const payRes = await student1Auth.client.post(`/student/sponsorships/${spon1Id}/pay`, {
      payment_method: 'upi_simulated',
    });

    assert(
      payRes.status === 200 && payRes.data.success === true,
      'Trusted payment processed successfully through backend verification',
      `HTTP ${payRes.status}`
    );
    assert(
      payRes.data.credit &&
        payRes.data.credit.balance === 120.0 &&
        payRes.data.credit.beneficiary_user_id === null &&
        payRes.data.credit.is_community_pool === true,
      'Meal credit minted into Open Community Pool with beneficiary_user_id IS NULL'
    );
    createdCreditIds.push(payRes.data.credit.credit_id);

    // Verify database state: credit_ledger_entries must have MINT entry
    const [ledgerRows] = await pool.query(
      'SELECT * FROM credit_ledger_entries WHERE credit_id = ? AND entry_type = "MINT"',
      [payRes.data.credit.credit_id]
    );
    assert(
      ledgerRows.length === 1 &&
        Number(ledgerRows[0].amount) === 120.0 &&
        Number(ledgerRows[0].balance_after) === 120.0 &&
        ledgerRows[0].idempotency_key === `MINT-SPON-${spon1Id}`,
      'MINT entry logged into credit_ledger_entries with deterministic idempotency key'
    );

    // -------------------------------------------------------------------------
    // TEST 6: Failed simulated payment creates no credits
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 6: Failed simulated payment creates zero credits ---');
    const failSponRes = await student1Auth.client.post('/student/sponsorships', {
      amount: 80.0,
      meals_funded: 2,
    });
    const sponFailId = failSponRes.data.sponsorship.sponsorship_id;
    createdSponsorshipIds.push(sponFailId);

    const failPayRes = await student1Auth.client.post(`/student/sponsorships/${sponFailId}/pay`, {
      payment_method: 'declined_simulated',
    });
    assert(
      failPayRes.status === 200 && failPayRes.data.success === false,
      'Payment marked as Failed by backend evaluation',
      `HTTP ${failPayRes.status}`
    );

    const [failCredits] = await pool.query(
      'SELECT COUNT(*) AS count FROM meal_credits WHERE sponsorship_id = ?',
      [sponFailId]
    );
    assert(
      failCredits[0].count === 0,
      'ZERO meal credits minted for declined payment attempt'
    );

    // -------------------------------------------------------------------------
    // TEST 7: Pending payment creates no credits
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 7: Pending payment creates zero credits ---');
    const pendSponRes = await student1Auth.client.post('/student/sponsorships', {
      amount: 40.0,
      meals_funded: 1,
    });
    const sponPendId = pendSponRes.data.sponsorship.sponsorship_id;
    createdSponsorshipIds.push(sponPendId);

    const [pendCredits] = await pool.query(
      'SELECT COUNT(*) AS count FROM meal_credits WHERE sponsorship_id = ?',
      [sponPendId]
    );
    assert(
      pendCredits[0].count === 0,
      'ZERO meal credits minted while payment remains Pending'
    );

    // -------------------------------------------------------------------------
    // TEST 8: Duplicate payment request does not mint twice (Idempotency)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 8: Duplicate payment request is idempotent ---');
    const repeatPayRes = await student1Auth.client.post(`/student/sponsorships/${spon1Id}/pay`, {
      payment_method: 'upi_simulated',
    });
    assert(
      repeatPayRes.status === 200 && repeatPayRes.data.already_processed === true,
      'Repeated payment request recognized as already processed (idempotent)',
      `already_processed: ${repeatPayRes.data.already_processed}`
    );

    const [allCreditsForSpon1] = await pool.query(
      'SELECT COUNT(*) AS count FROM meal_credits WHERE sponsorship_id = ?',
      [spon1Id]
    );
    assert(
      allCreditsForSpon1[0].count === 1,
      'Exactly 1 meal credit lot exists for sponsorship #1; zero duplicate mints'
    );

    const [allMintsForSpon1] = await pool.query(
      'SELECT COUNT(*) AS count FROM credit_ledger_entries WHERE idempotency_key = ?',
      [`MINT-SPON-${spon1Id}`]
    );
    assert(
      allMintsForSpon1[0].count === 1,
      'Exactly 1 MINT ledger entry exists; duplicate payment caused 0 duplicate entries'
    );

    // -------------------------------------------------------------------------
    // TEST 9: Open community pool balance is correct
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 9: Open community pool balance calculation ---');
    const poolRes = await student1Auth.client.get('/student/credits/available');
    assert(
      poolRes.status === 200,
      'Retrieved available community credit pool data',
      `HTTP ${poolRes.status}`
    );
    assert(
      poolRes.data.available_pool_balance === 120.0 &&
        poolRes.data.meals_available === 3 &&
        poolRes.data.active_lots_count === 1,
      'Available pool balance accurately reflects ₹120.00 (3 meals) from paid sponsorship'
    );

    // -------------------------------------------------------------------------
    // TEST 10: Verified student can retrieve eligible credits
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 10: Peer student can inspect available community credits ---');
    const student2PoolRes = await student2Auth.client.get('/student/credits/available');
    assert(
      student2PoolRes.status === 200 &&
        student2PoolRes.data.available_pool_balance === 120.0 &&
        student2PoolRes.data.meals_available === 3,
      'Student 2 accesses identical open community pool with ₹120.00 available'
    );

    // -------------------------------------------------------------------------
    // TEST 11: Role isolation & unauthorized endpoint access
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 11: Role isolation on administrative endpoints ---');
    const unauthRefundRes = await student1Auth.client.post(`/admin/sponsorships/${spon1Id}/refund`, {
      reason: 'Malicious student refund',
    });
    assert(
      unauthRefundRes.status === 403,
      'Student calling /api/admin/sponsorships/:id/refund rejected with 403 Forbidden',
      `HTTP ${unauthRefundRes.status}`
    );

    const unauthAdjustRes = await student1Auth.client.post('/admin/credits/adjust', {
      credit_id: payRes.data.credit.credit_id,
      adjustment_amount: 10,
      reason: 'Unauthorized hack',
    });
    assert(
      unauthAdjustRes.status === 403,
      'Student calling /api/admin/credits/adjust rejected with 403 Forbidden',
      `HTTP ${unauthAdjustRes.status}`
    );

    const unauthAdminCredits = await student1Auth.client.get('/admin/credits');
    assert(
      unauthAdminCredits.status === 403,
      'Student calling /api/admin/credits rejected with 403 Forbidden',
      `HTTP ${unauthAdminCredits.status}`
    );

    const unauthSponList = await student1Auth.client.get('/admin/sponsorships');
    assert(
      unauthSponList.status === 403,
      'Student calling /api/admin/sponsorships rejected with 403 Forbidden',
      `HTTP ${unauthSponList.status}`
    );

    // -------------------------------------------------------------------------
    // TEST 12: Administrative refund on partially redeemed credit lot
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 12: Administrative refund on partially redeemed credit lot ---');
    // Create new sponsorship for ₹120 and pay it
    const refundSponRes = await student1Auth.client.post('/student/sponsorships', {
      amount: 120.0,
      meals_funded: 3,
      message: 'Sponsorship to test partial refund',
    });
    const refundSponId = refundSponRes.data.sponsorship.sponsorship_id;
    createdSponsorshipIds.push(refundSponId);

    const refundPayRes = await student1Auth.client.post(`/student/sponsorships/${refundSponId}/pay`, {
      payment_method: 'upi_simulated',
    });
    const refundCreditId = refundPayRes.data.credit.credit_id;
    createdCreditIds.push(refundCreditId);

    // Simulate partial peer student redemption: ₹40 spent, ₹80 unspent balance remaining
    await pool.query(
      `UPDATE meal_credits SET balance = 80.00 WHERE credit_id = ?`,
      [refundCreditId]
    );
    await pool.query(
      `INSERT INTO credit_ledger_entries (
        credit_id, order_id, entry_type, amount, balance_before,
        balance_after, performed_by, idempotency_key, reason, created_at
      ) VALUES (?, NULL, 'REDEMPTION', 40.00, 120.00, 80.00, ?, ?, 'Simulated peer meal redemption', NOW())`,
      [refundCreditId, student2Auth.user.user_id, `SIM-REDEMPTION-${refundCreditId}`]
    );

    // Admin executes refund
    const refundRes = await adminAuth.client.post(`/admin/sponsorships/${refundSponId}/refund`, {
      reason: 'Donor requested partial unused balance refund',
    });

    assert(
      refundRes.status === 200 && refundRes.data.success === true,
      'Admin successfully refunds sponsorship with partial redemptions',
      `HTTP ${refundRes.status}`
    );
    assert(
      refundRes.data.reversed_unspent_balance === 80.0 &&
        refundRes.data.already_redeemed_amount === 40.0 &&
        refundRes.data.credit_status === 'Cancelled' &&
        refundRes.data.payment_status === 'Refunded',
      'Refund accurately reverses only unspent ₹80.00; ₹40.00 redeemed remains intact in audit history'
    );

    // Verify database state after refund
    const [refundCreditRow] = await pool.query(
      'SELECT balance, status FROM meal_credits WHERE credit_id = ?',
      [refundCreditId]
    );
    assert(
      Number(refundCreditRow[0].balance) === 0.0 && refundCreditRow[0].status === 'Cancelled',
      'Meal credit balance reduced to 0.00 and status set to Cancelled'
    );

    const [cancelLedgerRows] = await pool.query(
      'SELECT * FROM credit_ledger_entries WHERE credit_id = ? AND entry_type = "CANCELLATION"',
      [refundCreditId]
    );
    assert(
      cancelLedgerRows.length === 1 &&
        Number(cancelLedgerRows[0].amount) === 80.0 &&
        Number(cancelLedgerRows[0].balance_after) === 0.0 &&
        cancelLedgerRows[0].idempotency_key === `REFUND-SPON-${refundSponId}`,
      'Exactly 1 CANCELLATION ledger entry recorded for ₹80.00 with balance_after 0.00'
    );

    const [paymentAuditRows] = await pool.query(
      'SELECT status, amount FROM payments WHERE sponsorship_id = ? ORDER BY payment_id ASC',
      [refundSponId]
    );
    assert(
      paymentAuditRows.length === 2 &&
        paymentAuditRows[0].status === 'Completed' &&
        paymentAuditRows[1].status === 'Refunded' &&
        Number(paymentAuditRows[1].amount) === 80.0,
      'Historical payment record preserved; distinct Refunded payment entry created'
    );

    // -------------------------------------------------------------------------
    // TEST 13: Repeated refund request is idempotent
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 13: Idempotent repeat refund processing ---');
    const repeatRefundRes = await adminAuth.client.post(`/admin/sponsorships/${refundSponId}/refund`, {
      reason: 'Accidental duplicate refund click',
    });
    assert(
      repeatRefundRes.status === 200 && repeatRefundRes.data.already_refunded === true,
      'Repeated refund request returns already_refunded: true',
      `already_refunded: ${repeatRefundRes.data.already_refunded}`
    );

    const [repeatCancelLedger] = await pool.query(
      'SELECT COUNT(*) AS count FROM credit_ledger_entries WHERE credit_id = ? AND entry_type = "CANCELLATION"',
      [refundCreditId]
    );
    assert(
      repeatCancelLedger[0].count === 1,
      'Zero duplicate CANCELLATION ledger entries produced on duplicate refund attempt'
    );

    // -------------------------------------------------------------------------
    // TEST 14: Credit history is accurate & transparent
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 14: Credit history and append-only ledger transparency ---');
    const histRes = await student1Auth.client.get('/student/credits/history');
    assert(
      histRes.status === 200 && Array.isArray(histRes.data) && histRes.data.length > 0,
      'Credit history feed returns list of ledger entries',
      `entries count: ${histRes.data.length}`
    );
    const mintEntry = histRes.data.find((e) => e.entry_type === 'MINT');
    assert(
      mintEntry &&
        mintEntry.amount === 120.0 &&
        mintEntry.balance_after === 120.0 &&
        mintEntry.display_donor_name !== undefined,
      'MINT ledger entry contains accurate amount, balances, and donor metadata'
    );

    // -------------------------------------------------------------------------
    // TEST 15: Expired credits are handled correctly & idempotently
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 15: Credit expiration handling & idempotency ---');
    const [expSponRes] = await pool.query(
      `INSERT INTO meal_sponsorships (sponsor_user_id, donor_name, total_amount, meal_unit_price, meals_funded, payment_status, is_anonymous, created_at)
       VALUES (?, 'Expiring Donor', 40.00, 40.00, 1, 'Paid', 0, DATE_SUB(NOW(), INTERVAL 100 DAY))`,
      [student1Auth.user.user_id]
    );
    const expSponId = expSponRes.insertId;
    createdSponsorshipIds.push(expSponId);

    const [expCreditRes] = await pool.query(
      `INSERT INTO meal_credits (sponsorship_id, beneficiary_user_id, initial_value, balance, status, expires_at, created_at, updated_at)
       VALUES (?, NULL, 40.00, 40.00, 'Active', DATE_SUB(NOW(), INTERVAL 5 DAY), DATE_SUB(NOW(), INTERVAL 100 DAY), NOW())`,
      [expSponId]
    );
    const expCreditId = expCreditRes.insertId;
    createdCreditIds.push(expCreditId);

    // Trigger admin expire check
    const expCheckRes = await adminAuth.client.post('/admin/credits/expire-check');
    assert(
      expCheckRes.status === 200 && expCheckRes.data.expired_credits_count > 0,
      'Admin expire check identifies expired credit lot and executes expiration',
      `expired count: ${expCheckRes.data.expired_credits_count}`
    );

    const [expCreditRow] = await pool.query(
      'SELECT balance, status FROM meal_credits WHERE credit_id = ?',
      [expCreditId]
    );
    assert(
      Number(expCreditRow[0].balance) === 0.0 && expCreditRow[0].status === 'Expired',
      'Expired credit lot balance reduced to 0.00 and status set to Expired'
    );

    const [expLedgerRow] = await pool.query(
      'SELECT * FROM credit_ledger_entries WHERE credit_id = ? AND entry_type = "EXPIRATION"',
      [expCreditId]
    );
    assert(
      expLedgerRow.length === 1 &&
        Number(expLedgerRow[0].amount) === 40.0 &&
        Number(expLedgerRow[0].balance_after) === 0.0,
      'EXPIRATION ledger entry recorded with amount 40.00 and balance_after 0.00'
    );

    // Idempotent second check
    const expCheckRun2 = await adminAuth.client.post('/admin/credits/expire-check');
    assert(
      expCheckRun2.status === 200 && expCheckRun2.data.expired_credits_count === 0,
      'Second immediate expiry run finds 0 additional expired credits',
      `expired count: ${expCheckRun2.data.expired_credits_count}`
    );

    const [expLedgerCount] = await pool.query(
      'SELECT COUNT(*) AS count FROM credit_ledger_entries WHERE credit_id = ? AND entry_type = "EXPIRATION"',
      [expCreditId]
    );
    assert(
      expLedgerCount[0].count === 1,
      'Exactly 1 EXPIRATION entry exists; repeated runs produce zero duplicate ledger records'
    );

    // -------------------------------------------------------------------------
    // TEST 16: Administrative adjustments & concurrency safety
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 16: Administrative adjustments & concurrency safety ---');
    const validCreditId = payRes.data.credit.credit_id;

    // Positive adjustment
    const adjUpRes = await adminAuth.client.post('/admin/credits/adjust', {
      credit_id: validCreditId,
      adjustment_amount: 40.0,
      reason: 'Institutional matching bonus',
    });
    assert(
      adjUpRes.status === 200 && adjUpRes.data.balance_after === 160.0,
      'Admin adjusts credit balance upward (+₹40.00 -> ₹160.00)',
      `new balance: ${adjUpRes.data.balance_after}`
    );

    // Negative adjustment
    const adjDownRes = await adminAuth.client.post('/admin/credits/adjust', {
      credit_id: validCreditId,
      adjustment_amount: -20.0,
      reason: 'Fee correction',
    });
    assert(
      adjDownRes.status === 200 && adjDownRes.data.balance_after === 140.0,
      'Admin adjusts credit balance downward (-₹20.00 -> ₹140.00)',
      `new balance: ${adjDownRes.data.balance_after}`
    );

    // Excessive deduction rejected
    const excessiveAdjRes = await adminAuth.client.post('/admin/credits/adjust', {
      credit_id: validCreditId,
      adjustment_amount: -200.0,
      reason: 'Excessive deduction attempt',
    });
    assert(
      excessiveAdjRes.status === 400,
      'Adjustment causing negative balance is strictly rejected with 400',
      `HTTP ${excessiveAdjRes.status}`
    );

    // Concurrent adjustments with row locking
    console.log('  Firing 2 simultaneous adjustments on credit #' + validCreditId + '...');
    const [cAdj1, cAdj2] = await Promise.all([
      adminAuth.client.post('/admin/credits/adjust', {
        credit_id: validCreditId,
        adjustment_amount: 10.0,
        reason: 'Concurrent bonus A',
      }),
      adminAuth.client.post('/admin/credits/adjust', {
        credit_id: validCreditId,
        adjustment_amount: 10.0,
        reason: 'Concurrent bonus B',
      }),
    ]);
    assert(
      cAdj1.status === 200 && cAdj2.status === 200,
      'Both concurrent adjustments succeed sequentially under transaction locking',
      `Statuses: ${cAdj1.status}, ${cAdj2.status}`
    );

    const [finalCreditCheck] = await pool.query(
      'SELECT balance FROM meal_credits WHERE credit_id = ?',
      [validCreditId]
    );
    assert(
      Number(finalCreditCheck[0].balance) === 160.0,
      'Final credit balance equals exactly ₹160.00 (140 + 10 + 10); zero race condition loss'
    );

    // Clean up test records
    if (createdCreditIds.length > 0) {
      await pool.query('DELETE FROM credit_ledger_entries WHERE credit_id IN (?)', [createdCreditIds]);
      await pool.query('DELETE FROM credit_redemptions WHERE credit_id IN (?)', [createdCreditIds]);
      await pool.query('DELETE FROM meal_credits WHERE credit_id IN (?)', [createdCreditIds]);
    }
    if (createdSponsorshipIds.length > 0) {
      await pool.query('DELETE FROM payments WHERE sponsorship_id IN (?)', [createdSponsorshipIds]);
      await pool.query('DELETE FROM meal_sponsorships WHERE sponsorship_id IN (?)', [createdSponsorshipIds]);
    }
    console.log('\n[Cleanup] Test data cleanly pruned.');
  } finally {
    server.close();
  }

  // -------------------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------------------
  console.log('\n================================================================================');
  console.log(` Phase 3C.2.1 Test Suite Complete: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runAllTests().catch((err) => {
  console.error('[FATAL TEST SUITE ERROR]:', err);
  process.exit(1);
});
