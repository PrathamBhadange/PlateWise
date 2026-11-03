/* global process */
/**
 * PlateWise NGO Dashboard Zero Data Diagnostic & End-to-End Validation
 * Validates Part 4 (Full Kitchen-to-NGO-to-Kitchen-to-NGO workflow)
 * and Part 5 (Cancellation, Multi-NGO behavior, Data Isolation)
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

async function runDiagnosticTests() {
  console.log('================================================================================');
  console.log(' PlateWise NGO Dashboard Zero Data Diagnostic & Validation Suite');
  console.log(' Target Database: platewise_test_db');
  console.log('================================================================================');

  const [dbRow] = await pool.query('SELECT DATABASE() AS current_db');
  if (dbRow[0].current_db !== 'platewise_test_db') {
    throw new Error(`SAFETY ABORT: Connected to ${dbRow[0].current_db}, expected platewise_test_db!`);
  }
  console.log(`[Safety Verified] Connected to isolated test database: ${dbRow[0].current_db}\n`);

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api`;
  console.log(`[Test Server] Ephemeral backend listening at: ${baseUrl}\n`);

  try {
    // 0. Ensure test accounts exist in platewise_test_db
    const pwdHash = await bcrypt.hash('Ngo@123', 10);
    const ngo1Email = 'ngo@platewise.org';
    const ngo2Email = 'ngo2@platewise.org';

    // Setup NGO 1
    const [existingNgo1] = await pool.query('SELECT user_id FROM users WHERE email = ?', [ngo1Email]);
    if (existingNgo1.length === 0) {
      await pool.query(
        `INSERT INTO users (full_name, email, password_hash, role, account_status, organization_name, contact_person, phone_number, address)
         VALUES ('Feeding India Foundation', ?, ?, 'ngo', 'active', 'Feeding India Foundation', 'Sarah Jenkins', '+91 98765 43210', '12 Hope Avenue, Metro City')`,
        [ngo1Email, pwdHash]
      );
    } else {
      await pool.query(
        `UPDATE users SET password_hash = ?, account_status = 'active', role = 'ngo',
         organization_name = 'Feeding India Foundation', contact_person = 'Sarah Jenkins'
         WHERE email = ?`,
        [pwdHash, ngo1Email]
      );
    }

    // Setup NGO 2
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
         organization_name = 'Roti Bank Relief Trust', contact_person = 'Vikram Malhotra'
         WHERE email = ?`,
        [pwdHash, ngo2Email]
      );
    }

    const kitchenAuth = await loginUser(baseUrl, 'kitchen@platewise.campus', 'Kitchen@123', 'kitchen');
    const ngo1Auth = await loginUser(baseUrl, ngo1Email, 'Ngo@123', 'ngo');
    const ngo2Auth = await loginUser(baseUrl, ngo2Email, 'Ngo@123', 'ngo');

    assert(kitchenAuth.res.status === 200, 'Kitchen staff logs in successfully');
    assert(ngo1Auth.res.status === 200, 'NGO 1 logs in successfully');
    assert(ngo2Auth.res.status === 200, 'NGO 2 logs in successfully');

    // -------------------------------------------------------------------------
    // PART 4 — Verify the kitchen-to-NGO workflow
    // -------------------------------------------------------------------------
    console.log('\n============================================================');
    console.log('PART 4: Kitchen-to-NGO-to-Kitchen-to-NGO Full Lifecycle Test');
    console.log('============================================================');

    // Step 1: Create food production batch
    const [batchRes] = await pool.query(
      `INSERT INTO food_batches (menu_item_id, batch_date, cooked_qty, sold_qty, leftover_qty, status, meal_session, notes)
       VALUES (1, CURDATE(), 60, 0, 60, 'Active', 'Lunch', 'Freshly steamed batch of Kanda Poha.')`
    );
    const batchId = batchRes.insertId;
    assert(!!batchId, 'Kitchen creates valid food production batch', `Batch ID: ${batchId}`);

    // Step 2: Publish 30 surplus plates
    const deadline1 = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString();
    const pubRes1 = await kitchenAuth.client.post('/kitchen/donations', {
      food_batch_id: batchId,
      quantity: 30,
      collection_deadline: deadline1,
      notes: '30 portions ready for rescue at loading dock.',
    });
    assert(pubRes1.status === 201, 'Kitchen publishes 30 available surplus plates', `Status: ${pubRes1.status}`);
    const donation1Id = pubRes1.data?.donation?.donation_id;
    assert(!!donation1Id, 'Donation returns valid donation_id', `ID: ${donation1Id}`);

    // Step 3: Authenticate NGO 1 and verify marketplace displays donation
    const marketRes1 = await ngo1Auth.client.get('/ngo/donations?status=all');
    assert(marketRes1.status === 200, 'NGO 1 retrieves donations feed (GET /ngo/donations?status=all)');
    const donItem1 = marketRes1.data?.find((d) => d.donation_id === donation1Id);
    assert(!!donItem1, 'Marketplace feed contains newly published donation');
    assert(donItem1?.remaining_quantity === 30, 'Marketplace shows 30 available plates', `Qty: ${donItem1?.remaining_quantity}`);
    assert(donItem1?.is_available_to_claim === true, 'Donation is marked available to claim (unexpired deadline)');

    // Step 3b: Verify GET /ngo/donations/my-claims and GET /ngo/my-claims both succeed (precedence bug fix)
    const myClaimsCheck1 = await ngo1Auth.client.get('/ngo/donations/my-claims');
    const myClaimsCheck2 = await ngo1Auth.client.get('/ngo/my-claims');
    assert(myClaimsCheck1.status === 200, 'GET /ngo/donations/my-claims returns 200 OK (NOT intercepted by /:id with 400)');
    assert(myClaimsCheck2.status === 200, 'GET /ngo/my-claims returns 200 OK');

    // Step 4: Record baseline analytics for NGO 1
    const baseAnalytics1 = (await ngo1Auth.client.get('/ngo/analytics')).data || {};

    // Step 5: NGO 1 claims 10 plates
    const claimRes1 = await ngo1Auth.client.post(`/ngo/donations/${donation1Id}/claims`, {
      quantity: 10,
    });
    assert(claimRes1.status === 201, 'NGO 1 claims 10 plates (POST /ngo/donations/:id/claims)', `Status: ${claimRes1.status}`);
    const claim1Id = claimRes1.data?.claim?.claim_id;
    const claim1Code = claimRes1.data?.claim?.verification_code;
    assert(!!claim1Id, 'Claim creates valid claim_id', `ID: ${claim1Id}`);
    assert(typeof claim1Code === 'string' && claim1Code.startsWith('PW-'), 'Claim returns valid verification code', `Code: ${claim1Code}`);

    // Step 6: Verify active claims and pending collection show correct quantity
    const midAnalytics1 = (await ngo1Auth.client.get('/ngo/analytics')).data || {};
    const pendingDelta = midAnalytics1.pending_collection_portions - (baseAnalytics1.pending_collection_portions || 0);
    const activeDelta = midAnalytics1.active_claims_count - (baseAnalytics1.active_claims_count || 0);
    assert(pendingDelta === 10, 'NGO 1 pending collection portions increased by exactly 10', `Delta: ${pendingDelta}`);
    assert(activeDelta === 1, 'NGO 1 active claims count increased by exactly 1', `Delta: ${activeDelta}`);

    // Step 7: Authenticate kitchen staff and complete dock handover
    const handoverRes1 = await kitchenAuth.client.post('/kitchen/donations/handover', {
      verification_code: claim1Code,
    });
    assert(handoverRes1.status === 200, 'Kitchen completes loading dock handover using verification code', `Status: ${handoverRes1.status}`);

    // Step 8: Authenticate NGO 1 again and verify post-collection metrics
    const postAnalytics1 = (await ngo1Auth.client.get('/ngo/analytics')).data || {};
    const collectedDelta1 = postAnalytics1.total_portions_collected - (baseAnalytics1.total_portions_collected || 0);
    const successDelta1 = postAnalytics1.successful_collections_count - (baseAnalytics1.successful_collections_count || 0);
    const finalPendingDelta1 = postAnalytics1.pending_collection_portions - (baseAnalytics1.pending_collection_portions || 0);

    assert(collectedDelta1 === 10, 'Total collected portions increased by exactly 10', `Delta: ${collectedDelta1}`);
    assert(successDelta1 === 1, 'Successful collection count increased by exactly 1', `Delta: ${successDelta1}`);
    assert(finalPendingDelta1 === 0, 'Pending collection decreased by 10 back to baseline', `Pending Delta: ${finalPendingDelta1}`);

    // Step 9: Verify 14-day chart includes the collection on the correct date
    const istFormatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const todayKey = istFormatter.format(new Date());
    const todayChartEntry = postAnalytics1.chart_data?.find((d) => d.date === todayKey);
    assert(!!todayChartEntry, `14-day chart contains entry for today (${todayKey})`);
    assert(todayChartEntry?.portions >= 10, `Today's chart entry reflects collected portions (Portions: ${todayChartEntry?.portions})`);

    // -------------------------------------------------------------------------
    // PART 5 — Verify cancellation and multi-NGO behavior
    // -------------------------------------------------------------------------
    console.log('\n============================================================');
    console.log('PART 5: Cancellation & Multi-NGO Isolation Test');
    console.log('============================================================');

    // Create a new batch and publish 30 surplus plates
    const [batch2Res] = await pool.query(
      `INSERT INTO food_batches (menu_item_id, batch_date, cooked_qty, sold_qty, leftover_qty, status, meal_session, notes)
       VALUES (2, CURDATE(), 60, 0, 60, 'Active', 'Lunch', 'Fresh Thali.')`
    );
    const deadline2 = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString();
    const pubRes2 = await kitchenAuth.client.post('/kitchen/donations', {
      food_batch_id: batch2Res.insertId,
      quantity: 30,
      collection_deadline: deadline2,
      notes: 'Second surplus offer for multi-NGO test.',
    });
    const donation2Id = pubRes2.data?.donation?.donation_id;

    // Step 1: NGO 1 claims 10 plates
    const multiClaim1 = await ngo1Auth.client.post(`/ngo/donations/${donation2Id}/claims`, {
      quantity: 10,
    });
    assert(multiClaim1.status === 201, 'NGO 1 claims 10 plates from 30-portion donation');
    const claim1MultiId = multiClaim1.data?.claim?.claim_id;

    // Step 2: NGO 2 claims 5 plates
    const multiClaim2 = await ngo2Auth.client.post(`/ngo/donations/${donation2Id}/claims`, {
      quantity: 5,
    });
    assert(multiClaim2.status === 201, 'NGO 2 claims 5 plates from same donation');
    const claim2MultiId = multiClaim2.data?.claim?.claim_id;
    const claim2MultiCode = multiClaim2.data?.claim?.verification_code;

    // Step 3: NGO 1 cancels its eligible claim
    const cancelRes = await ngo1Auth.client.post(`/ngo/claims/${claim1MultiId}/cancel`, {
      reason: 'Volunteer vehicle breakdown',
    });
    assert(cancelRes.status === 200, 'NGO 1 successfully cancels eligible claim');

    // Step 4: Available quantity is recalculated correctly (should be 30 - 5 = 25 available)
    const marketCheck = await ngo1Auth.client.get('/ngo/donations?status=all');
    const don2Item = marketCheck.data?.find((d) => d.donation_id === donation2Id);
    assert(don2Item?.remaining_quantity === 25, 'Available quantity correctly restored to 25 plates', `Qty: ${don2Item?.remaining_quantity}`);

    // Step 5: NGO 2 can still see only its own claim information
    const don2ViewNgo2 = await ngo2Auth.client.get(`/ngo/donations/${donation2Id}`);
    const ngo2Claims = don2ViewNgo2.data?.claims || [];
    const ngo2SeesOwn = ngo2Claims.some((c) => c.claim_id === claim2MultiId);
    const ngo2SeesNgo1 = ngo2Claims.some((c) => c.claim_id === claim1MultiId);
    assert(ngo2SeesOwn, 'NGO 2 sees its own claim');
    assert(!ngo2SeesNgo1, 'DATA ISOLATION: NGO 2 CANNOT see NGO 1 claim in donation details');

    // Step 6: Record baseline analytics for NGO 1 and NGO 2
    const baseAnalyticsNgo1 = (await ngo1Auth.client.get('/ngo/analytics')).data || {};
    const baseAnalyticsNgo2 = (await ngo2Auth.client.get('/ngo/analytics')).data || {};

    // Step 7: NGO 2 completes collection via kitchen handover
    const handoverRes2 = await kitchenAuth.client.post('/kitchen/donations/handover', {
      verification_code: claim2MultiCode,
    });
    assert(handoverRes2.status === 200, 'Kitchen completes dock handover for NGO 2 claim');

    // Step 8: NGO 2's impact analytics increase by exactly 5
    const postAnalyticsNgo2 = (await ngo2Auth.client.get('/ngo/analytics')).data || {};
    const collectedDeltaNgo2 = postAnalyticsNgo2.total_portions_collected - (baseAnalyticsNgo2.total_portions_collected || 0);
    assert(collectedDeltaNgo2 === 5, 'NGO 2 total collected portions increased by exactly 5', `Delta: ${collectedDeltaNgo2}`);

    // Step 9: NGO 1's collected statistics remain unchanged
    const postAnalyticsNgo1 = (await ngo1Auth.client.get('/ngo/analytics')).data || {};
    const collectedDeltaNgo1 = postAnalyticsNgo1.total_portions_collected - (baseAnalyticsNgo1.total_portions_collected || 0);
    assert(collectedDeltaNgo1 === 0, 'DATA ISOLATION: NGO 1 collected portions remain strictly unchanged', `Delta: ${collectedDeltaNgo1}`);

  } catch (err) {
    console.error('Fatal test error:', err);
    assert(false, `Unexpected error during test execution: ${err.message}`);
  } finally {
    server.close();
    await pool.end();
  }

  console.log('\n================================================================================');
  console.log(` Diagnostic Suite Results: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runDiagnosticTests();
