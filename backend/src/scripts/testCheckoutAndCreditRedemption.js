/* global process */
/**
 * PlateWise Phase 3C.3 Checkout Integration & Meal Credit Redemption Test Suite
 * Validates all 17 mandatory functional, financial, lifecycle, ledger, concurrency,
 * and regression requirements against isolated test database platewise_test_db.
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
const { DEFAULT_MEAL_UNIT_PRICE } = await import('../config/sponsorshipConfig.js');

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
  console.log(' PlateWise Phase 3C.3 Checkout Integration & Credit Redemption Test Suite');
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

  const createdOrderIds = [];
  const createdSponsorshipIds = [];
  const createdCreditIds = [];

  const TEST_DATE = '2099-12-05';
  const TEST_SLOT = '12:30 PM - 01:00 PM';

  try {
    // 0. Authenticate test personas
    console.log('[Setup] Logging in test personas...');
    const student1Auth = await loginUser(baseUrl, 'aarav.sharma@campus.edu', 'Student@123', 'student');
    const student2Auth = await loginUser(baseUrl, 'ananya.verma@campus.edu', 'Student@123', 'student');
    const adminAuth = await loginUser(baseUrl, 'admin@platewise.campus', 'Admin@123', 'admin');

    assert(student1Auth.res.status === 200, 'Student 1 logs in successfully');
    assert(student2Auth.res.status === 200, 'Student 2 logs in successfully');
    assert(adminAuth.res.status === 200, 'Admin logs in successfully');

    // Clean up old test data from test db to ensure a known baseline
    await pool.query('DELETE FROM credit_ledger_entries WHERE credit_id IN (SELECT credit_id FROM meal_credits WHERE sponsorship_id > 0)');
    await pool.query('DELETE FROM credit_redemptions WHERE credit_id IN (SELECT credit_id FROM meal_credits WHERE sponsorship_id > 0)');
    await pool.query('DELETE FROM meal_credits WHERE sponsorship_id > 0');
    await pool.query('DELETE FROM payments WHERE sponsorship_id > 0 OR order_id > 0');
    await pool.query('DELETE FROM meal_sponsorships WHERE sponsorship_id > 0');
    await pool.query('DELETE FROM order_items WHERE order_id IN (SELECT order_id FROM orders WHERE pickup_date = ?)', [TEST_DATE]);
    await pool.query('DELETE FROM orders WHERE pickup_date = ?', [TEST_DATE]);
    console.log('[Setup] Cleaned up test database baseline\n');

    // Helper: Mint community credits by creating and paying a sponsorship
    async function seedCommunityCredits(mealsCount = 4) {
      const amount = mealsCount * DEFAULT_MEAL_UNIT_PRICE;
      const sponRes = await student1Auth.client.post('/student/sponsorships', {
        amount,
        meals_funded: mealsCount,
        message: 'Test community credit funding',
        payment_method: 'upi_simulated',
      });
      const sponId = sponRes.data.sponsorship.sponsorship_id;
      createdSponsorshipIds.push(sponId);

      const payRes = await student1Auth.client.post(`/student/sponsorships/${sponId}/pay`, {
        payment_method: 'upi_simulated',
      });
      createdCreditIds.push(payRes.data.credit.credit_id);
      return payRes.data.credit;
    }

    // Helper: Place student order and clear double-submit window for automated testing
    async function placeOrder(authClient, payload) {
      const res = await authClient.post('/student/orders', payload);
      if (res.data?.order_id) {
        createdOrderIds.push(res.data.order_id);
        // Backdate order_date by 10s so rapid automated assertions are not blocked by the 5s window
        await pool.query(
          'UPDATE orders SET order_date = DATE_SUB(NOW(), INTERVAL 10 SECOND) WHERE order_id = ?',
          [res.data.order_id]
        );
      }
      return res;
    }

    // Seed 4 community meal credits (₹160.00 value)
    console.log('[Setup] Seeding initial Open Community Pool credits (4 meals = ₹160.00)...');
    await seedCommunityCredits(4);

    const initialPoolCheck = await student1Auth.client.get('/student/credits/available');
    assert(
      initialPoolCheck.status === 200 &&
        initialPoolCheck.data.meals_available >= 4 &&
        initialPoolCheck.data.available_pool_balance >= 160.0,
      'Initial open community pool contains at least 4 meals (₹160.00)',
      `available: ${initialPoolCheck.data.meals_available} meals, ₹${initialPoolCheck.data.available_pool_balance}`
    );

    // -------------------------------------------------------------------------
    // TEST 1: Checkout without credit redemption (Full payment with cash/upi)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 1: Checkout without credit redemption ---');
    // Item 2: Crispy Samosa (₹20) x 4 = ₹80.00
    const resNoCredit = await placeOrder(student1Auth.client, {
      items: [{ menu_item_id: 2, quantity: 4 }],
      pickup_slot: TEST_SLOT,
      pickup_date: TEST_DATE,
      payment_method: 'upi_simulated',
      redeem_credits: 0,
      idempotency_key: `chk_c1_${Date.now()}`,
    });

    assert(
      resNoCredit.status === 201 && resNoCredit.data.order_id,
      'Order placed without credit redemption returns HTTP 201',
      `Order #${resNoCredit.data.order_id}`
    );
    const order1Id = resNoCredit.data.order_id;

    const [order1Db] = await pool.query('SELECT * FROM orders WHERE order_id = ?', [order1Id]);
    assert(
      Number(order1Db[0].total_amount) === 80.0 &&
        Number(order1Db[0].discount_amount) === 0.0 &&
        Number(order1Db[0].final_amount) === 80.0 &&
        order1Db[0].payment_status === 'Paid',
      'Database verifies total_amount=₹80, discount_amount=₹0, final_amount=₹80, payment_status=Paid'
    );

    const [pay1Db] = await pool.query('SELECT * FROM payments WHERE order_id = ?', [order1Id]);
    assert(
      pay1Db.length === 1 &&
        Number(pay1Db[0].amount) === 80.0 &&
        pay1Db[0].status === 'Completed',
      'Payments table records single completed payment row of ₹80.00'
    );

    const [red1Db] = await pool.query('SELECT * FROM credit_redemptions WHERE order_id = ?', [order1Id]);
    assert(red1Db.length === 0, 'Zero credit_redemptions recorded for order without credits');

    // -------------------------------------------------------------------------
    // TEST 2: Checkout with partial credit redemption
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 2: Checkout with partial credit redemption ---');
    // Item 2: Crispy Samosa (₹20) x 6 = ₹120.00. Redeem 1 credit (₹40.00). Remaining payable: ₹80.00.
    const resPartial = await placeOrder(student1Auth.client, {
      items: [{ menu_item_id: 2, quantity: 6 }],
      pickup_slot: TEST_SLOT,
      pickup_date: TEST_DATE,
      redeem_credits: 1,
      payment_method: 'upi_simulated',
      idempotency_key: `chk_c2_${Date.now()}`,
    });

    assert(
      resPartial.status === 201 && resPartial.data.order_id,
      'Order placed with partial credit redemption returns HTTP 201',
      `Order #${resPartial.data.order_id}`
    );
    const order2Id = resPartial.data.order_id;

    const [order2Db] = await pool.query('SELECT * FROM orders WHERE order_id = ?', [order2Id]);
    assert(
      Number(order2Db[0].total_amount) === 120.0 &&
        Number(order2Db[0].discount_amount) === 40.0 &&
        Number(order2Db[0].final_amount) === 80.0 &&
        order2Db[0].payment_status === 'Paid',
      'Database verifies subtotal ₹120, credit discount ₹40, final payable ₹80'
    );

    const [red2Db] = await pool.query('SELECT * FROM credit_redemptions WHERE order_id = ?', [order2Id]);
    assert(
      red2Db.length === 1 &&
        Number(red2Db[0].amount_redeemed) === 40.0 &&
        red2Db[0].status === 'Active',
      'Credit redemptions table records 1 Active redemption of ₹40.00'
    );

    const [led2Db] = await pool.query(
      'SELECT * FROM credit_ledger_entries WHERE order_id = ? AND entry_type = "REDEMPTION"',
      [order2Id]
    );
    assert(
      led2Db.length === 1 &&
        Number(led2Db[0].amount) === 40.0 &&
        led2Db[0].idempotency_key === `REDEMPTION-ORD-${order2Id}-CRED-${red2Db[0].credit_id}`,
      'Credit ledger entries logs immutable REDEMPTION entry with deterministic idempotency key'
    );

    const [pay2Db] = await pool.query('SELECT * FROM payments WHERE order_id = ?', [order2Id]);
    assert(
      pay2Db.length === 1 &&
        Number(pay2Db[0].amount) === 80.0 &&
        pay2Db[0].status === 'Completed',
      'Payments table records ₹80.00 (the remaining payable amount after ₹40 credit discount)'
    );

    // -------------------------------------------------------------------------
    // TEST 3: Checkout with full credit redemption (100% funded)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 3: Checkout with full credit redemption (100% covered) ---');
    // Item 2: Crispy Samosa (₹20) x 4 = ₹80.00. Redeem 2 credits (₹80.00). Remaining payable: ₹0.00.
    const resFull = await placeOrder(student1Auth.client, {
      items: [{ menu_item_id: 2, quantity: 4 }],
      pickup_slot: TEST_SLOT,
      pickup_date: TEST_DATE,
      redeem_credits: 2,
      idempotency_key: `chk_c3_${Date.now()}`,
    });

    assert(
      resFull.status === 201 && resFull.data.order_id,
      'Order 100% funded with meal credits returns HTTP 201',
      `Order #${resFull.data.order_id}`
    );
    const order3Id = resFull.data.order_id;
    createdOrderIds.push(order3Id);

    const [order3Db] = await pool.query('SELECT * FROM orders WHERE order_id = ?', [order3Id]);
    assert(
      Number(order3Db[0].total_amount) === 80.0 &&
        Number(order3Db[0].discount_amount) === 80.0 &&
        Number(order3Db[0].final_amount) === 0.0 &&
        order3Db[0].payment_status === 'Paid' &&
        order3Db[0].payment_method === 'credit_funded',
      'Database verifies total_amount=₹80, discount=₹80, final_amount=₹0, payment_method=credit_funded'
    );

    // Rule: Zero-payable order must NOT create an unnecessary external payment row
    const [pay3Db] = await pool.query('SELECT * FROM payments WHERE order_id = ?', [order3Id]);
    assert(
      pay3Db.length === 0,
      'Zero external payments rows created for 100% credit-funded order (chk_payment_amount > 0 preserved)'
    );

    // -------------------------------------------------------------------------
    // TEST 4: Redemption exceeding available community credit balance
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 4: Redemption exceeding available community credit balance ---');
    const poolStateBefore = await student1Auth.client.get('/student/credits/available');
    const availableMeals = poolStateBefore.data.meals_available;

    const resOverClaim = await student1Auth.client.post('/student/orders', {
      items: [{ menu_item_id: 2, quantity: 20 }], // subtotal ₹400
      pickup_slot: TEST_SLOT,
      pickup_date: TEST_DATE,
      redeem_credits: availableMeals + 5, // exceeds pool
      idempotency_key: `chk_c4_${Date.now()}`,
    });

    assert(
      resOverClaim.status === 400 || resOverClaim.status === 409,
      'Redemption exceeding available pool balance is rejected with 400 or 409',
      `HTTP ${resOverClaim.status}: ${resOverClaim.data.error || resOverClaim.data.message}`
    );

    // -------------------------------------------------------------------------
    // TEST 5: Redemption exceeding eligible order value
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 5: Redemption exceeding eligible order value ---');
    // Item 4: Masala Dosa (₹50) x 1 = ₹50.00. Max eligible credits is floor(50/40) = 1 credit.
    // Client requests 2 credits (₹80 > ₹50).
    const resOverOrder = await student1Auth.client.post('/student/orders', {
      items: [{ menu_item_id: 4, quantity: 1 }],
      pickup_slot: TEST_SLOT,
      pickup_date: TEST_DATE,
      redeem_credits: 2,
      idempotency_key: `chk_c5_${Date.now()}`,
    });

    assert(
      resOverOrder.status === 400,
      'Redemption exceeding eligible order value (subtotal ₹50 vs 2 credits ₹80) rejected with HTTP 400',
      `HTTP ${resOverOrder.status}: ${resOverOrder.data.error || resOverOrder.data.message}`
    );

    // -------------------------------------------------------------------------
    // TEST 6: Invalid or negative redemption quantity
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 6: Invalid or negative redemption quantity ---');
    const resNeg = await student1Auth.client.post('/student/orders', {
      items: [{ menu_item_id: 2, quantity: 2 }],
      pickup_slot: TEST_SLOT,
      pickup_date: TEST_DATE,
      redeem_credits: -2,
    });
    assert(
      resNeg.status === 400,
      'Negative credit redemption quantity rejected with HTTP 400',
      `HTTP ${resNeg.status}`
    );

    const resString = await student1Auth.client.post('/student/orders', {
      items: [{ menu_item_id: 2, quantity: 2 }],
      pickup_slot: TEST_SLOT,
      pickup_date: TEST_DATE,
      redeem_credits: 'two_credits',
    });
    assert(
      resString.status === 400,
      'Non-numeric credit redemption quantity rejected with HTTP 400',
      `HTTP ${resString.status}`
    );

    // -------------------------------------------------------------------------
    // TEST 7: Client attempts to manipulate order subtotal, discount or final amount
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 7: Client attempts to manipulate financial amounts ---');
    // Client sends fake discount_amount: 500, final_amount: 1, total_amount: 10
    const resHacked = await placeOrder(student1Auth.client, {
      items: [{ menu_item_id: 2, quantity: 2 }], // actual DB subtotal: 20 * 2 = ₹40.00
      pickup_slot: TEST_SLOT,
      pickup_date: TEST_DATE,
      total_amount: 10.0,
      discount_amount: 500.0,
      final_amount: 1.0,
      redeem_credits: 1, // legitimate 1 credit = ₹40.00
      idempotency_key: `chk_c7_${Date.now()}`,
    });

    assert(
      resHacked.status === 201 && resHacked.data.order_id,
      'Order succeeds with server re-computing authoritative figures from database',
      `Order #${resHacked.data.order_id}`
    );
    const order7Id = resHacked.data.order_id;

    const [order7Db] = await pool.query('SELECT * FROM orders WHERE order_id = ?', [order7Id]);
    assert(
      Number(order7Db[0].total_amount) === 40.0 &&
        Number(order7Db[0].discount_amount) === 40.0 &&
        Number(order7Db[0].final_amount) === 0.0,
      'Backend completely disregarded client-submitted financial tampering (total ₹40, discount ₹40, final ₹0)'
    );

    // -------------------------------------------------------------------------
    // TEST 8: Duplicate checkout submission (Idempotency)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 8: Duplicate checkout submission rejected ---');
    const dupeKey = `order_dupe_${Date.now()}`;
    const resDupe1 = await placeOrder(student1Auth.client, {
      items: [{ menu_item_id: 2, quantity: 2 }],
      pickup_slot: TEST_SLOT,
      pickup_date: TEST_DATE,
      idempotency_key: dupeKey,
    });

    const resDupe2 = await student1Auth.client.post('/student/orders', {
      items: [{ menu_item_id: 2, quantity: 2 }],
      pickup_slot: TEST_SLOT,
      pickup_date: TEST_DATE,
      idempotency_key: dupeKey,
    });
    assert(
      resDupe2.status === 409,
      'Duplicate submission with identical idempotency_key is rejected with HTTP 409',
      `HTTP ${resDupe2.status}`
    );

    // -------------------------------------------------------------------------
    // TEST 9: Duplicate redemption prevention
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 9: Duplicate redemption prevention ---');
    // Ensure that each order item redemption generates exactly one immutable ledger entry
    const [redLedgerCount] = await pool.query(
      'SELECT COUNT(*) AS count FROM credit_ledger_entries WHERE order_id = ? AND entry_type = "REDEMPTION"',
      [order2Id]
    );
    assert(
      redLedgerCount[0].count === 1,
      'Exactly 1 REDEMPTION ledger entry exists for Order #2; zero duplicate deductions'
    );

    // -------------------------------------------------------------------------
    // TEST 10: Concurrent redemption attempts against the same credit balance
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 10: Concurrent redemption attempts (Row locking) ---');
    // Seed exactly 1 meal credit (₹40.00)
    await seedCommunityCredits(1);

    const poolCheckBeforeRace = await student1Auth.client.get('/student/credits/available');
    const exactCreditsAvailable = poolCheckBeforeRace.data.meals_available;

    // Fire 2 simultaneous checkout requests each attempting to redeem the available credit
    console.log(`  Firing 2 simultaneous checkouts for ${exactCreditsAvailable} available credit(s)...`);
    const [raceRes1, raceRes2] = await Promise.all([
      placeOrder(student1Auth.client, {
        items: [{ menu_item_id: 2, quantity: 2 }], // ₹40
        pickup_slot: TEST_SLOT,
        pickup_date: TEST_DATE,
        redeem_credits: exactCreditsAvailable,
        idempotency_key: `race_1_${Date.now()}`,
      }),
      placeOrder(student2Auth.client, {
        items: [{ menu_item_id: 2, quantity: 2 }], // ₹40
        pickup_slot: TEST_SLOT,
        pickup_date: TEST_DATE,
        redeem_credits: exactCreditsAvailable,
        idempotency_key: `race_2_${Date.now()}`,
      }),
    ]);

    const statuses = [raceRes1.status, raceRes2.status];
    const hasOne201 = statuses.filter((s) => s === 201).length === 1;
    const hasOneError = statuses.some((s) => s === 400 || s === 409);

    assert(
      hasOne201 && hasOneError,
      'Row locking guarantees exactly 1 concurrent order succeeds and 1 is rejected without double spending',
      `Statuses: ${raceRes1.status}, ${raceRes2.status}`
    );

    // -------------------------------------------------------------------------
    // TEST 11: Failed payment does not permanently consume credits
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 11: Failed payment does not permanently consume credits ---');
    // Seed 1 credit
    await seedCommunityCredits(1);
    const poolBeforeFail = await student1Auth.client.get('/student/credits/available');
    const balanceBeforeFail = poolBeforeFail.data.available_pool_balance;

    // Place order with payment_method: 'declined_simulated'
    const resDeclined = await placeOrder(student1Auth.client, {
      items: [{ menu_item_id: 2, quantity: 4 }], // ₹80
      pickup_slot: TEST_SLOT,
      pickup_date: TEST_DATE,
      redeem_credits: 1, // ₹40 discount, ₹40 remaining payable
      payment_method: 'declined_simulated',
      idempotency_key: `fail_pay_${Date.now()}`,
    });

    assert(
      resDeclined.status === 402 || resDeclined.status === 400,
      'Order with declined simulated payment rejected and rolled back',
      `HTTP ${resDeclined.status}: ${resDeclined.data.error || resDeclined.data.message}`
    );

    const poolAfterFail = await student1Auth.client.get('/student/credits/available');
    assert(
      poolAfterFail.data.available_pool_balance === balanceBeforeFail,
      'Community pool balance completely untouched after payment failure (zero orphaned deduction)',
      `balance: ₹${poolAfterFail.data.available_pool_balance}`
    );

    // -------------------------------------------------------------------------
    // TEST 12: Pending payment handling
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 12: Pending payment handling ---');
    // Seed 1 credit
    await seedCommunityCredits(1);

    const resPending = await placeOrder(student1Auth.client, {
      items: [{ menu_item_id: 2, quantity: 4 }], // ₹80
      pickup_slot: TEST_SLOT,
      pickup_date: TEST_DATE,
      redeem_credits: 1, // ₹40 discount, ₹40 remaining payable
      payment_method: 'cash_on_pickup',
      idempotency_key: `chk_pend_${Date.now()}`,
    });

    assert(
      resPending.status === 201 && resPending.data.order_id,
      'Order with cash_on_pickup placed successfully',
      `Order #${resPending.data.order_id}`
    );
    const orderPendId = resPending.data.order_id;

    const [orderPendDb] = await pool.query('SELECT * FROM orders WHERE order_id = ?', [orderPendId]);
    assert(
      orderPendDb[0].payment_status === 'Pending',
      'Order payment_status is correctly marked as Pending'
    );

    const [payPendDb] = await pool.query('SELECT * FROM payments WHERE order_id = ?', [orderPendId]);
    assert(
      payPendDb.length === 1 && payPendDb[0].status === 'Pending' && Number(payPendDb[0].amount) === 40.0,
      'Payments table contains Pending payment of ₹40.00'
    );

    // -------------------------------------------------------------------------
    // TEST 13: Consistent financial records on successful checkout
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 13: Financial record consistency across all tables ---');
    const [allRedemptions] = await pool.query(
      `SELECT r.redemption_id, r.order_id, r.credit_id, r.amount_redeemed,
              o.total_amount, o.discount_amount, o.final_amount
       FROM credit_redemptions r
       JOIN orders o ON r.order_id = o.order_id
       WHERE o.order_id = ?`,
      [order2Id]
    );
    assert(
      allRedemptions.length > 0 &&
        Number(allRedemptions[0].discount_amount) === Number(allRedemptions[0].amount_redeemed),
      'credit_redemptions amount matches orders.discount_amount perfectly'
    );

    // -------------------------------------------------------------------------
    // TEST 14: Zero-payable checkout auditing
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 14: Zero-payable checkout auditing ---');
    const studentOrdersRes = await student1Auth.client.get('/student/orders');
    const zeroOrder = (studentOrdersRes.data || []).find((o) => o.order_id === order3Id);
    assert(
      zeroOrder &&
        Number(zeroOrder.discount_amount) === 80.0 &&
        Number(zeroOrder.final_amount) === 0.0 &&
        zeroOrder.payment_method === 'credit_funded',
      'Student orders feed correctly reflects 100% credit-funded order'
    );

    // -------------------------------------------------------------------------
    // TEST 15: Order cancellation restores community credits
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 15: Order cancellation restores community credits ---');
    const poolBeforeCancel = await student1Auth.client.get('/student/credits/available');
    const balanceBeforeCancel = poolBeforeCancel.data.available_pool_balance;

    const cancelRes = await student1Auth.client.patch(`/student/orders/${orderPendId}/cancel`);
    assert(
      cancelRes.status === 200 && cancelRes.data.status === 'Cancelled',
      'Order cancelled successfully via PATCH /orders/:id/cancel',
      `HTTP ${cancelRes.status}`
    );

    const poolAfterCancel = await student1Auth.client.get('/student/credits/available');
    assert(
      poolAfterCancel.data.available_pool_balance === balanceBeforeCancel + 40.0,
      'Community pool balance restored by exactly ₹40.00 upon order cancellation',
      `new balance: ₹${poolAfterCancel.data.available_pool_balance}`
    );

    const [revLedger] = await pool.query(
      'SELECT * FROM credit_ledger_entries WHERE order_id = ? AND entry_type = "REVERSAL"',
      [orderPendId]
    );
    assert(
      revLedger.length === 1 &&
        Number(revLedger[0].amount) === 40.0 &&
        revLedger[0].idempotency_key === `REVERSAL-ORD-${orderPendId}-CRED-${revLedger[0].credit_id}`,
      'REVERSAL ledger entry recorded with deterministic idempotency key'
    );

    const [revRedemption] = await pool.query(
      'SELECT status FROM credit_redemptions WHERE order_id = ?',
      [orderPendId]
    );
    assert(
      revRedemption[0].status === 'Reversed',
      'credit_redemptions status transitioned to Reversed'
    );

    // -------------------------------------------------------------------------
    // TEST 16: Repeated cancellation does not restore credits twice
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 16: Repeated cancellation does not restore credits twice ---');
    const repeatCancelRes = await student1Auth.client.patch(`/student/orders/${orderPendId}/cancel`);
    assert(
      repeatCancelRes.status === 409,
      'Second cancellation attempt on already cancelled order is rejected with HTTP 409',
      `HTTP ${repeatCancelRes.status}`
    );

    const [repeatRevCount] = await pool.query(
      'SELECT COUNT(*) AS count FROM credit_ledger_entries WHERE order_id = ? AND entry_type = "REVERSAL"',
      [orderPendId]
    );
    assert(
      repeatRevCount[0].count === 1,
      'Exactly 1 REVERSAL ledger entry exists; zero duplicate credits restored'
    );

    // -------------------------------------------------------------------------
    // TEST 17: Expired credits cannot be redeemed
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 17: Expired credits cannot be redeemed ---');
    // Insert an expired credit lot
    const [expSponRes] = await pool.query(
      `INSERT INTO meal_sponsorships (sponsor_user_id, donor_name, total_amount, meal_unit_price, meals_funded, payment_status, is_anonymous, created_at)
       VALUES (?, 'Expired Donor', 40.00, 40.00, 1, 'Paid', 0, DATE_SUB(NOW(), INTERVAL 120 DAY))`,
      [student1Auth.user.user_id]
    );
    const expSponId = expSponRes.insertId;
    createdSponsorshipIds.push(expSponId);

    const [expCredRes] = await pool.query(
      `INSERT INTO meal_credits (sponsorship_id, beneficiary_user_id, initial_value, balance, status, expires_at, created_at, updated_at)
       VALUES (?, NULL, 40.00, 40.00, 'Active', DATE_SUB(NOW(), INTERVAL 10 DAY), DATE_SUB(NOW(), INTERVAL 120 DAY), NOW())`,
      [expSponId]
    );
    const expCreditId = expCredRes.insertId;
    createdCreditIds.push(expCreditId);

    // Drain all active non-expired credits so only the expired one exists
    await pool.query(
      `UPDATE meal_credits SET balance = 0.00, status = 'Depleted' WHERE credit_id != ? AND status = 'Active'`,
      [expCreditId]
    );

    const poolCheckExpiredOnly = await student1Auth.client.get('/student/credits/available');
    assert(
      poolCheckExpiredOnly.data.meals_available === 0 &&
        poolCheckExpiredOnly.data.available_pool_balance === 0,
      'Available pool endpoint completely filters out expired credit lot (0 meals available)'
    );

    const resTryRedeemExpired = await student1Auth.client.post('/student/orders', {
      items: [{ menu_item_id: 2, quantity: 2 }],
      pickup_slot: TEST_SLOT,
      pickup_date: TEST_DATE,
      redeem_credits: 1,
      idempotency_key: `chk_exp_${Date.now()}`,
    });

    assert(
      resTryRedeemExpired.status === 400 || resTryRedeemExpired.status === 409,
      'Attempt to redeem expired credit lot rejected with 400 or 409',
      `HTTP ${resTryRedeemExpired.status}`
    );

    // -------------------------------------------------------------------------
    // TEST 18: Server-authoritative checkout preview endpoint
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 18: Server-authoritative checkout preview ---');
    // Seed 2 credits to test preview with active available pool
    await seedCommunityCredits(2);

    const previewRes = await student1Auth.client.post('/student/orders/preview', {
      items: [
        { menu_item_id: 2, quantity: 3 }, // ₹60
        { menu_item_id: 4, quantity: 1 }, // ₹50 -> subtotal ₹110
      ],
      redeem_credits: 2, // 2 * 40 = ₹80 discount
    });

    assert(
      previewRes.status === 200,
      'POST /student/orders/preview responds with HTTP 200',
      `HTTP ${previewRes.status}`
    );
    assert(
      previewRes.data.subtotal === 110.0 &&
        previewRes.data.max_eligible_credits === 2 &&
        previewRes.data.credit_discount === 80.0 &&
        previewRes.data.remaining_payable === 30.0,
      'Preview returns accurate subtotal ₹110, max eligible 2, discount ₹80, payable ₹30'
    );

    // -------------------------------------------------------------------------
    // CLEANUP
    // -------------------------------------------------------------------------
    if (createdOrderIds.length > 0) {
      await pool.query('DELETE FROM credit_ledger_entries WHERE order_id IN (?)', [createdOrderIds]);
      await pool.query('DELETE FROM credit_redemptions WHERE order_id IN (?)', [createdOrderIds]);
      await pool.query('DELETE FROM payments WHERE order_id IN (?)', [createdOrderIds]);
      await pool.query('DELETE FROM order_items WHERE order_id IN (?)', [createdOrderIds]);
      await pool.query('DELETE FROM orders WHERE order_id IN (?)', [createdOrderIds]);
    }
    if (createdCreditIds.length > 0) {
      await pool.query('DELETE FROM credit_ledger_entries WHERE credit_id IN (?)', [createdCreditIds]);
      await pool.query('DELETE FROM credit_redemptions WHERE credit_id IN (?)', [createdCreditIds]);
      await pool.query('DELETE FROM meal_credits WHERE credit_id IN (?)', [createdCreditIds]);
    }
    if (createdSponsorshipIds.length > 0) {
      await pool.query('DELETE FROM payments WHERE sponsorship_id IN (?)', [createdSponsorshipIds]);
      await pool.query('DELETE FROM meal_sponsorships WHERE sponsorship_id IN (?)', [createdSponsorshipIds]);
    }
    console.log('\n[Cleanup] Test data cleanly pruned from database.');
  } finally {
    server.close();
  }

  // -------------------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------------------
  console.log('\n================================================================================');
  console.log(` Phase 3C.3 Test Suite Complete: ${passed} PASSED, ${failed} FAILED`);
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
