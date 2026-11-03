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
    baseURL: BASE_URL,
    validateStatus: () => true,
    withCredentials: true,
    headers: {
      Cookie: cookieHeaders.map(c => c.split(';')[0]).join('; '),
      ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
    },
  });

  return { res, client: authenticatedClient, authCookie, csrfToken };
}

async function runTests() {
  console.log('================================================================================');
  console.log(' PlateWise Cashier & NGO Integration Verification');
  console.log('================================================================================');

  try {
    // 1. Cashier Login
    const cashierAuth = await loginUser('cashier@platewise.campus', 'Cashier@123');
    assert(
      cashierAuth.res.status === 200 && cashierAuth.res.data?.user?.role === 'cashier',
      'Cashier login succeeds with correct credentials',
      `status: ${cashierAuth.res.status}, role: ${cashierAuth.res.data?.user?.role}`
    );

    // 2. Cashier Overview
    const cashierOverview = await cashierAuth.client.get('/cashier/overview');
    assert(
      cashierOverview.status === 200 && typeof cashierOverview.data.orders_served_today === 'number',
      'Cashier can fetch /cashier/overview metrics',
      `served: ${cashierOverview.data.orders_served_today}, sales: ₹${cashierOverview.data.total_sales_today}`
    );

    // 3. Cashier Orders List
    const cashierOrders = await cashierAuth.client.get('/cashier/orders?date=all');
    assert(
      cashierOrders.status === 200 && Array.isArray(cashierOrders.data) && cashierOrders.data.length > 0,
      'Cashier can fetch /cashier/orders list',
      `count: ${cashierOrders.data.length}`
    );

    // 4. Cashier Token Verification
    const sampleOrder = cashierOrders.data[0];
    const verifyRes = await cashierAuth.client.get(`/cashier/verify/${sampleOrder.order_id}`);
    assert(
      verifyRes.status === 200 && verifyRes.data.found === true && verifyRes.data.order_id === sampleOrder.order_id,
      'Cashier can verify valid token by order ID',
      `order_id: ${sampleOrder.order_id}, status: ${verifyRes.data.status}`
    );

    // Non-existent token lookup
    const verifyNotFound = await cashierAuth.client.get('/cashier/verify/999999');
    assert(
      verifyNotFound.status === 404 && verifyNotFound.data.found === false,
      'Non-existent token lookup returns 404',
      `status: ${verifyNotFound.status}`
    );

    // 5. Strict Handover State Machine: ONLY 'Ready' -> 'Collected'
    // Create or find an order that is NOT Ready (e.g. Preparing or Pending)
    await pool.query("UPDATE orders SET status = 'Preparing' WHERE order_id = ?", [sampleOrder.order_id]);
    const invalidHandover = await cashierAuth.client.patch(`/cashier/orders/${sampleOrder.order_id}/handover`);
    assert(
      invalidHandover.status === 409,
      'Cashier handover rejects order that is NOT Ready with 409 Conflict',
      `status: ${invalidHandover.status}, error: ${invalidHandover.data.error}`
    );

    // Now set order to 'Ready' and test valid handover
    await pool.query("UPDATE orders SET status = 'Ready' WHERE order_id = ?", [sampleOrder.order_id]);
    const validHandover = await cashierAuth.client.patch(`/cashier/orders/${sampleOrder.order_id}/handover`);
    assert(
      validHandover.status === 200 && validHandover.data.status === 'Collected',
      'Cashier handover transitions Ready order to Collected',
      `status: ${validHandover.status}, new status: ${validHandover.data.status}`
    );

    // 6. Role Isolation: Cashier vs Kitchen vs Student vs Admin
    const studentAuth = await loginUser('aarav.sharma@campus.edu', 'Student@123');
    const studentToCashier = await studentAuth.client.get('/cashier/overview');
    assert(
      studentToCashier.status === 403,
      'Student calling /api/cashier/* is rejected with 403 Forbidden',
      `status: ${studentToCashier.status}`
    );

    const kitchenAuth = await loginUser('kitchen@platewise.campus', 'Kitchen@123');
    const kitchenToCashier = await kitchenAuth.client.get('/cashier/overview');
    assert(
      kitchenToCashier.status === 403,
      'Kitchen staff calling /api/cashier/* is rejected with 403 Forbidden',
      `status: ${kitchenToCashier.status}`
    );

    const cashierToKitchen = await cashierAuth.client.get('/kitchen/overview');
    assert(
      cashierToKitchen.status === 403,
      'Cashier staff calling /api/kitchen/* is rejected with 403 Forbidden',
      `status: ${cashierToKitchen.status}`
    );

    const adminAuth = await loginUser('admin@platewise.campus', 'Admin@123');
    const adminToCashier = await adminAuth.client.get('/cashier/overview');
    const adminToKitchen = await adminAuth.client.get('/kitchen/overview');
    assert(
      adminToCashier.status === 200 && adminToKitchen.status === 200,
      'Admin has access to both /api/cashier/* and /api/kitchen/*',
      `cashier: ${adminToCashier.status}, kitchen: ${adminToKitchen.status}`
    );

    // 7. NGO Login
    const ngoAuth = await loginUser('ngo@platewise.org', 'Ngo@123');
    assert(
      ngoAuth.res.status === 200 && ngoAuth.res.data?.user?.role === 'ngo',
      'NGO login succeeds with correct credentials',
      `status: ${ngoAuth.res.status}, role: ${ngoAuth.res.data?.user?.role}`
    );

    // 8. NGO Overview & Donations
    const ngoOverview = await ngoAuth.client.get('/ngo/overview');
    assert(
      ngoOverview.status === 200 && typeof ngoOverview.data.available_portions === 'number',
      'NGO can fetch /ngo/overview statistics',
      `available portions: ${ngoOverview.data.available_portions}`
    );

    const ngoDonations = await ngoAuth.client.get('/ngo/donations');
    assert(
      ngoDonations.status === 200 && Array.isArray(ngoDonations.data) && ngoDonations.data.length > 0,
      'NGO can fetch /ngo/donations list',
      `donations count: ${ngoDonations.data.length}`
    );

    // 9. NGO Claiming an Available Donation
    // Ensure at least one donation is 'Available' and unexpired
    const targetDonation = ngoDonations.data.find(d => d.status === 'Available') || ngoDonations.data[0];
    await pool.query("UPDATE donations SET status = 'Available', claimed_by = NULL, claimed_at = NULL, collection_deadline = DATE_ADD(NOW(), INTERVAL 4 HOUR) WHERE donation_id = ?", [targetDonation.donation_id]);

    const claimRes = await ngoAuth.client.post(`/ngo/donations/${targetDonation.donation_id}/claim`);
    assert(
      claimRes.status === 200 && claimRes.data.status === 'Claimed',
      'NGO can claim an available surplus food donation batch',
      `donation_id: ${targetDonation.donation_id}, status: ${claimRes.data.status}`
    );

    // 10. Claim Conflict: claiming an already claimed batch rejects with 409
    const secondClaimRes = await ngoAuth.client.post(`/ngo/donations/${targetDonation.donation_id}/claim`);
    assert(
      secondClaimRes.status === 409,
      'Claiming an already claimed donation rejects with 409 Conflict',
      `status: ${secondClaimRes.status}`
    );

    // 11. Role Isolation: Student calling /api/ngo/* -> 403
    const studentToNgo = await studentAuth.client.get('/ngo/donations');
    assert(
      studentToNgo.status === 403,
      'Student calling /api/ngo/* is rejected with 403 Forbidden',
      `status: ${studentToNgo.status}`
    );

    // 12. Registration & Admin Approval Flow for Cashier and NGO
    const testCashierEmail = `test.cashier.${Date.now()}@platewise.campus`;
    const regCashier = await axios.post(`${BASE_URL}/auth/register`, {
      full_name: 'Test Cashier Candidate',
      email: testCashierEmail,
      password: 'Password@123',
      confirm_password: 'Password@123',
      account_type: 'cashier',
    }, { validateStatus: () => true });

    assert(
      regCashier.status === 201 && regCashier.data.user.role === 'cashier' && regCashier.data.user.account_status === 'pending',
      'Cashier registration starts with account_status: pending',
      `status: ${regCashier.status}, role: ${regCashier.data.user.role}, acct_status: ${regCashier.data.user.account_status}`
    );

    const testNgoEmail = `test.ngo.${Date.now()}@platewise.org`;
    const regNgo = await axios.post(`${BASE_URL}/auth/register`, {
      full_name: 'Test NGO Relief Foundation',
      email: testNgoEmail,
      password: 'Password@123',
      confirm_password: 'Password@123',
      account_type: 'ngo',
    }, { validateStatus: () => true });

    assert(
      regNgo.status === 201 && regNgo.data.user.role === 'ngo' && regNgo.data.user.account_status === 'pending',
      'NGO registration starts with account_status: pending',
      `status: ${regNgo.status}, role: ${regNgo.data.user.role}, acct_status: ${regNgo.data.user.account_status}`
    );

    // Pending login attempts rejected with 403
    const pendingCashierLogin = await loginUser(testCashierEmail, 'Password@123');
    assert(
      pendingCashierLogin.res.status === 403 && pendingCashierLogin.res.data.account_status === 'pending',
      'Pending cashier login is rejected with 403 Forbidden',
      `status: ${pendingCashierLogin.res.status}`
    );

    const pendingNgoLogin = await loginUser(testNgoEmail, 'Password@123');
    assert(
      pendingNgoLogin.res.status === 403 && pendingNgoLogin.res.data.account_status === 'pending',
      'Pending NGO login is rejected with 403 Forbidden',
      `status: ${pendingNgoLogin.res.status}`
    );

    // Admin approves pending cashier
    const approveCashier = await adminAuth.client.patch(`/admin/users/${regCashier.data.user.user_id}/approve`);
    assert(
      approveCashier.status === 200 && approveCashier.data.user.account_status === 'active',
      'Admin can approve pending cashier account',
      `status: ${approveCashier.status}, user_id: ${regCashier.data.user.user_id}`
    );

    // Admin approves pending NGO
    const approveNgo = await adminAuth.client.patch(`/admin/users/${regNgo.data.user.user_id}/approve`);
    assert(
      approveNgo.status === 200 && approveNgo.data.user.account_status === 'active',
      'Admin can approve pending NGO account',
      `status: ${approveNgo.status}, user_id: ${regNgo.data.user.user_id}`
    );

    // Approved accounts can now log in
    const activeCashierLogin = await loginUser(testCashierEmail, 'Password@123');
    assert(
      activeCashierLogin.res.status === 200 && activeCashierLogin.res.data.user.role === 'cashier',
      'Approved cashier can now log in successfully',
      `status: ${activeCashierLogin.res.status}`
    );

    const activeNgoLogin = await loginUser(testNgoEmail, 'Password@123');
    assert(
      activeNgoLogin.res.status === 200 && activeNgoLogin.res.data.user.role === 'ngo',
      'Approved NGO can now log in successfully',
      `status: ${activeNgoLogin.res.status}`
    );

    // Clean up temporary test accounts
    await pool.query('DELETE FROM users WHERE email IN (?, ?)', [testCashierEmail, testNgoEmail]);

    console.log('================================================================================');
    console.log(` Results Summary: ${passed} PASSED, ${failed} FAILED.`);
    console.log('================================================================================');

    if (failed > 0) {
      process.exitCode = 1;
    }
  } catch (err) {
    console.error('Test run failed with unhandled exception:', err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

runTests();
