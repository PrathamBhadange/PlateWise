/* global process */
/**
 * PlateWise Phase 3C.4: End-to-End Integration & Production-Safety Audit Test Suite
 * Validates all cross-module workflows, payment security boundaries, inventory accounting,
 * role authorization, and concurrent edge cases against isolated test database platewise_test_db.
 */

process.env.DB_NAME = 'platewise_test_db';

import http from 'http';
import axios from 'axios';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Strictly enforce isolated test database
process.env.DB_NAME = 'platewise_test_db';

const { default: pool } = await import('../config/db.js');
const { default: app } = await import('../server.js');
const { DEFAULT_MEAL_UNIT_PRICE, isSimulatedPaymentAllowed } = await import('../config/sponsorshipConfig.js');
const { calculateBatchStock } = await import('../services/donationService.js');

let passed = 0;
let failed = 0;
let skipped = 0;
const testAuditResults = [];

function assert(condition, message, details = '') {
  if (condition) {
    passed++;
    console.log(`  ✓ [PASSED] ${message} ${details ? '(' + details + ')' : ''}`);
    testAuditResults.push({ name: message, status: 'PASSED', details });
  } else {
    failed++;
    console.error(`  ✗ [FAILED] ${message} ${details ? '(' + details + ')' : ''}`);
    testAuditResults.push({ name: message, status: 'FAILED', details });
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

  const res = await client.post('/api/auth/login', body);
  if (res.status !== 200) {
    throw new Error(`Failed to log in as ${email} (status ${res.status}): ${JSON.stringify(res.data)}`);
  }

  const setCookie = res.headers['set-cookie'] || [];
  const cookieHeader = setCookie.map((c) => c.split(';')[0]).join('; ');
  const csrfToken = res.data.csrfToken;

  return axios.create({
    baseURL: baseUrl,
    validateStatus: () => true,
    headers: {
      Cookie: cookieHeader,
      'X-CSRF-Token': csrfToken,
    },
  });
}

async function runEndToEndIntegrationAudit() {
  console.log('================================================================');
  console.log(' PlateWise Phase 3C.4: End-to-End Integration & Safety Audit');
  console.log(' Target Test Database: platewise_test_db');
  console.log('================================================================\n');

  // Verify connected database is platewise_test_db
  const [dbRows] = await pool.query('SELECT DATABASE() AS current_db');
  const currentDb = dbRows[0]?.current_db;
  if (currentDb !== 'platewise_test_db') {
    throw new Error(`SAFETY ASSERTION FAILED: Connected to '${currentDb}', expected 'platewise_test_db'. Aborting!`);
  }
  console.log(`✓ Safety check passed: Active database is strictly '${currentDb}'\n`);

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;
  console.log(`✓ Ephemeral test server running on ${baseUrl}\n`);

  // Ensure test accounts exist in platewise_test_db
  const student1Email = 'aarav.sharma@campus.edu';
  const student2Email = 'ananya.verma@campus.edu';
  const kitchenEmail = 'kitchen@platewise.campus';
  const cashierEmail = 'cashier@platewise.campus';
  const ngo1Email = 'ngo@platewise.org';
  const adminEmail = 'admin@platewise.campus';

  // Create an extra second NGO account for multi-NGO claim testing if not exists
  const ngo2Email = 'helpage@relief.org';
  const [ngo2Existing] = await pool.query('SELECT user_id FROM users WHERE email = ?', [ngo2Email]);
  let ngo2Id;
  if (ngo2Existing.length === 0) {
    const bcrypt = (await import('bcryptjs')).default;
    const pwdHash = await bcrypt.hash('Ngo@123', 10);
    const [ins] = await pool.query(
      `INSERT INTO users (full_name, email, password_hash, role, account_status)
       VALUES ('HelpAge Relief', ?, ?, 'ngo', 'active')`,
      [ngo2Email, pwdHash]
    );
    ngo2Id = ins.insertId;
  } else {
    ngo2Id = ngo2Existing[0].user_id;
  }

  // Log in all authenticated role clients
  const student1Client = await loginUser(baseUrl, student1Email, 'Student@123');
  const student2Client = await loginUser(baseUrl, student2Email, 'Student@123');
  const kitchenClient = await loginUser(baseUrl, kitchenEmail, 'Kitchen@123');
  const cashierClient = await loginUser(baseUrl, cashierEmail, 'Cashier@123');
  const ngo1Client = await loginUser(baseUrl, ngo1Email, 'Ngo@123');
  const ngo2Client = await loginUser(baseUrl, ngo2Email, 'Ngo@123');
  const adminClient = await loginUser(baseUrl, adminEmail, 'Admin@123');

  const [s1User] = await pool.query('SELECT user_id FROM users WHERE email = ?', [student1Email]);
  const [s2User] = await pool.query('SELECT user_id FROM users WHERE email = ?', [student2Email]);
  const student1Id = s1User[0].user_id;
  const student2Id = s2User[0].user_id;

  // Helper to place orders safely without 5s double-submit window conflicts
  async function placeOrder(client, payload) {
    await pool.query('UPDATE orders SET order_date = NOW() - INTERVAL 10 SECOND WHERE order_date >= NOW() - INTERVAL 6 SECOND');
    const res = await client.post('/api/student/orders', payload);
    if (res.data?.order_id) {
      await pool.query('UPDATE orders SET order_date = NOW() - INTERVAL 10 SECOND WHERE order_id = ?', [res.data.order_id]);
    }
    return res;
  }
  const [menuRows] = await pool.query('SELECT menu_item_id, name, price FROM menu_items WHERE is_available = TRUE LIMIT 2');
  const testItem1 = menuRows[0];
  const testItem2 = menuRows[1] || menuRows[0];

  try {
    // =========================================================================
    // PART 2: WORKFLOW A — STUDENT ORDERING (STANDARD & CREDIT-FUNDED)
    // =========================================================================
    console.log('--- WORKFLOW A: STUDENT ORDERING WORKFLOW ---');

    // A1: View menu
    const menuRes = await student1Client.get('/api/student/menu');
    assert(menuRes.status === 200 && Array.isArray(menuRes.data) && menuRes.data.length > 0,
      'A1: Student can view available menu items');

    // A2: Checkout preview
    const previewRes = await student1Client.post('/api/student/orders/preview', {
      items: [{ menu_item_id: testItem1.menu_item_id, quantity: 2 }],
      redeem_credits: 0,
    });
    assert(previewRes.status === 200 && previewRes.data.subtotal === Number(testItem1.price) * 2,
      'A2: Checkout preview recalculates server-authoritative subtotal');

    // A3: Standard student checkout
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    const standardOrderRes = await student1Client.post('/api/student/orders', {
      items: [{ menu_item_id: testItem1.menu_item_id, quantity: 1 }],
      pickup_date: tomorrow,
      pickup_slot: '12:30 PM - 01:00 PM',
      payment_method: 'upi_simulated',
    });
    assert(standardOrderRes.status === 201 && standardOrderRes.data.order_id > 0,
      'A3: Standard student checkout creates order in Pending status', `Order #${standardOrderRes.data.order_id}`);

    const standardOrderId = standardOrderRes.data.order_id;
    // Backdate order_date to avoid 5s double-submit window in rapid test execution
    await pool.query('UPDATE orders SET order_date = NOW() - INTERVAL 10 SECOND WHERE order_id = ?', [standardOrderId]);

    // A4: Pickup token generated and formatted
    const token = standardOrderRes.data.pickup_token;
    assert(typeof token === 'string' && token.startsWith('#') && token.includes('-'),
      'A4: Valid pickup token generated on checkout', `Token: ${token}`);

    // A5: Monetary payment record created in payments
    const [payRows] = await pool.query('SELECT * FROM payments WHERE order_id = ?', [standardOrderId]);
    assert(payRows.length === 1 && Number(payRows[0].amount) === Number(testItem1.price) && payRows[0].status === 'Completed',
      'A5: Correct payment record created for non-zero payable order');

    // A6: Student views order history
    const historyRes = await student1Client.get('/api/student/orders');
    const foundInHistory = historyRes.data.find((o) => o.order_id === standardOrderId);
    assert(foundInHistory && foundInHistory.pickup_token === token,
      'A6: Order appears in student order history with token and status');

    // A7: Cashier verifies student order by token
    const cashierVerifyRes = await cashierClient.get(`/api/cashier/verify/${encodeURIComponent(token)}`);
    assert(cashierVerifyRes.status === 200 && cashierVerifyRes.data.found === true && cashierVerifyRes.data.order_id === standardOrderId,
      'A7: Cashier verifies student order by token');

    // =========================================================================
    // PART 2: WORKFLOW B — PAY-IT-FORWARD & MEAL CREDIT REDEMPTION
    // =========================================================================
    console.log('\n--- WORKFLOW B: PAY-IT-FORWARD SPONSORSHIP & COMMUNITY CREDITS ---');

    // B1: Student creates sponsorship
    const sponsorshipRes = await student1Client.post('/api/student/sponsorships', {
      amount: 80.00,
      meals_funded: 2,
      is_anonymous: false,
      message: 'Integration test gift meals',
      payment_method: 'upi_simulated',
      simulate_payment: false, // create pending
    });
    assert(sponsorshipRes.status === 201 && sponsorshipRes.data.sponsorship.payment_status === 'Pending',
      'B1: Sponsorship created with Pending payment status');
    const testSponId = sponsorshipRes.data.sponsorship.sponsorship_id;

    // B2: Student pays for sponsorship via trusted boundary
    const paySponRes = await student1Client.post(`/api/student/sponsorships/${testSponId}/pay`, {
      payment_method: 'upi_simulated',
    });
    assert(paySponRes.status === 200 && paySponRes.data.payment_status === 'Paid',
      'B2: Trusted boundary successfully processes payment and transitions status to Paid');

    // B3: Meal credits minted into Open Community Pool (beneficiary_user_id IS NULL)
    const [creditRows] = await pool.query(
      `SELECT * FROM meal_credits WHERE sponsorship_id = ? AND beneficiary_user_id IS NULL AND status = 'Active'`,
      [testSponId]
    );
    assert(creditRows.length === 1 && Number(creditRows[0].balance) === 80.00,
      'B3: Meal credits minted into Open Community Pool with null beneficiary');
    const testCreditId = creditRows[0].credit_id;

    // B4: Another student checks live pool
    const poolRes = await student2Client.get('/api/student/credits/available');
    assert(poolRes.status === 200 && poolRes.data.meals_available >= 2,
      'B4: Another student views live available community credit pool', `Meals available: ${poolRes.data.meals_available}`);

    // Fetch or ensure an item with price >= 40 for credit redemption
    const [eligibleItems] = await pool.query('SELECT menu_item_id, price FROM menu_items WHERE price >= 40.00 LIMIT 1');
    const eligibleItemId = eligibleItems[0]?.menu_item_id || testItem1.menu_item_id;

    // B5: Student 2 redeems 1 credit during checkout
    const creditCheckoutRes = await student2Client.post('/api/student/orders', {
      items: [{ menu_item_id: eligibleItemId, quantity: 1 }],
      pickup_date: tomorrow,
      pickup_slot: '01:00 PM - 01:30 PM',
      redeem_credits: 1,
      payment_method: 'upi_simulated',
    });
    const creditOrderId = creditCheckoutRes.data.order_id;
    if (creditOrderId) {
      await pool.query('UPDATE orders SET order_date = NOW() - INTERVAL 10 SECOND WHERE order_id = ?', [creditOrderId]);
    }

    assert(creditCheckoutRes.status === 201 && creditCheckoutRes.data.order?.discount_amount === DEFAULT_MEAL_UNIT_PRICE,
      'B5: Student 2 redeems community credit with ₹40 discount applied',
      creditCheckoutRes.data.message || creditCheckoutRes.data.error);

    // B6: Ledger contains REDEMPTION entry with order_id and credit_id
    const [ledgerRedemptions] = await pool.query(
      `SELECT * FROM credit_ledger_entries WHERE order_id = ? AND entry_type = 'REDEMPTION'`,
      [creditOrderId]
    );
    assert(ledgerRedemptions.length > 0 && Number(ledgerRedemptions[0].amount) === DEFAULT_MEAL_UNIT_PRICE,
      'B6: Append-only ledger contains immutable REDEMPTION record');

    // B7: Admin inspects sponsorships and credits
    const adminSponRes = await adminClient.get('/api/admin/sponsorships');
    const adminCredRes = await adminClient.get('/api/admin/credits');
    assert(adminSponRes.status === 200 && adminCredRes.status === 200 && Array.isArray(adminSponRes.data),
      'B7: Admin inspects sponsorships and community credit lots');

    // B8: Admin refunds sponsorship
    const refundRes = await adminClient.post(`/api/admin/sponsorships/${testSponId}/refund`, {
      reason: 'End-to-end integration audit test refund',
    });
    assert(refundRes.status === 200 && refundRes.data.payment_status === 'Refunded',
      'B8: Admin performs authorized refund, reversing unspent credits');

    // B9: Re-attempting refund on already refunded sponsorship returns idempotent response
    const dupRefundRes = await adminClient.post(`/api/admin/sponsorships/${testSponId}/refund`, {
      reason: 'Duplicate refund test',
    });
    assert(dupRefundRes.status === 200 && dupRefundRes.data.already_refunded === true,
      'B9: Repeated refund request handled idempotently without duplicate records');

    // =========================================================================
    // PART 2: WORKFLOW C — KITCHEN INVENTORY, SURPLUS & DOCK HANDOVER
    // =========================================================================
    console.log('\n--- WORKFLOW C: KITCHEN INVENTORY, SURPLUS & DOCK HANDOVER ---');

    // Seed a clean test food batch for today
    const today = new Date().toISOString().split('T')[0];
    const [batchRes] = await pool.query(
      `INSERT INTO food_batches (menu_item_id, batch_date, cooked_qty, sold_qty, leftover_qty, status)
       VALUES (?, ?, 50, 0, 50, 'Active')`,
      [testItem1.menu_item_id, today]
    );
    const testBatchId = batchRes.insertId;

    // C1: Calculate dual-horizon stock
    const stock1 = await calculateBatchStock(pool, testBatchId);
    assert(stock1.physical_stock_remaining === 50 && stock1.available_stock === 50,
      'C1: Batch initial physical and available stock both equal 50 portions');

    // C2: Kitchen publishes surplus food donation (20 portions)
    const deadline = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
    const publishRes = await kitchenClient.post('/api/kitchen/donations', {
      food_batch_id: testBatchId,
      quantity: 20,
      collection_deadline: deadline,
      notes: 'End-to-End Audit Surplus Offer',
    });
    if (publishRes.status !== 201) {
      console.log('Publish donation failed:', publishRes.status, publishRes.data);
    }
    assert(publishRes.status === 201 && publishRes.data?.donation?.quantity === 20,
      'C2: Kitchen publishes 20 portions surplus donation',
      publishRes.data?.message || publishRes.data?.error);
    const testDonationId = publishRes.data.donation.donation_id;

    // C3: Publishing reserves inventory without reducing physical stock
    const stock2 = await calculateBatchStock(pool, testBatchId);
    assert(stock2.physical_stock_remaining === 50 && stock2.active_reservations === 20 && stock2.available_stock === 30,
      'C3: Published donation reserves 20 portions; physical stock stays 50, available becomes 30');

    // C4: NGO 1 claims partial quantity (12 portions)
    const claim1Res = await ngo1Client.post(`/api/ngo/donations/${testDonationId}/claims`, {
      quantity: 12,
    });
    assert(claim1Res.status === 201 && claim1Res.data.claim.quantity === 12,
      'C4: NGO 1 claims 12 portions of the 20 available');
    const claim1 = claim1Res.data.claim;

    // C5: NGO 2 claims remaining 8 portions
    const claim2Res = await ngo2Client.post(`/api/ngo/donations/${testDonationId}/claims`, {
      quantity: 8,
    });
    assert(claim2Res.status === 201 && claim2Res.data.claim.quantity === 8,
      'C5: NGO 2 claims remaining 8 portions; parent donation offer fully claimed');

    // C6: Kitchen loading dock handover with verification code
    const handoverRes = await kitchenClient.post('/api/kitchen/donations/handover', {
      verification_code: claim1.verification_code,
    });
    assert(handoverRes.status === 200 && handoverRes.data.status === 'Collected',
      'C6: Kitchen dock handover verifies code and marks 12 portions Collected');

    // C7: Dock handover physically reduces kitchen on-hand inventory
    const stock3 = await calculateBatchStock(pool, testBatchId);
    assert(stock3.physical_stock_remaining === 38 && stock3.collected_donations === 12,
      'C7: Handover physically reduces remaining inventory from 50 to 38 portions');

    // =========================================================================
    // PART 2: WORKFLOW D — NGO DONATION MANAGEMENT & ROLE ISOLATION
    // =========================================================================
    console.log('\n--- WORKFLOW D: NGO DONATION MANAGEMENT & ISOLATION ---');

    // D1: NGO views its own claims
    const myClaimsRes = await ngo1Client.get('/api/ngo/my-claims');
    const myClaim1 = myClaimsRes.data.find((c) => c.claim_id === claim1.claim_id);
    assert(myClaimsRes.status === 200 && myClaim1 !== undefined,
      'D1: NGO 1 views its own claims list');

    // D2: NGO 2 cancels its pending claim (claim 2 for 8 portions)
    const cancelClaimRes = await ngo2Client.post(`/api/ngo/donation-claims/${claim2Res.data.claim.claim_id}/cancel`, {
      reason: 'Audit test cancellation',
    });
    assert(cancelClaimRes.status === 200 && cancelClaimRes.data.released_quantity === 8,
      'D2: NGO 2 cancels claim, releasing 8 portions back to available pool');

    // D3: NGO isolation: NGO 1 cannot cancel NGO 2's claim
    // Re-claim 5 portions for NGO 2 to test cross-tenant cancellation
    const reClaimRes = await ngo2Client.post(`/api/ngo/donations/${testDonationId}/claims`, { quantity: 5 });
    const claimToAttack = reClaimRes.data.claim.claim_id;
    const unauthorizedCancelRes = await ngo1Client.post(`/api/ngo/donation-claims/${claimToAttack}/cancel`, {
      reason: 'Malicious cancellation attempt',
    });
    assert(unauthorizedCancelRes.status === 403,
      'D3: Cross-tenant isolation: NGO 1 cannot cancel NGO 2 claim (403 Forbidden)');

    // D4: NGO cannot access kitchen-only endpoints
    const ngoAttackKitchenRes = await ngo1Client.post('/api/kitchen/donations', {
      food_batch_id: testBatchId,
      quantity: 5,
    });
    assert(ngoAttackKitchenRes.status === 403,
      'D4: Role RBAC: NGO cannot invoke kitchen donation creation (403 Forbidden)');

    // =========================================================================
    // PART 2: WORKFLOW E — CASHIER & COUNTER PICKUP VERIFICATION
    // =========================================================================
    console.log('\n--- WORKFLOW E: CASHIER & COUNTER PICKUP VERIFICATION ---');

    // Create and ready an order for counter handover
    await pool.query('UPDATE orders SET order_date = NOW() - INTERVAL 10 SECOND WHERE order_date >= NOW() - INTERVAL 6 SECOND');
    const orderForHandoverRes = await placeOrder(student1Client, {
      items: [{ menu_item_id: testItem1.menu_item_id, quantity: 1 }],
      pickup_date: tomorrow,
      pickup_slot: '01:30 PM - 02:00 PM',
      payment_method: 'upi_simulated',
    });
    const orderToHandoverId = orderForHandoverRes.data.order_id;
    const handoverToken = orderForHandoverRes.data.pickup_token;

    // Transition order: Pending -> Confirmed -> Preparing -> Ready
    await pool.query(`UPDATE orders SET status = 'Ready' WHERE order_id = ?`, [orderToHandoverId]);

    // E1: Cashier checks counter verify
    const cashierCheck = await cashierClient.get(`/api/cashier/verify/${encodeURIComponent(handoverToken)}`);
    assert(cashierCheck.status === 200 && cashierCheck.data.eligible === true && cashierCheck.data.status === 'Ready',
      'E1: Ready order verified by Cashier as eligible for pickup');

    // E2: Cashier hands over order -> Collected
    const handoverMealRes = await cashierClient.patch(`/api/cashier/orders/${orderToHandoverId}/handover`);
    assert(handoverMealRes.status === 200 && handoverMealRes.data.status === 'Collected',
      'E2: Cashier transitions order status from Ready to Collected');

    // E3: Repeated handover attempt rejected with 409 Conflict
    const repeatedHandoverRes = await cashierClient.patch(`/api/cashier/orders/${orderToHandoverId}/handover`);
    assert(repeatedHandoverRes.status === 409,
      'E3: Repeated handover on already Collected order rejected with 409 Conflict');

    // E4: Handover on Cancelled order rejected with 409 Conflict
    const [cancelledOrder] = await pool.query(
      `INSERT INTO orders (user_id, pickup_date, pickup_slot, total_amount, final_amount, status)
       VALUES (?, ?, '12:00 PM - 12:30 PM', 40.00, 40.00, 'Cancelled')`,
      [student1Id, tomorrow]
    );
    const cancelHandoverRes = await cashierClient.patch(`/api/cashier/orders/${cancelledOrder.insertId}/handover`);
    assert(cancelHandoverRes.status === 409,
      'E4: Handover on Cancelled order rejected with 409 Conflict');

    // =========================================================================
    // PART 2: WORKFLOW F — ADMIN MANAGEMENT & ACCESS RESTRICTIONS
    // =========================================================================
    console.log('\n--- WORKFLOW F: ADMIN MANAGEMENT & RBAC RESTRICTIONS ---');

    // F1: Admin user management (pending accounts)
    const pendingStaffRes = await adminClient.get('/api/admin/pending-users');
    assert(pendingStaffRes.status === 200 && Array.isArray(pendingStaffRes.data),
      'F1: Admin views pending user registrations list');

    // F2: Student cannot call admin endpoints
    const studentAttackAdminRes = await student1Client.get('/api/admin/pending-users');
    assert(studentAttackAdminRes.status === 403,
      'F2: Student blocked from accessing admin endpoint (403 Forbidden)');

    // F3: Admin credit balance adjustment
    // Mint 1 fresh lot to test adjustment
    const [freshLot] = await pool.query(
      `INSERT INTO meal_credits (sponsorship_id, beneficiary_user_id, initial_value, balance, status, expires_at, created_at, updated_at)
       VALUES (?, NULL, 40.00, 40.00, 'Active', DATE_ADD(NOW(), INTERVAL 30 DAY), NOW(), NOW())`,
      [testSponId]
    );
    const freshLotId = freshLot.insertId;

    const adjustRes = await adminClient.post('/api/admin/credits/adjust', {
      credit_id: freshLotId,
      adjustment_amount: -20.00,
      reason: 'Audit test administrative balance correction',
      idempotency_key: `ADJ-AUDIT-${Date.now()}`,
    });
    assert(adjustRes.status === 200 && Number(adjustRes.data.balance_after) === 20.00,
      'F3: Admin performs authorized credit adjustment (-₹20.00), balance updated to ₹20.00');

    // F4: Adjustment ledger entry written
    const [adjLedger] = await pool.query(
      `SELECT * FROM credit_ledger_entries WHERE credit_id = ? AND entry_type = 'ADJUSTMENT'`,
      [freshLotId]
    );
    assert(adjLedger.length === 1 && Number(adjLedger[0].amount) === 20.00 && Number(adjLedger[0].balance_after) === 20.00,
      'F4: Ledger records immutable ADJUSTMENT entry');

    // =========================================================================
    // PART 3: PRODUCTION PAYMENT SECURITY AUDIT
    // =========================================================================
    console.log('\n--- PART 3: PRODUCTION PAYMENT SECURITY AUDIT ---');

    // P1: Student request containing client-supplied payment_status is rejected
    const tamperedPaymentStatusRes = await student1Client.post(`/api/student/sponsorships/${testSponId}/pay`, {
      payment_status: 'Completed',
    });
    assert(tamperedPaymentStatusRes.status === 400 && tamperedPaymentStatusRes.data.error === 'Forbidden Parameter',
      'P1: Student attempt to pass payment_status in request body rejected (400 Forbidden Parameter)');

    // P2: Student cannot invoke administrative payment-processing or refund
    const studentProcessPayRes = await student1Client.post(`/api/admin/sponsorships/${testSponId}/process-payment`, {
      payment_status: 'Completed',
    });
    assert(studentProcessPayRes.status === 403,
      'P2: Student attempt to call admin process-payment endpoint rejected (403 Forbidden)');

    // P3: Simulated payment success strictly unavailable in production
    const prodAllowed = isSimulatedPaymentAllowed();
    assert(process.env.NODE_ENV === 'production' ? !prodAllowed : prodAllowed,
      'P3: isSimulatedPaymentAllowed() returns true only outside of production');

    // P4: Client-side discount/price cannot bypass server validation
    await pool.query('UPDATE orders SET order_date = NOW() - INTERVAL 10 SECOND WHERE order_date >= NOW() - INTERVAL 6 SECOND');
    const tamperedPriceOrderRes = await placeOrder(student1Client, {
      items: [{ menu_item_id: testItem1.menu_item_id, quantity: 1, unit_price: 1.00 }],
      pickup_date: tomorrow,
      pickup_slot: '12:00 PM - 12:30 PM',
      redeem_credits: 0,
      payment_method: 'upi_simulated',
    });
    assert(tamperedPriceOrderRes.status === 201 && tamperedPriceOrderRes.data.order.total_amount === Number(testItem1.price),
      'P4: Client-submitted unit_price is completely ignored; DB price strictly enforced');

    // P5: Zero-payable order creates 0 rows in payments table (schema compliance)
    // Seed 1 active credit lot for student 1
    const [zeroLot] = await pool.query(
      `INSERT INTO meal_credits (sponsorship_id, beneficiary_user_id, initial_value, balance, status, expires_at, created_at, updated_at)
       VALUES (?, NULL, 40.00, 40.00, 'Active', DATE_ADD(NOW(), INTERVAL 30 DAY), NOW(), NOW())`,
      [testSponId]
    );
    // Find item with price = 40.00 or update item for zero test
    const [fortyItems] = await pool.query('SELECT menu_item_id, price FROM menu_items WHERE price = 40.00 LIMIT 1');
    let fortyItemId = fortyItems[0]?.menu_item_id;
    if (!fortyItemId) {
      const [newDish] = await pool.query(`INSERT INTO menu_items (name, category, price, is_available) VALUES ('Audit Thali', 'Meals', 40.00, TRUE)`);
      fortyItemId = newDish.insertId;
    }

    await pool.query('UPDATE orders SET order_date = NOW() - INTERVAL 10 SECOND WHERE order_date >= NOW() - INTERVAL 6 SECOND');
    const zeroPayOrderRes = await placeOrder(student1Client, {
      items: [{ menu_item_id: fortyItemId, quantity: 1 }],
      pickup_date: tomorrow,
      pickup_slot: '12:30 PM - 01:00 PM',
      redeem_credits: 1,
      payment_method: 'credit_funded',
    });
    const zeroOrderId = zeroPayOrderRes.data.order_id;

    const [zeroPayRows] = await pool.query('SELECT * FROM payments WHERE order_id = ?', [zeroOrderId]);
    assert(zeroPayOrderRes.status === 201 && zeroPayRows.length === 0,
      'P5: Zero-payable order creates exactly 0 rows in payments table (chk_payment_amount satisfied)');

    // =========================================================================
    // PART 4: DATABASE & INVENTORY CONSISTENCY AUDIT
    // =========================================================================
    console.log('\n--- PART 4: DATABASE & INVENTORY CONSISTENCY AUDIT ---');

    // D1: Order items foreign key integrity
    const [orphanItems] = await pool.query(
      `SELECT COUNT(*) AS orphans FROM order_items oi
       LEFT JOIN menu_items m ON oi.menu_item_id = m.menu_item_id
       WHERE m.menu_item_id IS NULL`
    );
    assert(orphanItems[0].orphans === 0,
      'DB1: Zero orphaned order_items without a valid menu_items reference');

    // D2: Order totals match item quantities and prices
    const [mismatchedTotals] = await pool.query(
      `SELECT o.order_id, o.total_amount, SUM(oi.quantity * oi.unit_price) AS calculated
       FROM orders o
       JOIN order_items oi ON o.order_id = oi.order_id
       GROUP BY o.order_id, o.total_amount
       HAVING ABS(o.total_amount - calculated) > 0.01`
    );
    assert(mismatchedTotals.length === 0,
      'DB2: All orders gross total_amount exactly equals sum of item quantities * unit prices');

    // D3: No negative credit balances
    const [negativeCredits] = await pool.query('SELECT COUNT(*) AS neg FROM meal_credits WHERE balance < 0');
    assert(negativeCredits[0].neg === 0,
      'DB3: Zero negative balances in meal_credits table');

    // D4: Every redemption has an associated ledger entry
    const [unlinkedRedemptions] = await pool.query(
      `SELECT COUNT(*) AS unlinked FROM credit_redemptions cr
       LEFT JOIN credit_ledger_entries cle ON cr.order_id = cle.order_id AND cr.credit_id = cle.credit_id
       WHERE cle.entry_id IS NULL`
    );
    assert(unlinkedRedemptions[0].unlinked === 0,
      'DB4: Every credit redemption row has an auditable credit_ledger_entries record');

    // D5: Master Physical & Available Stock formulas verified against database
    const batchAuditStock = await calculateBatchStock(pool, testBatchId);
    const expectedPhysical = batchAuditStock.cooked_qty - batchAuditStock.historical_sold_qty -
                             batchAuditStock.new_linked_sales - batchAuditStock.collected_donations -
                             batchAuditStock.recorded_waste;
    assert(batchAuditStock.physical_stock_remaining === Math.max(0, expectedPhysical),
      'DB5: Physical stock strictly matches formula: cooked - sold - linked - collected - waste');

    // =========================================================================
    // PART 7: CONCURRENCY & EDGE-CASE AUDIT
    // =========================================================================
    console.log('\n--- PART 7: CONCURRENCY & EDGE-CASE AUDIT ---');

    // SCENARIO 1: Two students simultaneously competing for the last credit in community pool
    // Clear double-submit rate limit window for test accounts
    await pool.query('UPDATE orders SET order_date = NOW() - INTERVAL 10 SECOND WHERE order_date >= NOW() - INTERVAL 6 SECOND');

    // Drain pool lots or create single isolated 40.00 lot
    await pool.query(`UPDATE meal_credits SET status = 'Depleted', balance = 0 WHERE status = 'Active'`);
    const [soloCredit] = await pool.query(
      `INSERT INTO meal_credits (sponsorship_id, beneficiary_user_id, initial_value, balance, status, expires_at, created_at, updated_at)
       VALUES (?, NULL, 40.00, 40.00, 'Active', DATE_ADD(NOW(), INTERVAL 30 DAY), NOW(), NOW())`,
      [testSponId]
    );

    const [compRes1, compRes2] = await Promise.all([
      student1Client.post('/api/student/orders', {
        items: [{ menu_item_id: fortyItemId, quantity: 1 }],
        pickup_date: tomorrow,
        pickup_slot: '01:00 PM - 01:30 PM',
        redeem_credits: 1,
        payment_method: 'credit_funded',
      }),
      student2Client.post('/api/student/orders', {
        items: [{ menu_item_id: fortyItemId, quantity: 1 }],
        pickup_date: tomorrow,
        pickup_slot: '01:00 PM - 01:30 PM',
        redeem_credits: 1,
        payment_method: 'credit_funded',
      }),
    ]);

    const statuses = [compRes1.status, compRes2.status];
    const exactlyOneSuccess = (statuses.filter((s) => s === 201).length === 1);
    const exactlyOneConflict = (statuses.filter((s) => s === 409).length === 1);

    assert(exactlyOneSuccess && exactlyOneConflict,
      'C1: Concurrent credit race: exactly 1 student succeeds (201), other receives 409 Conflict',
      `Statuses: ${compRes1.status}, ${compRes2.status}`);

    const [afterCredit] = await pool.query('SELECT balance FROM meal_credits WHERE credit_id = ?', [soloCredit.insertId]);
    assert(Number(afterCredit[0].balance) === 0.00,
      'C1b: Credit pool balance safely depleted to 0.00 without negative balance');

    // SCENARIO 2: Two NGOs simultaneously claiming the remaining quantity of the same donation
    const [raceBatch] = await pool.query(
      `INSERT INTO food_batches (menu_item_id, batch_date, cooked_qty, sold_qty, leftover_qty, status)
       VALUES (?, ?, 30, 0, 30, 'Active')`,
      [testItem1.menu_item_id, today]
    );
    const [raceDon] = await pool.query(
      `INSERT INTO donations (food_batch_id, quantity, claimed_quantity, status, collection_deadline, donated_at)
       VALUES (?, 5, 0, 'Available', DATE_ADD(NOW(), INTERVAL 2 HOUR), NOW())`,
      [raceBatch.insertId]
    );
    const raceDonationId = raceDon.insertId;

    const [ngoClaimRes1, ngoClaimRes2] = await Promise.all([
      ngo1Client.post(`/api/ngo/donations/${raceDonationId}/claims`, { quantity: 5 }),
      ngo2Client.post(`/api/ngo/donations/${raceDonationId}/claims`, { quantity: 5 }),
    ]);

    const ngoStatuses = [ngoClaimRes1.status, ngoClaimRes2.status];
    assert(ngoStatuses.filter((s) => s === 201).length === 1 && ngoStatuses.filter((s) => s === 409).length === 1,
      'C2: Concurrent NGO donation claim: exactly 1 succeeds (201), other receives 409 Conflict',
      `Statuses: ${ngoClaimRes1.status}, ${ngoClaimRes2.status}`);

    // SCENARIO 3: Simultaneous cashier collection on the same order
    const [raceOrder] = await pool.query(
      `INSERT INTO orders (user_id, pickup_date, pickup_slot, total_amount, final_amount, status)
       VALUES (?, ?, '01:30 PM - 02:00 PM', 40.00, 40.00, 'Ready')`,
      [student1Id, tomorrow]
    );
    const raceOrderId = raceOrder.insertId;

    const [colRes1, colRes2] = await Promise.all([
      cashierClient.patch(`/api/cashier/orders/${raceOrderId}/handover`),
      cashierClient.patch(`/api/cashier/orders/${raceOrderId}/handover`),
    ]);

    const colStatuses = [colRes1.status, colRes2.status];
    assert(colStatuses.filter((s) => s === 200).length === 1 && colStatuses.filter((s) => s === 409).length === 1,
      'C3: Concurrent Cashier handover: exactly 1 succeeds (200), other receives 409 Conflict',
      `Statuses: ${colRes1.status}, ${colRes2.status}`);

    // SCENARIO 4: Repeated order cancellation does not double-restore credits
    // Seed 1 order with applied credit redemption
    const [canLot] = await pool.query(
      `INSERT INTO meal_credits (sponsorship_id, beneficiary_user_id, initial_value, balance, status, expires_at, created_at, updated_at)
       VALUES (?, NULL, 40.00, 0.00, 'Depleted', DATE_ADD(NOW(), INTERVAL 30 DAY), NOW(), NOW())`,
      [testSponId]
    );
    const [canOrder] = await pool.query(
      `INSERT INTO orders (user_id, pickup_date, pickup_slot, total_amount, discount_amount, final_amount, payment_status, status)
       VALUES (?, ?, '12:00 PM - 12:30 PM', 40.00, 40.00, 0.00, 'Paid', 'Pending')`,
      [student1Id, tomorrow]
    );
    await pool.query(
      `INSERT INTO credit_redemptions (order_id, credit_id, amount_redeemed, status)
       VALUES (?, ?, 40.00, 'Active')`,
      [canOrder.insertId, canLot.insertId]
    );

    const firstCancel = await student1Client.patch(`/api/student/orders/${canOrder.insertId}/cancel`);
    const secondCancel = await student1Client.patch(`/api/student/orders/${canOrder.insertId}/cancel`);

    assert(firstCancel.status === 200 && secondCancel.status === 409,
      'C4: Order cancellation: first attempt succeeds (200), duplicate attempt rejected (409)');

    const [finalLotBal] = await pool.query('SELECT balance FROM meal_credits WHERE credit_id = ?', [canLot.insertId]);
    assert(Number(finalLotBal[0].balance) === 40.00,
      'C4b: Credit lot restored exactly once (₹40.00), zero double-restoration');

    // SCENARIO 5: Expired donation claiming attempt is rejected
    const [expDon] = await pool.query(
      `INSERT INTO donations (food_batch_id, quantity, claimed_quantity, status, collection_deadline, donated_at)
       VALUES (?, 10, 0, 'Available', DATE_SUB(NOW(), INTERVAL 1 HOUR), NOW())`,
      [raceBatch.insertId]
    );
    const expClaimRes = await ngo1Client.post(`/api/ngo/donations/${expDon.insertId}/claims`, { quantity: 5 });
    assert(expClaimRes.status === 409,
      'C5: Claim on expired donation offer rejected with 409 Conflict');

  } finally {
    await new Promise((resolve) => server.close(resolve));
    console.log('\n✓ Test server shut down cleanly.');
  }

  console.log('\n================================================================');
  console.log(` AUDIT TEST SUITE RESULTS: ${passed} PASSED, ${failed} FAILED, ${skipped} SKIPPED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runEndToEndIntegrationAudit().catch((err) => {
  console.error('FATAL AUDIT TEST SUITE ERROR:', err);
  process.exit(1);
});
