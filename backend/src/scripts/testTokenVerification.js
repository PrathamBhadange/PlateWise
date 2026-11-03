/* global process */
import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

const BASE_URL = `http://localhost:${process.env.PORT || 5000}/api`;

let passed = 0;
let failed = 0;

function assert(condition, message, details = '') {
  if (condition) {
    passed++;
    console.log(`  ✓ [PASSED] ${message} ${details ? '(' + details + ')' : ''}`);
  } else {
    failed++;
    console.error(`  ✗ [FAILED] ${message} ${details ? '(' + details + ')' : ''}`);
  }
}

async function loginUser(email, password, loginAs = null) {
  const client = axios.create({
    baseURL: BASE_URL,
    validateStatus: () => true,
    withCredentials: true,
  });

  const body = { email, password };
  if (loginAs) body.login_as = loginAs;

  const res = await client.post('/auth/login', body);
  const cookieHeaders = res.headers['set-cookie'] || [];

  let csrfToken = null;
  for (const c of cookieHeaders) {
    if (c.startsWith('csrf_token=')) {
      csrfToken = c.split(';')[0].replace('csrf_token=', '');
    }
  }

  const authenticatedClient = axios.create({
    baseURL: BASE_URL,
    validateStatus: () => true,
    withCredentials: true,
    headers: {
      Cookie: cookieHeaders.map((c) => c.split(';')[0]).join('; '),
      ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
    },
  });

  return { res, client: authenticatedClient, csrfToken };
}

