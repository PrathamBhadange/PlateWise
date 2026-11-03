/* global process */
/**
 * PlateWise Phase 3C.1 Donation Management Integration Test Suite
 * Tests all 14 mandatory functional, authorization, concurrency, inventory,
 * expiry, and legacy compatibility requirements against isolated test database.
 */

process.env.DB_NAME = 'platewise_test_db';

import http from 'http';
import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

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
  console.log(' PlateWise Phase 3C.1 Donation Management Integration Test Suite');
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

  try {
    // 0. Authenticate test actors
    console.log('[Setup] Logging in test personas...');

    // Ensure a second NGO exists in test database with known password
    const testNgo2Email = 'ngo2@platewise.org';
    const pwdHash = await bcrypt.hash('Ngo@123', 10);
    const [existingNgo2] = await pool.query('SELECT user_id FROM users WHERE email = ?', [testNgo2Email]);
    if (existingNgo2.length === 0) {
      await pool.query(
        `INSERT INTO users (full_name, email, password_hash, role, account_status)
         VALUES ('Roti Bank NGO', ?, ?, 'ngo', 'active')`,
        [testNgo2Email, pwdHash]
      );
    } else {
      await pool.query(
        `UPDATE users SET password_hash = ?, account_status = 'active', role = 'ngo' WHERE email = ?`,
        [pwdHash, testNgo2Email]
      );
    }

    const kitchenAuth = await loginUser(baseUrl, 'kitchen@platewise.campus', 'Kitchen@123', 'kitchen');
    const studentAuth = await loginUser(baseUrl, 'aarav.sharma@campus.edu', 'Student@123', 'student');
    const ngo1Auth = await loginUser(baseUrl, 'ngo@platewise.org', 'Ngo@123', 'ngo');
    const ngo2Auth = await loginUser(baseUrl, 'ngo2@platewise.org', 'Ngo@123', 'ngo');

    assert(kitchenAuth.res.status === 200, 'Kitchen staff logs in successfully');
    assert(studentAuth.res.status === 200, 'Student logs in successfully');
    assert(ngo1Auth.res.status === 200, 'NGO 1 logs in successfully');
    assert(ngo2Auth.res.status === 200, 'NGO 2 logs in successfully');

    // Create a fresh test batch for donation tests
    const [batchRes] = await pool.query(
      `INSERT INTO food_batches (menu_item_id, batch_date, cooked_qty, sold_qty, leftover_qty, status)
       VALUES (1, CURDATE(), 60, 0, 60, 'Active')`
    );
    const testBatchId = batchRes.insertId;
    console.log(`[Setup] Created test food batch #${testBatchId} (cooked: 60, available: 60)\n`);

    // -------------------------------------------------------------------------
    // TEST 1: Authorized kitchen user creates a valid donation
    // -------------------------------------------------------------------------
    console.log('--- TEST 1: Kitchen publishes surplus food donation ---');
    const futureDeadline = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
    const createRes = await kitchenAuth.client.post('/kitchen/donations', {
      food_batch_id: testBatchId,
      quantity: 25,
      collection_deadline: futureDeadline,
      notes: 'Freshly cooked surplus from morning batch',
    });

    assert(
      createRes.status === 201 && createRes.data.success === true,
      'Authorized kitchen user creates a valid donation',
      `HTTP ${createRes.status}, donation_id: ${createRes.data.donation?.donation_id}`
    );
    const testDonationId = createRes.data.donation.donation_id;
    assert(
      createRes.data.donation.quantity === 25 &&
        createRes.data.donation.remaining_quantity === 25 &&
        createRes.data.donation.status === 'Available',
      'Donation published with initial status Available and 25 portions'
    );

    // -------------------------------------------------------------------------
    // TEST 2: Unauthorized user cannot create a donation
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 2: Unauthorized role blocked from publishing donations ---');
    const studentCreateRes = await studentAuth.client.post('/kitchen/donations', {
      food_batch_id: testBatchId,
      quantity: 10,
    });
    assert(
      studentCreateRes.status === 403,
      'Unauthorized student role rejected with 403 Forbidden',
      `HTTP ${studentCreateRes.status}`
    );

    const ngoCreateRes = await ngo1Auth.client.post('/kitchen/donations', {
      food_batch_id: testBatchId,
      quantity: 10,
    });
    assert(
      ngoCreateRes.status === 403,
      'Unauthorized NGO role rejected from kitchen donation creation with 403 Forbidden',
      `HTTP ${ngoCreateRes.status}`
    );

    // -------------------------------------------------------------------------
    // TEST 3: NGO can view eligible donations
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 3: NGO views eligible donations ---');
    const ngoListRes = await ngo1Auth.client.get('/ngo/donations');
    assert(ngoListRes.status === 200, 'NGO can retrieve donation feed', `HTTP ${ngoListRes.status}`);

    const foundDonation = ngoListRes.data.find((d) => d.donation_id === testDonationId);
    assert(
      foundDonation &&
        foundDonation.total_quantity === 25 &&
        foundDonation.remaining_quantity === 25 &&
        foundDonation.pickup_location === 'Kitchen Rear Loading Dock',
      'NGO views donation with accurate remaining quantity and dock location',
      `remaining: ${foundDonation?.remaining_quantity}`
    );

    // -------------------------------------------------------------------------
    // TEST 4: NGO can claim a portion
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 4: NGO claims a portion (partial claim) ---');
    const claim1Res = await ngo1Auth.client.post(`/ngo/donations/${testDonationId}/claims`, {
      quantity: 7,
    });
    assert(
      claim1Res.status === 201 && claim1Res.data.success === true,
      'NGO 1 claims 7 portions out of 25',
      `HTTP ${claim1Res.status}, claim_id: ${claim1Res.data.claim?.claim_id}`
    );
    const claim1 = claim1Res.data.claim;
    assert(
      claim1.quantity === 7 &&
        claim1.status === 'Claimed' &&
        claim1.verification_code.startsWith('PW-') &&
        claim1.remaining_quantity === 18,
      'Claim created with valid verification code and remaining quantity updated to 18'
    );

    // -------------------------------------------------------------------------
    // TEST 5: Two NGOs can claim different portions of the same donation
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 5: Second NGO claims another portion ---');
    const claim2Res = await ngo2Auth.client.post(`/ngo/donations/${testDonationId}/claims`, {
      quantity: 10,
    });
    assert(
      claim2Res.status === 201 && claim2Res.data.success === true,
      'Two NGOs can claim different portions of the same donation',
      `NGO 2 claimed: ${claim2Res.data.claim?.quantity}`
    );
    const claim2 = claim2Res.data.claim;
    assert(
      claim2.remaining_quantity === 8 && claim2.parent_status === 'Available',
      'Parent donation remains Available with 8 portions remaining'
    );

    // -------------------------------------------------------------------------
    // TEST 6: Claims cannot exceed available quantity
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 6: Overclaiming rejected ---');
    // Remaining is 8, try to claim 9
    const overclaimRes = await ngo1Auth.client.post(`/ngo/donations/${testDonationId}/claims`, {
      quantity: 9,
    });
    assert(
      overclaimRes.status === 409,
      'Claim exceeding remaining available quantity is rejected with 409 Conflict',
      `HTTP ${overclaimRes.status}, error: "${overclaimRes.data?.message}"`
    );

    // -------------------------------------------------------------------------
    // TEST 7: NGO cannot cancel another NGO's claim
    // -------------------------------------------------------------------------
    console.log("\n--- TEST 7: NGO cannot cancel another NGO's claim ---");
    // NGO 1 tries to cancel NGO 2's claim
    const unauthorizedCancelRes = await ngo1Auth.client.post(
      `/ngo/donation-claims/${claim2.claim_id}/cancel`,
      { reason: 'Malicious attempt' }
    );
    assert(
      unauthorizedCancelRes.status === 403,
      "NGO cannot cancel another NGO's claim (rejected with 403 Forbidden)",
      `HTTP ${unauthorizedCancelRes.status}`
    );

    // -------------------------------------------------------------------------
    // TEST 8: Cancelled claims release reservations exactly once
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 8: Claim cancellation releases reservations exactly once ---');
    // NGO 1 cancels its own claim (7 portions)
    const cancelRes = await ngo1Auth.client.post(`/ngo/donation-claims/${claim1.claim_id}/cancel`, {
      reason: 'Change in logistics route',
    });
    assert(
      cancelRes.status === 200 && cancelRes.data.released_quantity === 7,
      'NGO 1 successfully cancels own claim; 7 portions released',
      `new claimed total: ${cancelRes.data.new_claimed_quantity}`
    );

    // Verify parent donation status in DB
    const [donRowAfterCancel] = await pool.query(
      'SELECT claimed_quantity, status FROM donations WHERE donation_id = ?',
      [testDonationId]
    );
    assert(
      donRowAfterCancel[0].claimed_quantity === 10 && donRowAfterCancel[0].status === 'Available',
      'Parent claimed_quantity safely restored from 17 down to 10 (15 remaining)'
    );

    // Repeated cancellation attempt must reject and NOT release stock a second time
    const repeatCancelRes = await ngo1Auth.client.post(
      `/ngo/donation-claims/${claim1.claim_id}/cancel`
    );
    assert(
      repeatCancelRes.status === 400,
      'Repeated cancellation of already cancelled claim rejected with 400',
      `HTTP ${repeatCancelRes.status}`
    );

    const [donRowAfterRepeat] = await pool.query(
      'SELECT claimed_quantity FROM donations WHERE donation_id = ?',
      [testDonationId]
    );
    assert(
      donRowAfterRepeat[0].claimed_quantity === 10,
      'Parent claimed_quantity remains strictly 10; zero double deduction occurred'
    );

    // -------------------------------------------------------------------------
    // TEST 9: Collected claims cannot be cancelled
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 9: Collected claim cannot be cancelled ---');
    // Kitchen performs dock handover for NGO 2's claim
    const handoverRes = await kitchenAuth.client.post('/kitchen/donations/handover', {
      verification_code: claim2.verification_code,
    });
    assert(
      handoverRes.status === 200 && handoverRes.data.status === 'Collected',
      'Kitchen completes dock handover using claim verification code',
      `Claim #${claim2.claim_id} is now Collected`
    );

    // NGO 2 attempts to cancel the collected claim
    const cancelCollectedRes = await ngo2Auth.client.post(
      `/ngo/donation-claims/${claim2.claim_id}/cancel`
    );
    assert(
      cancelCollectedRes.status === 400,
      'Cancellation of collected claim is strictly rejected with 400',
      `HTTP ${cancelCollectedRes.status}, error: "${cancelCollectedRes.data?.message}"`
    );

    // -------------------------------------------------------------------------
    // TEST 10: Expired donations reject new claims
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 10: Expired donations reject new claims ---');
    // Create an expired donation batch
    const [expBatchRes] = await pool.query(
      `INSERT INTO food_batches (menu_item_id, batch_date, cooked_qty, sold_qty, leftover_qty, status)
       VALUES (2, CURDATE(), 30, 0, 30, 'Active')`
    );
    const expBatchId = expBatchRes.insertId;

    const [expDonRes] = await pool.query(
      `INSERT INTO donations (food_batch_id, quantity, claimed_quantity, collection_deadline, status, donated_at)
       VALUES (?, 15, 0, DATE_SUB(NOW(), INTERVAL 30 MINUTE), 'Available', DATE_SUB(NOW(), INTERVAL 2 HOUR))`,
      [expBatchId]
    );
    const expiredDonationId = expDonRes.insertId;

    // NGO attempts to claim from expired donation
    const expClaimRes = await ngo1Auth.client.post(`/ngo/donations/${expiredDonationId}/claims`, {
      quantity: 5,
    });
    assert(
      expClaimRes.status === 409,
      'Expired donation rejects new claims with 409 Conflict',
      `HTTP ${expClaimRes.status}, error: "${expClaimRes.data?.message}"`
    );

    // -------------------------------------------------------------------------
    // TEST 11: Expiry does not create duplicate waste records
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 11: Donation expiry and idempotent waste logging ---');
    // Create an uncollected claim on another donation that will expire
    const [expDon2Res] = await pool.query(
      `INSERT INTO donations (food_batch_id, quantity, claimed_quantity, collection_deadline, status, donated_at)
       VALUES (?, 12, 4, DATE_SUB(NOW(), INTERVAL 10 MINUTE), 'Available', DATE_SUB(NOW(), INTERVAL 1 HOUR))`,
      [expBatchId]
    );
    const expDon2Id = expDon2Res.insertId;

    const [uncollClaimRes] = await pool.query(
      `INSERT INTO donation_claims (donation_id, ngo_id, quantity, verification_code, status, claimed_at)
       VALUES (?, 61, 4, 'PW-EXPTEST1', 'Claimed', DATE_SUB(NOW(), INTERVAL 45 MINUTE))`,
      [expDon2Id]
    );
    const uncollClaimId = uncollClaimRes.insertId;

    // Trigger expire check run #1
    const expireRun1 = await kitchenAuth.client.post('/kitchen/donations/expire-check');
    assert(
      expireRun1.status === 200 && expireRun1.data.waste_logs_created > 0,
      'First expiry check identifies expired donations and creates waste logs',
      `waste_logs_created: ${expireRun1.data.waste_logs_created}`
    );

    // Count waste logs for this batch
    const [wasteCount1] = await pool.query(
      'SELECT COUNT(*) AS count FROM waste_logs WHERE food_batch_id = ?',
      [expBatchId]
    );

    // Trigger expire check run #2 immediately
    const expireRun2 = await kitchenAuth.client.post('/kitchen/donations/expire-check');
    assert(
      expireRun2.status === 200 && expireRun2.data.waste_logs_created === 0,
      'Second immediate expiry check creates 0 duplicate waste records',
      `waste_logs_created: ${expireRun2.data.waste_logs_created}`
    );

    const [wasteCount2] = await pool.query(
      'SELECT COUNT(*) AS count FROM waste_logs WHERE food_batch_id = ?',
      [expBatchId]
    );
    assert(
      wasteCount1[0].count === wasteCount2[0].count,
      'Expiry process is completely idempotent; waste log count unchanged'
    );

    // -------------------------------------------------------------------------
    // TEST 12: Concurrent claims do not over-allocate stock
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 12: Concurrent claims prevent over-allocation (InnoDB row locking) ---');
    // Create a batch with 10 portions remaining
    const [concBatchRes] = await pool.query(
      `INSERT INTO food_batches (menu_item_id, batch_date, cooked_qty, sold_qty, leftover_qty, status)
       VALUES (3, CURDATE(), 10, 0, 10, 'Active')`
    );
    const concBatchId = concBatchRes.insertId;

    const [concDonRes] = await pool.query(
      `INSERT INTO donations (food_batch_id, quantity, claimed_quantity, collection_deadline, status, donated_at)
       VALUES (?, 10, 0, DATE_ADD(NOW(), INTERVAL 2 HOUR), 'Available', NOW())`,
      [concBatchId]
    );
    const concDonId = concDonRes.insertId;

    // Both NGO 1 and NGO 2 concurrently send requests to claim 7 portions each (7 + 7 = 14 > 10)
    console.log('  Firing 2 simultaneous claim requests (each requesting 7 portions out of 10)...');
    const [resA, resB] = await Promise.all([
      ngo1Auth.client.post(`/ngo/donations/${concDonId}/claims`, { quantity: 7 }),
      ngo2Auth.client.post(`/ngo/donations/${concDonId}/claims`, { quantity: 7 }),
    ]);

    const statuses = [resA.status, resB.status];
    const successCount = statuses.filter((s) => s === 201).length;
    const conflictCount = statuses.filter((s) => s === 409).length;

    assert(
      successCount === 1 && conflictCount === 1,
      'Concurrent claims: exactly 1 claim succeeds (201) and 1 is rejected (409)',
      `results: ${statuses.join(', ')}`
    );

    // Verify database total claimed is exactly 7, not 14
    const [concDonCheck] = await pool.query(
      'SELECT claimed_quantity FROM donations WHERE donation_id = ?',
      [concDonId]
    );
    assert(
      concDonCheck[0].claimed_quantity === 7,
      'Database claimed_quantity is strictly 7; zero over-allocation occurred under race conditions'
    );

    // -------------------------------------------------------------------------
    // TEST 13: Legacy donation records remain accessible
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 13: Backward compatibility for legacy donation records ---');
    const allDonationsRes = await ngo1Auth.client.get('/ngo/donations?status=all');
    assert(allDonationsRes.status === 200, 'NGO can retrieve full history of donations including legacy seed batches');

    const legacySeedDonation = allDonationsRes.data.find((d) => d.donation_id === 1);
    assert(
      legacySeedDonation && legacySeedDonation.quantity === 11 && legacySeedDonation.food_name !== undefined,
      'Legacy donation #1 is accessible and formatted correctly with food_name'
    );

    const ngoHistoryRes = await ngo1Auth.client.get('/ngo/history');
    assert(
      ngoHistoryRes.status === 200 && Array.isArray(ngoHistoryRes.data) && ngoHistoryRes.data.length > 0,
      'NGO history returns both new child claims and legacy claims'
    );

    // Also verify legacy endpoint POST /ngo/donations/:id/claim
    const [legacyBatchRes] = await pool.query(
      `INSERT INTO food_batches (menu_item_id, batch_date, cooked_qty, sold_qty, leftover_qty, status)
       VALUES (4, CURDATE(), 20, 0, 20, 'Active')`
    );
    const [legacyDonRes] = await pool.query(
      `INSERT INTO donations (food_batch_id, quantity, claimed_quantity, collection_deadline, status, donated_at)
       VALUES (?, 8, 0, DATE_ADD(NOW(), INTERVAL 2 HOUR), 'Available', NOW())`,
      [legacyBatchRes.insertId]
    );
    const legacyDonId = legacyDonRes.insertId;

    const legacyClaimRes = await ngo1Auth.client.post(`/ngo/donations/${legacyDonId}/claim`);
    assert(
      legacyClaimRes.status === 200 && legacyClaimRes.data.status === 'Claimed',
      'Legacy endpoint POST /ngo/donations/:id/claim claims all portions and returns status Claimed',
      `HTTP ${legacyClaimRes.status}`
    );

    // Clean up test batches & donations created during this run to keep test db clean
    await pool.query('DELETE FROM donation_claims WHERE donation_id IN (?, ?, ?, ?)', [
      testDonationId,
      expDon2Id,
      concDonId,
      legacyDonId,
    ]);
    await pool.query('DELETE FROM donations WHERE donation_id IN (?, ?, ?, ?)', [
      testDonationId,
      expiredDonationId,
      expDon2Id,
      concDonId,
      legacyDonId,
    ]);
    await pool.query('DELETE FROM waste_logs WHERE food_batch_id IN (?, ?, ?)', [
      testBatchId,
      expBatchId,
      concBatchId,
    ]);
    await pool.query('DELETE FROM food_batches WHERE food_batch_id IN (?, ?, ?, ?)', [
      testBatchId,
      expBatchId,
      concBatchId,
      legacyBatchRes.insertId,
    ]);
    console.log('\n[Cleanup] Test-generated data cleanly pruned.');
  } finally {
    server.close();
  }

  // -------------------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------------------
  console.log('\n================================================================================');
  console.log(` Phase 3C.1 Test Suite Complete: ${passed} PASSED, ${failed} FAILED`);
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
