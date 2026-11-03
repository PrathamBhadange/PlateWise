/* global process */
/**
 * PlateWise NGO Dashboard Enhancement Integration Test Suite
 * Tests all 10 core features:
 * 1. Live Surplus Food Marketplace (listing, filters, countdown, pure veg)
 * 2. Partial Donation Claims & Overclaiming Protection
 * 3. Collection Tracker (progress steps, verification codes)
 * 4. NGO Impact Analytics (real collected plates, daily trend, strict isolation)
 * 5. Database-backed NGO Notifications (delivery, read, mark-all-read)
 * 6. Live Synchronization endpoints & freshness
 * 7. Food Safety & Classification (Pure Vegetarian, preparation details)
 * 8. Organization Profile (get, update, privilege tampering protection)
 * 9. Cross-NGO Data Isolation & Privacy Guardrails
 * 10. Handover completion and lifecycle integrity
 *
 * Target: platewise_test_db ONLY
 */

process.env.DB_NAME = 'platewise_test_db';

import http from 'http';
import axios from 'axios';
import bcrypt from 'bcryptjs';

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

  let csrfToken = null;
  for (const c of cookieHeaders) {
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

  return { res, client: authenticatedClient, user: res.data?.user };
}

async function runNgoDashboardTests() {
  console.log('================================================================================');
  console.log(' PlateWise NGO Dashboard Enhancement Integration Test Suite');
  console.log(' Target Database: platewise_test_db');
  console.log('================================================================================');

  const [dbRow] = await pool.query('SELECT DATABASE() AS current_db');
  if (dbRow[0].current_db !== 'platewise_test_db') {
    throw new Error(`CRITICAL: Connected to ${dbRow[0].current_db}, expected platewise_test_db!`);
  }
  console.log(`[Safety Verified] Connected to isolated test database: ${dbRow[0].current_db}\n`);

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api`;
  console.log(`[Test Server] Ephemeral backend listening at: ${baseUrl}\n`);

  try {
    // 0. Setup and authenticate personas
    console.log('[Setup] Preparing test accounts and personas...');
    const pwdHash = await bcrypt.hash('Ngo@123', 10);

    // Setup NGO 1
    const ngo1Email = 'ngo@platewise.org';
    const [existingNgo1] = await pool.query('SELECT user_id FROM users WHERE email = ?', [ngo1Email]);
    if (existingNgo1.length === 0) {
      await pool.query(
        `INSERT INTO users (full_name, email, password_hash, role, account_status, organization_name, contact_person, phone_number, address)
         VALUES ('Feed The City NGO', ?, ?, 'ngo', 'active', 'Feed The City Foundation', 'Sarah Jenkins', '+91 98765 43210', '12 Hope Avenue, Metro City')`,
        [ngo1Email, pwdHash]
      );
    } else {
      await pool.query(
        `UPDATE users SET password_hash = ?, account_status = 'active', role = 'ngo',
         organization_name = 'Feed The City Foundation', contact_person = 'Sarah Jenkins',
         phone_number = '+91 98765 43210', address = '12 Hope Avenue, Metro City'
         WHERE email = ?`,
        [pwdHash, ngo1Email]
      );
    }

    // Setup NGO 2 (to test data isolation)
    const ngo2Email = 'ngo2@platewise.org';
    const [existingNgo2] = await pool.query('SELECT user_id FROM users WHERE email = ?', [ngo2Email]);
    if (existingNgo2.length === 0) {
      await pool.query(
        `INSERT INTO users (full_name, email, password_hash, role, account_status, organization_name, contact_person, phone_number, address)
         VALUES ('Roti Bank Relief', ?, ?, 'ngo', 'active', 'Roti Bank Relief Trust', 'Vikram Malhotra', '+91 98222 33445', '45 Community Lane, City')`,
        [ngo2Email, pwdHash]
      );
    } else {
      await pool.query(
        `UPDATE users SET password_hash = ?, account_status = 'active', role = 'ngo',
         organization_name = 'Roti Bank Relief Trust', contact_person = 'Vikram Malhotra',
         phone_number = '+91 98222 33445', address = '45 Community Lane, City'
         WHERE email = ?`,
        [pwdHash, ngo2Email]
      );
    }

    const kitchenAuth = await loginUser(baseUrl, 'kitchen@platewise.campus', 'Kitchen@123', 'kitchen');
    const ngo1Auth = await loginUser(baseUrl, ngo1Email, 'Ngo@123', 'ngo');
    const ngo2Auth = await loginUser(baseUrl, ngo2Email, 'Ngo@123', 'ngo');

    assert(kitchenAuth.res.status === 200, 'Kitchen staff authenticated successfully');
    assert(ngo1Auth.res.status === 200, 'NGO 1 authenticated successfully');
    assert(ngo2Auth.res.status === 200, 'NGO 2 authenticated successfully');

    // Create a fresh test batch for donation tests
    const [batchRes] = await pool.query(
      `INSERT INTO food_batches (menu_item_id, batch_date, cooked_qty, sold_qty, leftover_qty, status, meal_session, notes)
       VALUES (1, CURDATE(), 80, 0, 80, 'Active', 'Lunch', 'Freshly steamed canteen batch. Strictly vegetarian.')`
    );
    const testBatchId = batchRes.insertId;

    // Record baseline analytics for NGO 1 and NGO 2
    const baseAnalytics1 = (await ngo1Auth.client.get('/ngo/analytics')).data || {};
    const baseAnalytics2 = (await ngo2Auth.client.get('/ngo/analytics')).data || {};

    // -------------------------------------------------------------------------
    // TEST 1: Kitchen publishes surplus donation and verifies notification triggers
    // -------------------------------------------------------------------------
    console.log('\n--- 1. Surplus Donation Creation & Notification Trigger ---');
    const deadline = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(); // 4 hours from now
    const createDonationRes = await kitchenAuth.client.post('/kitchen/donations', {
      food_batch_id: testBatchId,
      quantity: 50,
      collection_deadline: deadline,
      notes: 'Vegetarian thali portions with chapati and dal.',
    });

    assert(createDonationRes.status === 201, 'Kitchen publishes surplus donation (50 portions)', `Status: ${createDonationRes.status}`);
    const donationId = createDonationRes.data?.donation?.donation_id;
    assert(!!donationId, 'Created donation returns valid donation_id', `ID: ${donationId}`);

    // Verify NGO 1 receives a new donation notification
    const initialNotifRes = await ngo1Auth.client.get('/ngo/notifications');
    assert(initialNotifRes.status === 200, 'NGO 1 fetches real-time notifications', `Count: ${initialNotifRes.data?.notifications?.length}`);
    const newDonationNotif = initialNotifRes.data?.notifications?.find(
      (n) => n.related_donation_id === donationId && n.type === 'NEW_DONATION'
    );
    assert(!!newDonationNotif, 'NGO receives system notification for newly published surplus donation', `Notif ID: ${newDonationNotif?.notification_id}`);

    // -------------------------------------------------------------------------
    // TEST 2: Live Surplus Food Marketplace (Display, Fields & Filters)
    // -------------------------------------------------------------------------
    console.log('\n--- 2. Live Surplus Food Marketplace Inspection & Filtering ---');
    const marketRes = await ngo1Auth.client.get('/ngo/donations');
    assert(marketRes.status === 200, 'NGO retrieves live marketplace donations', `Items: ${marketRes.data?.length}`);

    const marketList = Array.isArray(marketRes.data) ? marketRes.data : marketRes.data?.donations || [];
    const marketItem = marketList.find((d) => d.donation_id === donationId);
    assert(!!marketItem, 'Newly published donation appears in NGO marketplace');
    assert(marketItem?.total_quantity === 50, 'Marketplace shows correct available quantity', `Qty: ${marketItem?.total_quantity}`);
    assert(marketItem?.dietary_type === 'Pure Vegetarian', 'Marketplace reflects Pure Vegetarian canteen classification');
    assert(marketItem?.original_prepared_qty === 80, 'Marketplace reflects original prepared quantity', `Prepared: ${marketItem?.original_prepared_qty}`);
    assert(marketItem?.pickup_location?.includes('Loading Dock'), 'Marketplace displays specific collection loading dock');
    assert(marketItem?.batch_notes?.includes('Strictly vegetarian'), 'Marketplace displays actual batch notes');
    assert(typeof marketItem?.remaining_time_ms === 'number' && marketItem?.remaining_time_ms > 0, 'Marketplace provides live remaining countdown time');

    // Test Marketplace Filters
    const filteredMinQty = await ngo1Auth.client.get('/ngo/donations?min_quantity=60');
    const listOver60 = Array.isArray(filteredMinQty.data) ? filteredMinQty.data : [];
    const hasItemOver60 = listOver60.some((d) => d.donation_id === donationId);
    assert(!hasItemOver60, 'Filter min_quantity=60 correctly excludes 50-portion donation');

    const filteredUnder50 = await ngo1Auth.client.get('/ngo/donations?min_quantity=30');
    const listOver30 = Array.isArray(filteredUnder50.data) ? filteredUnder50.data : [];
    const hasItemOver30 = listOver30.some((d) => d.donation_id === donationId);
    assert(hasItemOver30, 'Filter min_quantity=30 correctly includes 50-portion donation');

    // -------------------------------------------------------------------------
    // TEST 3: Partial Claiming, Verification Code & Real-Time Quantity Update
    // -------------------------------------------------------------------------
    console.log('\n--- 3. Partial Claiming, Verification Code & Inventory Reservation ---');
    // NGO 1 claims 20 out of 50 portions
    const claim1Res = await ngo1Auth.client.post(`/ngo/donations/${donationId}/claim`, {
      quantity: 20,
    });

    assert(claim1Res.status === 200 || claim1Res.status === 201, 'NGO 1 successfully submits partial claim for 20 portions', `Status: ${claim1Res.status}`);
    const claim1Id = claim1Res.data?.claim_id || claim1Res.data?.claim?.claim_id;
    const claim1Code = claim1Res.data?.verification_code || claim1Res.data?.claim?.verification_code;
    assert(!!claim1Id, 'Claim creates valid claim_id', `ID: ${claim1Id}`);
    assert(typeof claim1Code === 'string' && claim1Code.startsWith('PW-'), 'Claim issues secure PlateWise verification code (PW-XXXX)', `Code: ${claim1Code}`);

    // Verify marketplace immediately reflects 30 remaining portions
    const marketAfterClaim1 = await ngo1Auth.client.get('/ngo/donations');
    const listAfter1 = Array.isArray(marketAfterClaim1.data) ? marketAfterClaim1.data : [];
    const updatedDonation1 = listAfter1.find((d) => d.donation_id === donationId);
    assert(updatedDonation1?.remaining_quantity === 30, 'Marketplace remaining quantity correctly reduced to 30', `Available: ${updatedDonation1?.remaining_quantity}`);

    // -------------------------------------------------------------------------
    // TEST 4: Concurrency & Overclaiming Protection
    // -------------------------------------------------------------------------
    console.log('\n--- 4. Concurrency & Overclaiming Protection ---');
    // NGO 2 attempts to claim 35 portions when only 30 are available
    const overclaimRes = await ngo2Auth.client.post(`/ngo/donations/${donationId}/claim`, {
      quantity: 35,
    });
    assert(overclaimRes.status === 400 || overclaimRes.status === 409, 'System strictly rejects claim exceeding remaining portions', `Status: ${overclaimRes.status}`);

    // NGO 2 claims 15 portions (leaving 15)
    const claim2Res = await ngo2Auth.client.post(`/ngo/donations/${donationId}/claim`, {
      quantity: 15,
    });
    assert(claim2Res.status === 200 || claim2Res.status === 201, 'NGO 2 successfully claims valid 15 portions', `Status: ${claim2Res.status}`);
    const claim2Id = claim2Res.data?.claim_id || claim2Res.data?.claim?.claim_id;
    assert(!!claim2Id, 'NGO 2 claim creates valid claim_id', `ID: ${claim2Id}`);

    // -------------------------------------------------------------------------
    // TEST 5: Strict Cross-NGO Data Isolation
    // -------------------------------------------------------------------------
    console.log('\n--- 5. Strict Cross-NGO Data Isolation ---');
    // NGO 1 requests donation details
    const ngo1DonationView = await ngo1Auth.client.get(`/ngo/donations/${donationId}`);
    assert(ngo1DonationView.status === 200, 'NGO 1 retrieves donation details');
    const ngo1SeenClaims = ngo1DonationView.data?.claims || [];
    const ngo1SeesOwnClaim = ngo1SeenClaims.some((c) => c.claim_id === claim1Id);
    const ngo1SeesNgo2Claim = ngo1SeenClaims.some((c) => c.claim_id === claim2Id);
    assert(ngo1SeesOwnClaim, 'NGO 1 sees their own claim in donation details');
    assert(!ngo1SeesNgo2Claim, 'DATA ISOLATION: NGO 1 cannot see NGO 2 claim or verification code in donation details');

    // NGO 2 requests donation details
    const ngo2DonationView = await ngo2Auth.client.get(`/ngo/donations/${donationId}`);
    const ngo2SeenClaims = ngo2DonationView.data?.claims || [];
    const ngo2SeesOwnClaim = ngo2SeenClaims.some((c) => c.claim_id === claim2Id);
    const ngo2SeesNgo1Claim = ngo2SeenClaims.some((c) => c.claim_id === claim1Id);
    assert(ngo2SeesOwnClaim, 'NGO 2 sees their own claim in donation details');
    assert(!ngo2SeesNgo1Claim, 'DATA ISOLATION: NGO 2 cannot see NGO 1 claim or verification code in donation details');

    // Verify NGO 2 cannot cancel NGO 1's claim
    const unauthorizedCancelRes = await ngo2Auth.client.post(`/ngo/claims/${claim1Id}/cancel`, {
      reason: 'Unauthorized attempt',
    });
    assert(unauthorizedCancelRes.status === 404 || unauthorizedCancelRes.status === 403, 'Cross-NGO claim cancellation strictly blocked', `Status: ${unauthorizedCancelRes.status}`);

    // -------------------------------------------------------------------------
    // TEST 6: Claim Cancellation & Reservation Release
    // -------------------------------------------------------------------------
    console.log('\n--- 6. Claim Cancellation & Reservation Release ---');
    // NGO 2 cancels their 15-portion claim
    const cancelRes = await ngo2Auth.client.post(`/ngo/claims/${claim2Id}/cancel`, {
      reason: 'Driver vehicle mechanical breakdown',
    });
    assert(cancelRes.status === 200, 'NGO 2 successfully cancels active claim with recorded reason', `Status: ${cancelRes.status}`);

    // Verify donation available quantity is restored from 15 back to 30
    const marketAfterCancel = await ngo1Auth.client.get('/ngo/donations');
    const listAfterCancel = Array.isArray(marketAfterCancel.data) ? marketAfterCancel.data : [];
    const restoredDonation = listAfterCancel.find((d) => d.donation_id === donationId);
    assert(restoredDonation?.remaining_quantity === 30, 'Surplus quantity restored back to 30 upon claim cancellation', `Available: ${restoredDonation?.remaining_quantity}`);

    // -------------------------------------------------------------------------
    // TEST 7: Kitchen Handover Verification & Ineligible Cancellation Protection
    // -------------------------------------------------------------------------
    console.log('\n--- 7. Kitchen Handover & Ineligible Cancellation Protection ---');
    // Kitchen verifies handover for NGO 1 claim using verification code
    const handoverRes = await kitchenAuth.client.post('/kitchen/donations/handover', {
      verification_code: claim1Code,
    });
    assert(handoverRes.status === 200, 'Kitchen executes loading dock handover via verification code', `Status: ${handoverRes.status}`);

    // Verify NGO 1's claim is now 'Collected'
    const ngo1ClaimsRes = await ngo1Auth.client.get('/ngo/my-claims');
    const claimsList1 = Array.isArray(ngo1ClaimsRes.data) ? ngo1ClaimsRes.data : ngo1ClaimsRes.data?.claims || [];
    const verifiedClaim1 = claimsList1.find((c) => c.claim_id === claim1Id);
    assert(verifiedClaim1?.status === 'Collected', 'NGO 1 claim status transitions to Collected', `Status: ${verifiedClaim1?.status}`);
    assert(verifiedClaim1?.progress_step === 3, 'Collection tracker displays Progress Step 3 (Completed Handover)');
    assert(verifiedClaim1?.can_cancel === false, 'can_cancel flag is false for collected claim');

    // Attempt cancellation of collected claim
    const cancelCollectedRes = await ngo1Auth.client.post(`/ngo/claims/${claim1Id}/cancel`, {
      reason: 'Should be rejected',
    });
    assert(cancelCollectedRes.status === 400, 'System strictly rejects cancellation of already Collected claim', `Status: ${cancelCollectedRes.status}`);

    // -------------------------------------------------------------------------
    // TEST 8: Real NGO Impact Analytics (Verified Portions Only)
    // -------------------------------------------------------------------------
    console.log('\n--- 8. NGO Impact Analytics Verification ---');
    const analyticsRes1 = await ngo1Auth.client.get('/ngo/analytics');
    assert(analyticsRes1.status === 200, 'NGO 1 retrieves real database-backed impact analytics');
    const stats1 = analyticsRes1.data;
    const collectedDelta1 = stats1.total_portions_collected - (baseAnalytics1.total_portions_collected || 0);
    const collectionsDelta1 = stats1.successful_collections_count - (baseAnalytics1.successful_collections_count || 0);

    assert(collectedDelta1 === 20, 'Impact metric: exactly 20 collected portions added to counter (not claimed quantity)', `Delta: ${collectedDelta1}`);
    assert(collectionsDelta1 === 1, 'Impact metric: exactly 1 successful collection added', `Delta: ${collectionsDelta1}`);
    assert(Array.isArray(stats1?.chart_data) && stats1?.chart_data.length === 14, 'Daily trend array contains exact 14-day history', `Length: ${stats1?.chart_data?.length}`);

    // Check NGO 2 analytics (cancelled claim delta)
    const analyticsRes2 = await ngo2Auth.client.get('/ngo/analytics');
    const stats2 = analyticsRes2.data;
    const cancelledDelta2 = stats2.cancelled_claims_count - (baseAnalytics2.cancelled_claims_count || 0);
    const collectedDelta2 = stats2.total_portions_collected - (baseAnalytics2.total_portions_collected || 0);

    assert(collectedDelta2 === 0, 'DATA ISOLATION: NGO 2 collected portions delta is 0', `Delta: ${collectedDelta2}`);
    assert(cancelledDelta2 === 1, 'DATA ISOLATION: NGO 2 cancelled claims delta is exactly 1', `Delta: ${cancelledDelta2}`);

    // -------------------------------------------------------------------------
    // TEST 9: Notification Management (Read & Mark All Read)
    // -------------------------------------------------------------------------
    console.log('\n--- 9. Notification Management ---');
    const notifsRes = await ngo1Auth.client.get('/ngo/notifications');
    const unreadNotif = notifsRes.data?.notifications?.find((n) => !n.is_read);
    if (unreadNotif) {
      const readSingleRes = await ngo1Auth.client.patch(`/ngo/notifications/${unreadNotif.notification_id}/read`);
      assert(readSingleRes.status === 200, 'Single notification marked as read', `ID: ${unreadNotif.notification_id}`);
    }

    const markAllRes = await ngo1Auth.client.post('/ngo/notifications/mark-all-read');
    assert(markAllRes.status === 200, 'Mark all notifications as read executes successfully');
    const afterMarkAll = await ngo1Auth.client.get('/ngo/notifications');
    const remainingUnread = afterMarkAll.data?.notifications?.filter((n) => !n.is_read).length;
    assert(remainingUnread === 0, 'Unread notification count drops to 0 after mark-all-read', `Unread: ${remainingUnread}`);

    // -------------------------------------------------------------------------
    // TEST 10: NGO Profile Management & Privilege Escalation Protection
    // -------------------------------------------------------------------------
    console.log('\n--- 10. Organization Profile & Privilege Protection ---');
    const profileRes = await ngo1Auth.client.get('/ngo/profile');
    assert(profileRes.status === 200, 'NGO fetches organization profile');
    assert(profileRes.data?.organization_name === 'Feed The City Foundation', 'Profile returns organization name');

    // Valid update
    const updateProfileRes = await ngo1Auth.client.put('/ngo/profile', {
      organization_name: 'Feed The City Global Alliance',
      contact_person: 'Sarah Jenkins-Cole',
      phone_number: '+91 99999 88888',
      address: '77 Humanitarian Way, South Campus',
    });

    assert(updateProfileRes.status === 200, 'Profile updates allowed fields successfully');
    assert(updateProfileRes.data?.profile?.organization_name === 'Feed The City Global Alliance', 'Organization name updated in response');

    // Security check: attempt malicious privilege escalation
    const maliciousUpdateRes = await ngo1Auth.client.put('/ngo/profile', {
      role: 'admin',
      email: 'hacked_admin@campus.edu',
    });
    assert(maliciousUpdateRes.status === 403, 'SECURITY: Privilege escalation and email tampering strictly rejected with 403 Forbidden');

    // Verify role and email remain intact in database
    const verifySecProfile = await ngo1Auth.client.get('/ngo/profile');
    assert(verifySecProfile.data?.role === 'ngo', 'Database confirms user role remains ngo', `Role: ${verifySecProfile.data?.role}`);
    assert(verifySecProfile.data?.email === ngo1Email, 'Database confirms email remains unchanged', `Email: ${verifySecProfile.data?.email}`);

    // -------------------------------------------------------------------------
    // TEST 11: Expired Donation Cannot Be Claimed
    // -------------------------------------------------------------------------
    console.log('\n--- 11. Expired Donation Claim Rejection ---');
    // Create an already-expired donation directly in test db using Date object
    const [expiredBatch] = await pool.query(
      `INSERT INTO food_batches (menu_item_id, batch_date, cooked_qty, sold_qty, leftover_qty, status)
       VALUES (1, CURDATE(), 20, 0, 20, 'Active')`
    );
    const pastDate = new Date(Date.now() - 3600000); // 1 hour ago
    const [expiredDonationRes] = await pool.query(
      `INSERT INTO donations (food_batch_id, quantity, collection_deadline, status)
       VALUES (?, 10, ?, 'Available')`,
      [expiredBatch.insertId, pastDate]
    );
    const expiredDonationId = expiredDonationRes.insertId;

    const claimExpiredRes = await ngo1Auth.client.post(`/ngo/donations/${expiredDonationId}/claim`, {
      quantity: 5,
    });
    assert(claimExpiredRes.status === 400 || claimExpiredRes.status === 409, 'System strictly rejects claiming an expired donation', `Status: ${claimExpiredRes.status}`);

  } catch (err) {
    console.error('Fatal test error:', err);
    assert(false, `Unexpected error during test execution: ${err.message}`);
  } finally {
    server.close();
    await pool.end();
  }

  console.log('\n================================================================================');
  console.log(` NGO Dashboard Enhancement Test Results: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runNgoDashboardTests();
