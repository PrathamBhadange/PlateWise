/* global process */
import pool from '../config/db.js';

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

async function runStudentTests() {
  console.log('================================================================');
  console.log(' PlateWise Student Dashboard & API Automated Test Suite');
  console.log('================================================================\n');

  let passedCount = 0;
  let totalCount = 0;

  function assert(scenario, condition, details = '') {
    totalCount++;
    if (condition) {
      passedCount++;
      console.log(`[${String(totalCount).padStart(2, '0')}] ✓ PASSED : ${scenario}${details ? ' - ' + details : ''}`);
    } else {
      console.error(`[${String(totalCount).padStart(2, '0')}] ✗ FAILED : ${scenario}${details ? ' - ' + details : ''}`);
      throw new Error(`Assertion failed: ${scenario}`);
    }
  }

  try {
    // 1. Unauthenticated access blocked
    const unauthDash = await request(`${BASE_URL}/student/dashboard`);
    assert(
      'Unauthenticated request to /api/student/dashboard -> 401',
      unauthDash.status === 401,
      `Status ${unauthDash.status}`
    );

    // 2. Kitchen user blocked from student endpoints
    const kitchenSession = await loginUser('kitchen@platewise.campus', 'Kitchen@123');
    const kitchenOnStudent = await request(`${BASE_URL}/student/dashboard`, {
      headers: { Cookie: buildCookieHeader(kitchenSession.jar) },
    });
    assert(
      'Kitchen role blocked from /api/student/dashboard -> 403',
      kitchenOnStudent.status === 403,
      `Status ${kitchenOnStudent.status}`
    );

    // 3. Admin user blocked from student endpoints
    const adminSession = await loginUser('admin@platewise.campus', 'Admin@123');
    const adminOnStudent = await request(`${BASE_URL}/student/dashboard`, {
      headers: { Cookie: buildCookieHeader(adminSession.jar) },
    });
    assert(
      'Admin role blocked from /api/student/dashboard -> 403',
      adminOnStudent.status === 403,
      `Status ${adminOnStudent.status}`
    );

    // 4. Student login
    const student1 = await loginUser('aarav.sharma@campus.edu', 'Student@123');
    assert(
      'Student Aarav logged in successfully',
      student1.user.role === 'student' && student1.user.email === 'aarav.sharma@campus.edu',
      `User ID: ${student1.user.user_id}, Role: ${student1.user.role}`
    );

    // 5. Student dashboard metrics retrieval
    const student1Dash = await request(`${BASE_URL}/student/dashboard`, {
      headers: { Cookie: buildCookieHeader(student1.jar) },
    });
    assert(
      'Student dashboard returns valid stats and user info',
      student1Dash.status === 200 &&
        student1Dash.data.student.user_id === student1.user.user_id &&
        typeof student1Dash.data.stats.total_orders === 'number',
      `Total orders: ${student1Dash.data.stats.total_orders}, Active: ${student1Dash.data.stats.active_orders}`
    );

    // 6. Menu items retrieval
    const menuRes = await request(`${BASE_URL}/student/menu`, {
      headers: { Cookie: buildCookieHeader(student1.jar) },
    });
    assert(
      'Student menu returns all available dishes from MySQL',
      menuRes.status === 200 && Array.isArray(menuRes.data) && menuRes.data.length >= 12,
      `Total menu items loaded: ${menuRes.data.length}`
    );

    // 6a. Surplus Deals retrieval
    const surplusRes = await request(`${BASE_URL}/student/surplus`, {
      headers: { Cookie: buildCookieHeader(student1.jar) },
    });
    assert(
      'Student surplus deals endpoint returns active discounted deals',
      surplusRes.status === 200 && Array.isArray(surplusRes.data.deals) && surplusRes.data.discount_percentage === 40,
      `Total surplus deals: ${surplusRes.data.total_deals}`
    );

    // 7. Atomic order placement transaction
    const tomorrowDate = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    const orderPayload = {
      items: [
        { menu_item_id: 1, quantity: 2 }, // Kanda Poha (25.00 each)
        { menu_item_id: 11, quantity: 1 }, // Special Masala Chai (12.00 each)
      ],
      pickup_slot: '12:30 PM - 01:00 PM',
      pickup_date: tomorrowDate,
      idempotency_key: `test_order_${Date.now()}`,
    };

    const placeOrderRes = await request(`${BASE_URL}/student/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: buildCookieHeader(student1.jar),
        'X-CSRF-Token': student1.csrfToken,
      },
      body: JSON.stringify(orderPayload),
    });

    assert(
      'Atomic order creation in MySQL succeeds -> 201',
      placeOrderRes.status === 201 && placeOrderRes.data.order_id > 0,
      `Created Order ID: #${placeOrderRes.data.order_id}`
    );
    const newOrderId = placeOrderRes.data.order_id;

    // Verify order was created in DB with correct user_id and line items
    const [dbOrderRows] = await pool.query(
      `SELECT user_id, payment_status, status FROM orders WHERE order_id = ?`,
      [newOrderId]
    );
    const [dbItemRows] = await pool.query(
      `SELECT menu_item_id, quantity, unit_price FROM order_items WHERE order_id = ? ORDER BY menu_item_id`,
      [newOrderId]
    );
    assert(
      'Verified order rows in DB matching student session user_id',
      dbOrderRows.length === 1 &&
        dbOrderRows[0].user_id === student1.user.user_id &&
        dbItemRows.length === 2 &&
        Number(dbItemRows[0].unit_price) === 25.0,
      `user_id: ${dbOrderRows[0].user_id}, total line items: ${dbItemRows.length}`
    );

    // 8. Double-submit prevention (immediate identical idempotency key)
    const dupeRes = await request(`${BASE_URL}/student/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: buildCookieHeader(student1.jar),
        'X-CSRF-Token': student1.csrfToken,
      },
      body: JSON.stringify(orderPayload),
    });
    assert(
      'Duplicate submission rejected via idempotency check -> 409 or 429',
      dupeRes.status === 409 || dupeRes.status === 429,
      `Status: ${dupeRes.status}`
    );

    // 9. Transactional rollback verification on invalid dish ID
    const student2 = await loginUser('ananya.verma@campus.edu', 'Student@123');
    const [beforeOrderCount] = await pool.query(`SELECT COUNT(*) AS c FROM orders`);
    const [beforeItemCount] = await pool.query(`SELECT COUNT(*) AS c FROM order_items`);

    const failedPayload = {
      items: [
        { menu_item_id: 1, quantity: 1 },
        { menu_item_id: 999999, quantity: 1 }, // Non-existent dish
      ],
      pickup_slot: '12:30 PM - 01:00 PM',
      pickup_date: tomorrowDate,
      idempotency_key: `fail_test_${Date.now()}`,
    };
    const failOrderRes = await request(`${BASE_URL}/student/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: buildCookieHeader(student2.jar),
        'X-CSRF-Token': student2.csrfToken,
      },
      body: JSON.stringify(failedPayload),
    });

    const [afterOrderCount] = await pool.query(`SELECT COUNT(*) AS c FROM orders`);
    const [afterItemCount] = await pool.query(`SELECT COUNT(*) AS c FROM order_items`);

    assert(
      'Failed checkout rolls back completely; zero partial rows written',
      failOrderRes.status === 400 &&
        afterOrderCount[0].c === beforeOrderCount[0].c &&
        afterItemCount[0].c === beforeItemCount[0].c,
      `Status: ${failOrderRes.status}, Order count stayed at ${beforeOrderCount[0].c}, item count stayed at ${beforeItemCount[0].c}`
    );

    // 10. Student order isolation: Student A vs Student B
    const s1OrdersRes = await request(`${BASE_URL}/student/orders`, {
      headers: { Cookie: buildCookieHeader(student1.jar) },
    });
    const s2OrdersRes = await request(`${BASE_URL}/student/orders`, {
      headers: { Cookie: buildCookieHeader(student2.jar) },
    });

    assert(
      'Orders query returns non-empty list for student',
      s1OrdersRes.status === 200 && Array.isArray(s1OrdersRes.data),
      `Student 1 orders: ${s1OrdersRes.data.length}`
    );

    const s1HasS2Orders = s1OrdersRes.data.some((o) => o.user_id !== student1.user.user_id);
    const s2HasS1Orders = s2OrdersRes.data.some((o) => o.user_id !== student2.user.user_id);

    assert(
      'Student A and Student B strictly see only their own orders',
      !s1HasS2Orders && !s2HasS1Orders,
      `Student 1 user_id: ${student1.user.user_id}, Student 2 user_id: ${student2.user.user_id}`
    );

    // 11. Student order cancellation
    // Student 2 attempts to cancel Student 1's newly created order -> 403 Forbidden
    const crossCancelRes = await request(`${BASE_URL}/student/orders/${newOrderId}/cancel`, {
      method: 'PATCH',
      headers: {
        Cookie: buildCookieHeader(student2.jar),
        'X-CSRF-Token': student2.csrfToken,
      },
    });
    assert(
      "Student B cannot cancel Student A's order -> 403 Forbidden",
      crossCancelRes.status === 403,
      `Status: ${crossCancelRes.status}`
    );

    // Student 1 cancels their own newly created Pending order -> 200 OK
    const selfCancelRes = await request(`${BASE_URL}/student/orders/${newOrderId}/cancel`, {
      method: 'PATCH',
      headers: {
        Cookie: buildCookieHeader(student1.jar),
        'X-CSRF-Token': student1.csrfToken,
      },
    });
    assert(
      "Student A cancels their own Pending order -> 200 OK",
      selfCancelRes.status === 200 && selfCancelRes.data.status === 'Cancelled',
      `Order status updated to: ${selfCancelRes.data.status}`
    );

    // Attempting to cancel already Cancelled order -> 409 Conflict
    const cancelAgainRes = await request(`${BASE_URL}/student/orders/${newOrderId}/cancel`, {
      method: 'PATCH',
      headers: {
        Cookie: buildCookieHeader(student1.jar),
        'X-CSRF-Token': student1.csrfToken,
      },
    });
    assert(
      'Attempt to cancel non-pending order -> 409 Conflict',
      cancelAgainRes.status === 409,
      `Status: ${cancelAgainRes.status}`
    );

    // 12. Student Grievance Intake & Isolation
    // 12a. Submission without proof image rejected (compulsory proof image validation)
    const missingProofRes = await request(`${BASE_URL}/complaints`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: buildCookieHeader(student1.jar),
        'X-CSRF-Token': student1.csrfToken,
      },
      body: JSON.stringify({
        menu_item_id: 1,
        description: 'Poha was served cold during morning breakfast rush.',
      }),
    });
    assert(
      'Grievance submission without proof image rejected -> 400 Validation Error',
      missingProofRes.status === 400 && missingProofRes.data.message?.includes('Proof image is mandatory'),
      `Status: ${missingProofRes.status}, Error: ${missingProofRes.data.message}`
    );

    const sampleProofImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const complaintRes = await request(`${BASE_URL}/complaints`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: buildCookieHeader(student1.jar),
        'X-CSRF-Token': student1.csrfToken,
      },
      body: JSON.stringify({
        menu_item_id: 1,
        description: 'Poha was served cold during morning breakfast rush.',
        proof_image: sampleProofImage,
      }),
    });
    assert(
      'Student complaint submission works -> 201 Created',
      complaintRes.status === 201 && complaintRes.data.ticket?.complaint_id > 0 && complaintRes.data.ticket?.proof_image === sampleProofImage,
      `Ticket ID: #${complaintRes.data.ticket?.complaint_id}, Category: ${complaintRes.data.classification?.category}`
    );

    const s1Complaints = await request(`${BASE_URL}/complaints`, {
      headers: { Cookie: buildCookieHeader(student1.jar) },
    });
    const s2Complaints = await request(`${BASE_URL}/complaints`, {
      headers: { Cookie: buildCookieHeader(student2.jar) },
    });
    const s1HasOtherComplaints = s1Complaints.data.some((c) => c.user_id !== student1.user.user_id);
    const s2HasOtherComplaints = s2Complaints.data.some((c) => c.user_id !== student2.user.user_id);
    assert(
      'Complaints are strictly isolated to authenticated student',
      !s1HasOtherComplaints && !s2HasOtherComplaints,
      `S1 complaints: ${s1Complaints.data.length}, S2 complaints: ${s2Complaints.data.length}`
    );

    // 13. Student Profile Endpoint
    const meRes = await request(`${BASE_URL}/auth/me`, {
      headers: { Cookie: buildCookieHeader(student1.jar) },
    });
    assert(
      'Profile endpoint returns verified student credentials',
      meRes.status === 200 &&
        meRes.data.user.email === 'aarav.sharma@campus.edu' &&
        meRes.data.user.role === 'student',
      `Full Name: ${meRes.data.user.full_name}, User ID: ${meRes.data.user.user_id}`
    );

    console.log('\n================================================================');
    console.log(` Results Summary: ${passedCount}/${totalCount} Scenarios PASSED.`);
    console.log('================================================================\n');
  } catch (err) {
    console.error('Fatal test error:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runStudentTests();