async function runTests() {
  console.log('================================================================================');
  console.log(' PlateWise Cashier Token Verification & Handover Test Suite');
  console.log('================================================================================\n');

  try {
    // 1. Authenticate Cashier
    console.log('[Phase 1] Cashier Authentication');
    const cashierAuth = await loginUser('cashier@platewise.campus', 'Cashier@123');
    assert(
      cashierAuth.res.status === 200 && cashierAuth.res.data?.user?.role === 'cashier',
      'Cashier logs in successfully',
      `role: ${cashierAuth.res.data?.user?.role}`
    );

    // 2. Token Verification: Formatted Token (#B-25)
    console.log('\n[Phase 2] Token Verification: #B-25 Resolution');
    const resB25 = await cashierAuth.client.get('/cashier/verify/' + encodeURIComponent('#B-25'));
    assert(
      resB25.status === 200 && resB25.data?.order_id === 125,
      'Verifies token "#B-25" -> resolves to Order #125',
      `status: ${resB25.status}, order_id: ${resB25.data?.order_id}, token: ${resB25.data?.token}`
    );

    // 3. Token Verification without hash (B-25)
    const resB25NoHash = await cashierAuth.client.get('/cashier/verify/B-25');
    assert(
      resB25NoHash.status === 200 && resB25NoHash.data?.order_id === 125,
      'Verifies token "B-25" without "#" -> resolves to Order #125',
      `status: ${resB25NoHash.status}, order_id: ${resB25NoHash.data?.order_id}`
    );

    // 4. Token Verification lowercase (b-25)
    const resB25Lower = await cashierAuth.client.get('/cashier/verify/b-25');
    assert(
      resB25Lower.status === 200 && resB25Lower.data?.order_id === 125,
      'Verifies token "b-25" (lowercase) -> resolves to Order #125',
      `status: ${resB25Lower.status}, order_id: ${resB25Lower.data?.order_id}`
    );

    // 5. Token Verification raw numeric order ID (125)
    const res125 = await cashierAuth.client.get('/cashier/verify/125');
    assert(
      res125.status === 200 && res125.data?.order_id === 125,
      'Verifies raw numeric order ID "125" -> resolves to Order #125',
      `status: ${res125.status}, order_id: ${res125.data?.order_id}`
    );

    // 6. Token Verification raw numeric order ID with hash (#125)
    const res125Hash = await cashierAuth.client.get('/cashier/verify/' + encodeURIComponent('#125'));
    assert(
      res125Hash.status === 200 && res125Hash.data?.order_id === 125,
      'Verifies order ID with hash "#125" -> resolves to Order #125',
      `status: ${res125Hash.status}, order_id: ${res125Hash.data?.order_id}`
    );

    // 7. Token Verification: Ready order (#B-11 -> order 111)
    console.log('\n[Phase 3] Ready Order Verification & Handover State');
    // Ensure order 111 is Ready
    await pool.query("UPDATE orders SET status = 'Ready' WHERE order_id = 111");

    const resB11 = await cashierAuth.client.get('/cashier/verify/' + encodeURIComponent('#B-11'));
    assert(
      resB11.status === 200 && resB11.data?.order_id === 111 && resB11.data?.eligible === true,
      'Verifies token "#B-11" -> Order #111 in Ready status is eligible for handover',
      `status: ${resB11.data?.status}, eligible: ${resB11.data?.eligible}`
    );

    // 8. Handover attempt on non-Ready order (Order 125 is Collected)
    console.log('\n[Phase 4] Handover State Machine Enforcement');
    const resHandoverCollected = await cashierAuth.client.patch('/cashier/orders/125/handover');
    assert(
      resHandoverCollected.status === 409,
      'Handover rejected for already "Collected" order with 409 Conflict',
      `status: ${resHandoverCollected.status}, message: ${resHandoverCollected.data?.message}`
    );

    // 9. Valid Handover: Order 111 (Ready -> Collected)
    const resHandoverReady = await cashierAuth.client.patch('/cashier/orders/111/handover');
    assert(
      resHandoverReady.status === 200 && resHandoverReady.data?.status === 'Collected',
      'Handover succeeds for "Ready" order -> transitioned to "Collected"',
      `status: ${resHandoverReady.status}, new_status: ${resHandoverReady.data?.status}`
    );

    // 10. Verify order 111 in database is Collected
    const [db111] = await pool.query('SELECT status FROM orders WHERE order_id = 111');
    assert(
      db111[0]?.status === 'Collected',
      'Database confirms Order #111 status updated to "Collected"',
      `db status: ${db111[0]?.status}`
    );

    // 11. Repeat handover on order 111 -> must fail now
    const resHandoverRepeat = await cashierAuth.client.patch('/cashier/orders/111/handover');
    assert(
      resHandoverRepeat.status === 409,
      'Repeat handover on newly "Collected" order rejected with 409 Conflict',
      `status: ${resHandoverRepeat.status}`
    );

    // Reset order 111 back to 'Ready' so system stays in clean testing state
    await pool.query("UPDATE orders SET status = 'Ready' WHERE order_id = 111");

    // 12. Token Verification: Invalid token format
    console.log('\n[Phase 5] Error Handling for Invalid & Non-Existent Tokens');
    const resInvalid = await cashierAuth.client.get('/cashier/verify/INVALID-TOKEN-FORMAT');
    assert(
      resInvalid.status === 404,
      'Invalid token format string returns 404',
      `status: ${resInvalid.status}, error: ${resInvalid.data?.error}`
    );

    // 13. Token Verification: Non-existent order
    const resNonExistent = await cashierAuth.client.get('/cashier/verify/' + encodeURIComponent('#Z-99'));
    assert(
      resNonExistent.status === 404,
      'Non-existent order token "#Z-99" returns 404 Order Not Found',
      `status: ${resNonExistent.status}, error: ${resNonExistent.data?.error}`
    );

    // 14. Cashier Orders list returns orders with tokens
    console.log('\n[Phase 6] Cashier Orders List & Token Population');
    const resOrders = await cashierAuth.client.get('/cashier/orders?date=all');
    assert(
      resOrders.status === 200 && Array.isArray(resOrders.data) && resOrders.data.length > 0,
      'Cashier can fetch all orders with tokens',
      `count: ${resOrders.data?.length}, sample token: ${resOrders.data[0]?.token}`
    );

    console.log('\n================================================================================');
    console.log(` Summary: ${passed} Passed, ${failed} Failed`);
    console.log('================================================================================\n');

    process.exit(failed > 0 ? 1 : 0);
  } catch (error) {
    console.error('Test run failed with error:', error);
    process.exit(1);
  }
}

runTests();
