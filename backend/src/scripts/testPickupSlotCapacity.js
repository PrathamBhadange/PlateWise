/* global process */
import pool from '../config/db.js';
import {
  getCurrentKolkataDate,
  getCurrentKolkataTime,
} from '../config/slotConfig.js';

const BASE_URL = 'http://localhost:5000/api';

async function request(url, options = {}) {
  const headers = { ...(options.headers || {}) };
  const res = await fetch(url, {
    ...options,
    headers,
  });

  const cookies = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
  const contentType = res.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await res.json() : await res.text();

  return { status: res.status, data, cookies, headers: res.headers };
}

function parseCookies(cookieHeaders) {
  const jar = {};
  for (const c of cookieHeaders) {
    const parts = c.split(';')[0].split('=');
    if (parts.length >= 2) {
      jar[parts[0].trim()] = parts.slice(1).join('=').trim();
    }
  }
  return jar;
}

function buildCookieHeader(jar) {
  return Object.entries(jar)
    .map(([k, v]) => `${k}=${v}`)
    .join('; ');
}

async function loginUser(email, password) {
  const res = await request(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (res.status !== 200) {
    throw new Error(`Login failed for ${email}: ${res.status} ${JSON.stringify(res.data)}`);
  }

  const jar = parseCookies(res.cookies);
  return { user: res.data.user, jar, csrfToken: jar['csrf_token'] };
}

async function runSlotCapacityTests() {
  console.log('================================================================');
  console.log(' PlateWise Pickup Slot Capacity & Concurrency Test Suite');
  console.log(' Member 2 Phase 1: Overbooking Prevention & Concurrency Verification');
  console.log('================================================================\n');

  let passedCount = 0;
  let totalCount = 0;
  const testResults = [];

  function recordScenario(caseNum, name, condition, details = '') {
    totalCount++;
    if (condition) {
      passedCount++;
      console.log(`[Case ${caseNum}] ✓ PASSED : ${name}${details ? ' - ' + details : ''}`);
      testResults.push({ caseNum, name, status: 'PASSED', details });
    } else {
      console.error(`[Case ${caseNum}] ✗ FAILED : ${name}${details ? ' - ' + details : ''}`);
      testResults.push({ caseNum, name, status: 'FAILED', details });
      throw new Error(`Assertion failed: [Case ${caseNum}] ${name}`);
    }
  }

  // Isolated test dates and slot
  const TEST_DATE_CAPACITY = '2099-11-20';
  const TEST_DATE_CONCURRENCY = '2099-11-21';
  const TEST_SLOT = '12:00 PM - 12:30 PM';

  const createdOrderIds = [];
  const createdOverrideSlotIds = [];

  try {
    // 0. Authenticate test students
    const student1 = await loginUser('aarav.sharma@campus.edu', 'Student@123');
    const student2 = await loginUser('ananya.verma@campus.edu', 'Student@123');
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

    // Fetch slot_id for TEST_SLOT
    const [slotMeta] = await pool.query(
      `SELECT slot_id, max_capacity FROM pickup_slots WHERE slot = ?`,
      [TEST_SLOT]
    );
    const testSlotId = slotMeta[0]?.slot_id;
    if (!testSlotId) {
      throw new Error(`Test slot '${TEST_SLOT}' not found in pickup_slots table`);
    }

    // Set up low test capacity (max_capacity = 2) for TEST_DATE_CAPACITY
    await pool.query(
      `INSERT INTO pickup_slot_overrides (slot_id, pickup_date, max_capacity)
       VALUES (?, ?, 2)
       ON DUPLICATE KEY UPDATE max_capacity = 2`,
      [testSlotId, TEST_DATE_CAPACITY]
    );
    createdOverrideSlotIds.push({ slot_id: testSlotId, date: TEST_DATE_CAPACITY });

    // ------------------------------------------------------------------------
    // CASE 1: Normal booking succeeds
    // ------------------------------------------------------------------------
    const res1 = await request(`${BASE_URL}/student/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: buildCookieHeader(student1.jar),
        'X-CSRF-Token': student1.csrfToken,
      },
      body: JSON.stringify({
        items: [{ menu_item_id: 1, quantity: 1 }],
        pickup_slot: TEST_SLOT,
        pickup_date: TEST_DATE_CAPACITY,
        idempotency_key: `slot_c1_${Date.now()}`,
      }),
    });

    if (res1.data?.order_id) createdOrderIds.push(res1.data.order_id);

    // Verify slots endpoint reflects 1 booked, 1 remaining, filling_fast status
    const slotsRes1 = await request(
      `${BASE_URL}/student/pickup-slots?date=${TEST_DATE_CAPACITY}`,
      { headers: { Cookie: buildCookieHeader(student1.jar) } }
    );
    const slotData1 = slotsRes1.data.find((s) => s.slot === TEST_SLOT);

    recordScenario(
      1,
      'Normal booking succeeds',
      res1.status === 201 &&
        res1.data.order_id > 0 &&
        slotData1?.booked_count === 1 &&
        slotData1?.available_capacity === 1,
      `Order #${res1.data.order_id} created. Booked: ${slotData1?.booked_count}/2, remaining: ${slotData1?.available_capacity}`
    );

    // ------------------------------------------------------------------------
    // CASE 2: Booking the last available spot succeeds
    // ------------------------------------------------------------------------
    const res2 = await request(`${BASE_URL}/student/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: buildCookieHeader(student2.jar),
        'X-CSRF-Token': student2.csrfToken,
      },
      body: JSON.stringify({
        items: [{ menu_item_id: 2, quantity: 1 }],
        pickup_slot: TEST_SLOT,
        pickup_date: TEST_DATE_CAPACITY,
        idempotency_key: `slot_c2_${Date.now()}`,
      }),
    });

    if (res2.data?.order_id) createdOrderIds.push(res2.data.order_id);

    const slotsRes2 = await request(
      `${BASE_URL}/student/pickup-slots?date=${TEST_DATE_CAPACITY}`,
      { headers: { Cookie: buildCookieHeader(student2.jar) } }
    );
    const slotData2 = slotsRes2.data.find((s) => s.slot === TEST_SLOT);

    recordScenario(
      2,
      'Booking the last available spot succeeds',
      res2.status === 201 &&
        res2.data.order_id > 0 &&
        slotData2?.booked_count === 2 &&
        slotData2?.available_capacity === 0 &&
        slotData2?.is_full === true &&
        slotData2?.status === 'full',
      `Order #${res2.data.order_id} created. Capacity reached: 2/2, status: ${slotData2?.status}`
    );

    // ------------------------------------------------------------------------
    // CASE 3: A booking after capacity is reached is rejected with 409
    // ------------------------------------------------------------------------
    console.log('[Wait] Pausing 6.5s to clear 5s double-submit window...');
    await sleep(6500);

    const res3 = await request(`${BASE_URL}/student/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: buildCookieHeader(student1.jar),
        'X-CSRF-Token': student1.csrfToken,
      },
      body: JSON.stringify({
        items: [{ menu_item_id: 1, quantity: 1 }],
        pickup_slot: TEST_SLOT,
        pickup_date: TEST_DATE_CAPACITY,
        idempotency_key: `slot_c3_${Date.now()}`,
      }),
    });

    recordScenario(
      3,
      'A booking after capacity is reached is rejected with 409',
      res3.status === 409 &&
        res3.data?.code === 'SLOT_FULL' &&
        typeof res3.data?.message === 'string',
      `HTTP ${res3.status}, code: '${res3.data?.code}', message: '${res3.data?.message}'`
    );

    // ------------------------------------------------------------------------
    // CASE 4: Two concurrent requests for the final spot: exactly one succeeds, one rejected
    // ------------------------------------------------------------------------
    // Set test capacity = 1 for TEST_DATE_CONCURRENCY
    await pool.query(
      `INSERT INTO pickup_slot_overrides (slot_id, pickup_date, max_capacity)
       VALUES (?, ?, 1)
       ON DUPLICATE KEY UPDATE max_capacity = 1`,
      [testSlotId, TEST_DATE_CONCURRENCY]
    );
    createdOverrideSlotIds.push({ slot_id: testSlotId, date: TEST_DATE_CONCURRENCY });

    await sleep(6500);

    const reqA = request(`${BASE_URL}/student/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: buildCookieHeader(student1.jar),
        'X-CSRF-Token': student1.csrfToken,
      },
      body: JSON.stringify({
        items: [{ menu_item_id: 1, quantity: 1 }],
        pickup_slot: TEST_SLOT,
        pickup_date: TEST_DATE_CONCURRENCY,
        idempotency_key: `concurrent_A_${Date.now()}`,
      }),
    });

    const reqB = request(`${BASE_URL}/student/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: buildCookieHeader(student2.jar),
        'X-CSRF-Token': student2.csrfToken,
      },
      body: JSON.stringify({
        items: [{ menu_item_id: 2, quantity: 1 }],
        pickup_slot: TEST_SLOT,
        pickup_date: TEST_DATE_CONCURRENCY,
        idempotency_key: `concurrent_B_${Date.now()}`,
      }),
    });

    const [concurA, concurB] = await Promise.all([reqA, reqB]);

    if (concurA.data?.order_id) createdOrderIds.push(concurA.data.order_id);
    if (concurB.data?.order_id) createdOrderIds.push(concurB.data.order_id);

    const statuses = [concurA.status, concurB.status].sort();
    const [dbCountRows] = await pool.query(
      `SELECT COUNT(*) AS c FROM orders WHERE pickup_date = ? AND pickup_slot = ? AND LOWER(status) != 'cancelled'`,
      [TEST_DATE_CONCURRENCY, TEST_SLOT]
    );
    const dbBookedCount = Number(dbCountRows[0]?.c || 0);

    const oneSucceededOneFailed = statuses[0] === 201 && statuses[1] === 409;
    const countNeverExceeded = dbBookedCount === 1;

    recordScenario(
      4,
      'Two concurrent requests for final spot: exactly one succeeds, one rejected (409)',
      oneSucceededOneFailed && countNeverExceeded,
      `Status A: ${concurA.status}, Status B: ${concurB.status}, DB Booked Count: ${dbBookedCount}/1`
    );

    // ------------------------------------------------------------------------
    // CASE 5: A cancelled order releases capacity
    // ------------------------------------------------------------------------
    const winningOrderId = concurA.status === 201 ? concurA.data.order_id : concurB.data.order_id;
    const winningStudent = concurA.status === 201 ? student1 : student2;

    // Cancel winning order
    const cancelRes = await request(`${BASE_URL}/student/orders/${winningOrderId}/cancel`, {
      method: 'PATCH',
      headers: {
        Cookie: buildCookieHeader(winningStudent.jar),
        'X-CSRF-Token': winningStudent.csrfToken,
      },
    });

    // Check slot availability again - capacity should be restored to 1 available
    const slotsAfterCancel = await request(
      `${BASE_URL}/student/pickup-slots?date=${TEST_DATE_CONCURRENCY}`,
      { headers: { Cookie: buildCookieHeader(student1.jar) } }
    );
    const slotAfterCancelData = slotsAfterCancel.data.find((s) => s.slot === TEST_SLOT);

    await sleep(6500);

    // Place a new booking into the released spot
    const resAfterCancel = await request(`${BASE_URL}/student/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: buildCookieHeader(student1.jar),
        'X-CSRF-Token': student1.csrfToken,
      },
      body: JSON.stringify({
        items: [{ menu_item_id: 1, quantity: 1 }],
        pickup_slot: TEST_SLOT,
        pickup_date: TEST_DATE_CONCURRENCY,
        idempotency_key: `released_spot_${Date.now()}`,
      }),
    });
    if (resAfterCancel.data?.order_id) createdOrderIds.push(resAfterCancel.data.order_id);

    recordScenario(
      5,
      'A cancelled order releases capacity',
      cancelRes.status === 200 &&
        slotAfterCancelData?.available_capacity === 1 &&
        resAfterCancel.status === 201,
      `Order #${winningOrderId} cancelled -> Slot released -> New Order #${resAfterCancel.data?.order_id} booked successfully`
    );

    // ------------------------------------------------------------------------
    // CASE 6: A past slot on current date is rejected, and a past date is rejected
    // ------------------------------------------------------------------------
    // 6a: Past date
    const pastDateRes = await request(`${BASE_URL}/student/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: buildCookieHeader(student1.jar),
        'X-CSRF-Token': student1.csrfToken,
      },
      body: JSON.stringify({
        items: [{ menu_item_id: 1, quantity: 1 }],
        pickup_slot: TEST_SLOT,
        pickup_date: '2020-01-01',
        idempotency_key: `past_date_${Date.now()}`,
      }),
    });

    // 6b: Past slot on current date
    await sleep(6500);
    const today = getCurrentKolkataDate();
    const currentTime = getCurrentKolkataTime();

    // If test is run before 12:00:00 (e.g. early morning or midnight), temporarily set start_time to 00:00:00 so slot is in past
    const isEarlyMorning = currentTime < '12:00:00';
    if (isEarlyMorning) {
      await pool.query("UPDATE pickup_slots SET start_time = '00:00:00' WHERE slot = '12:00 PM - 12:30 PM'");
    }

    const pastSlotTodayRes = await request(`${BASE_URL}/student/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: buildCookieHeader(student1.jar),
        'X-CSRF-Token': student1.csrfToken,
      },
      body: JSON.stringify({
        items: [{ menu_item_id: 1, quantity: 1 }],
        pickup_slot: '12:00 PM - 12:30 PM',
        pickup_date: today,
        idempotency_key: `past_slot_${Date.now()}`,
      }),
    });

    if (isEarlyMorning) {
      await pool.query("UPDATE pickup_slots SET start_time = '12:00:00' WHERE slot = '12:00 PM - 12:30 PM'");
    }

    recordScenario(
      6,
      'A past slot on the current date is rejected, and a past date is rejected',
      pastDateRes.status === 400 &&
        pastSlotTodayRes.status === 400 &&
        pastSlotTodayRes.data?.error === 'Past Slot',
      `Past date status: ${pastDateRes.status} ('${pastDateRes.data?.error}'), Past slot status: ${pastSlotTodayRes.status} ('${pastSlotTodayRes.data?.message}') at current time ${currentTime}`
    );

    // ------------------------------------------------------------------------
    // CASE 7: Invalid date formats and invalid slot values are rejected
    // ------------------------------------------------------------------------
    const invalidDateFormatRes = await request(`${BASE_URL}/student/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: buildCookieHeader(student1.jar),
        'X-CSRF-Token': student1.csrfToken,
      },
      body: JSON.stringify({
        items: [{ menu_item_id: 1, quantity: 1 }],
        pickup_slot: TEST_SLOT,
        pickup_date: '2026-02-30', // Feb 30 does not exist
        idempotency_key: `invalid_date_${Date.now()}`,
      }),
    });

    const invalidSlotRes = await request(`${BASE_URL}/student/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: buildCookieHeader(student1.jar),
        'X-CSRF-Token': student1.csrfToken,
      },
      body: JSON.stringify({
        items: [{ menu_item_id: 1, quantity: 1 }],
        pickup_slot: '03:00 AM - 04:00 AM', // Non-existent slot
        pickup_date: '2099-12-31',
        idempotency_key: `invalid_slot_${Date.now()}`,
      }),
    });

    recordScenario(
      7,
      'Invalid date formats and invalid slot values are rejected',
      invalidDateFormatRes.status === 400 &&
        invalidSlotRes.status === 400 &&
        invalidDateFormatRes.data?.error === 'Invalid Date' &&
        invalidSlotRes.data?.error === 'Invalid Slot',
      `Invalid date status: ${invalidDateFormatRes.status} ('${invalidDateFormatRes.data?.message}'), Invalid slot status: ${invalidSlotRes.status} ('${invalidSlotRes.data?.message}')`
    );

    // ------------------------------------------------------------------------
    // CASE 8: Existing student checkout behavior still works (regression)
    // ------------------------------------------------------------------------
    await sleep(6500);
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    const regressionRes = await request(`${BASE_URL}/student/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: buildCookieHeader(student1.jar),
        'X-CSRF-Token': student1.csrfToken,
      },
      body: JSON.stringify({
        items: [
          { menu_item_id: 1, quantity: 2 },
          { menu_item_id: 11, quantity: 2 },
        ],
        pickup_slot: '12:30 PM - 01:00 PM',
        pickup_date: tomorrow,
        idempotency_key: `regress_${Date.now()}`,
      }),
    });
    if (regressionRes.data?.order_id) createdOrderIds.push(regressionRes.data.order_id);

    // Verify order retrieved in orders list
    const myOrdersRes = await request(`${BASE_URL}/student/orders`, {
      headers: { Cookie: buildCookieHeader(student1.jar) },
    });
    const foundOrder = myOrdersRes.data.find(
      (o) => o.order_id === regressionRes.data?.order_id
    );

    recordScenario(
      8,
      'Existing student checkout behavior still works (regression)',
      regressionRes.status === 201 &&
        foundOrder &&
        foundOrder.pickup_slot === '12:30 PM - 01:00 PM' &&
        Number(foundOrder.total_amount) === 74.0, // (2 * 25) + (2 * 12) = 74
      `Order #${regressionRes.data?.order_id} verified in student history with total ₹${foundOrder?.total_amount}`
    );

    console.log('\n================================================================');
    console.log(` Results Summary: ${passedCount}/${totalCount} Test Cases PASSED.`);
    console.log('================================================================\n');
  } catch (err) {
    console.error('Fatal test execution failure:', err);
    process.exitCode = 1;
  } finally {
    // Isolated Cleanup: Never leave test rows in real database tables
    console.log('[Cleanup] Cleaning up isolated test orders and overrides...');
    try {
      if (createdOrderIds.length > 0) {
        await pool.query(`DELETE FROM payments WHERE order_id IN (?)`, [createdOrderIds]);
        await pool.query(`DELETE FROM order_items WHERE order_id IN (?)`, [createdOrderIds]);
        await pool.query(`DELETE FROM orders WHERE order_id IN (?)`, [createdOrderIds]);
        console.log(`[Cleanup] ✓ Deleted ${createdOrderIds.length} isolated test order(s)`);
      }
      for (const ov of createdOverrideSlotIds) {
        await pool.query(
          `DELETE FROM pickup_slot_overrides WHERE slot_id = ? AND pickup_date = ?`,
          [ov.slot_id, ov.date]
        );
      }
      console.log(`[Cleanup] ✓ Cleaned up ${createdOverrideSlotIds.length} test slot override(s)`);
    } catch (cleanupErr) {
      console.error('[Cleanup Error]:', cleanupErr);
    }
    await pool.end();
  }
}

runSlotCapacityTests();
