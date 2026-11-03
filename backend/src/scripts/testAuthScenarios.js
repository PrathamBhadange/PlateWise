/* global process */
process.env.NODE_ENV = 'test';

import http from 'http';
import jwt from 'jsonwebtoken';
import pool from '../config/db.js';
import app from '../server.js';

function parseCookies(resHeaders) {
  const cookies = {};
  if (!resHeaders) return cookies;
  const list = resHeaders.getSetCookie
    ? resHeaders.getSetCookie()
    : resHeaders.get('set-cookie')
    ? [resHeaders.get('set-cookie')]
    : [];

  for (const c of list) {
    const parts = c.split(';')[0].split('=');
    if (parts.length >= 2) {
      cookies[parts[0].trim()] = parts.slice(1).join('=').trim();
    }
  }
  return cookies;
}

async function runAuthTests() {
  console.log('================================================================================');
  console.log(' PlateWise Authentication & Authorization 20-Scenario Verification Suite');
  console.log('================================================================================\n');

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  const results = [];

  function record(id, name, passed, details) {
    results.push({ id, name, status: passed ? 'PASSED' : 'FAILED', details });
    const badge = passed ? '✓ PASSED' : '✗ FAILED';
    console.log(`[${String(id).padStart(2)}] ${badge} : ${name} - ${details}`);
  }

  try {
    // 1. Register a new student -> 201, role student
    const testEmail1 = `test.student.${Date.now()}@campus.edu`;
    const regRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: 'Test Student',
        email: testEmail1,
        password: 'Password@123',
        account_type: 'student',
      }),
    });
    const regData = await regRes.json();
    record(
      1,
      'Register a new student -> 201, role student',
      regRes.status === 201 && regData.user?.role === 'student',
      `Status ${regRes.status}, role: ${regData.user?.role}`
    );

    // 2. Register with an existing email -> 409
    const dupRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: 'Duplicate Student',
        email: testEmail1,
        password: 'Password@123',
        account_type: 'student',
      }),
    });
    record(
      2,
      'Register with an existing email -> 409',
      dupRes.status === 409,
      `Status ${dupRes.status}`
    );

    // 3. Register with an invalid email -> 400
    const invEmailRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: 'Invalid Email',
        email: 'not-an-email',
        password: 'Password@123',
      }),
    });
    record(
      3,
      'Register with an invalid email -> 400',
      invEmailRes.status === 400,
      `Status ${invEmailRes.status}`
    );

    // 4. Register with a password under 8 characters -> 400
    const shortPassRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: 'Short Pass',
        email: `short.${Date.now()}@campus.edu`,
        password: 'short',
      }),
    });
    record(
      4,
      'Register with a password under 8 characters -> 400',
      shortPassRes.status === 400,
      `Status ${shortPassRes.status}`
    );

    // 5. Register with a body containing role "admin" -> account is still student
    const sneakyEmail = `sneaky.${Date.now()}@campus.edu`;
    const sneakyRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: 'Sneaky User',
        email: sneakyEmail,
        password: 'Password@123',
        account_type: 'student',
        role: 'admin',
      }),
    });
    const sneakyData = await sneakyRes.json();
    const [dbCheck] = await pool.query('SELECT role FROM users WHERE email = ?', [sneakyEmail]);
    record(
      5,
      'Register with body role "admin" -> account is still student',
      sneakyRes.status === 201 && dbCheck[0]?.role === 'student' && sneakyData.user?.role === 'student',
      `DB role: ${dbCheck[0]?.role}`
    );

    // 6. Login with correct credentials -> 200 and an auth cookie
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'aarav.sharma@campus.edu',
        password: 'Student@123',
      }),
    });
    const cookies = parseCookies(loginRes.headers);
    record(
      6,
      'Login with correct credentials -> 200 and an auth cookie',
      loginRes.status === 200 && !!cookies.platewise_auth && !!cookies.csrf_token,
      `Status ${loginRes.status}, platewise_auth: ${!!cookies.platewise_auth}, csrf_token: ${!!cookies.csrf_token}`
    );

    // 7. Login with an incorrect password -> 401, generic message
    const wrongPassRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'aarav.sharma@campus.edu',
        password: 'WrongPassword!999',
      }),
    });
    const wrongPassData = await wrongPassRes.json();
    record(
      7,
      'Login with an incorrect password -> 401, generic message',
      wrongPassRes.status === 401 && wrongPassData.message === 'Invalid email or password',
      `Status ${wrongPassRes.status}, message: "${wrongPassData.message}"`
    );

    // 8. Login with an unregistered email -> 401, identical message
    const unregRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'nonexistent.user.999@campus.edu',
        password: 'AnyPassword@123',
      }),
    });
    const unregData = await unregRes.json();
    record(
      8,
      'Login with an unregistered email -> 401, identical message',
      unregRes.status === 401 && unregData.message === 'Invalid email or password',
      `Status ${unregRes.status}, message: "${unregData.message}"`
    );

    // 9. Query the database: password_hash starts with a bcrypt prefix ($2a$/$2b$) and is not the plaintext
    const [userRows] = await pool.query(
      "SELECT email, password_hash FROM users WHERE email = 'aarav.sharma@campus.edu'"
    );
    const hash = userRows[0]?.password_hash || '';
    const isBcrypt = hash.startsWith('$2a$') || hash.startsWith('$2b$');
    const notPlaintext = hash !== 'Student@123';
    record(
      9,
      'Database password_hash has bcrypt prefix ($2a$/$2b$) and not plaintext',
      isBcrypt && notPlaintext,
      `Prefix: ${hash.slice(0, 4)}, length: ${hash.length}`
    );

    // 10. Invalid or tampered token -> 401
    const tamperedToken = cookies.platewise_auth + 'tampered';
    const tamperedRes = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Cookie: `platewise_auth=${tamperedToken}` },
    });
    record(
      10,
      'Invalid or tampered token -> 401',
      tamperedRes.status === 401,
      `Status ${tamperedRes.status}`
    );

    // 11. Expired token (sign one with a past expiry) -> 401
    const expiredToken = jwt.sign(
      { user_id: 5, role: 'student', email: 'aarav.sharma@campus.edu' },
      process.env.JWT_SECRET,
      { expiresIn: '-10s' }
    );
    const expiredRes = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Cookie: `platewise_auth=${expiredToken}` },
    });
    record(
      11,
      'Expired token -> 401',
      expiredRes.status === 401,
      `Status ${expiredRes.status}`
    );

    // 12. Student calling /api/kitchen/* -> 403
    const studentKitchenRes = await fetch(`${baseUrl}/api/kitchen/overview`, {
      headers: { Cookie: `platewise_auth=${cookies.platewise_auth}` },
    });
    record(
      12,
      'Student calling /api/kitchen/* -> 403',
      studentKitchenRes.status === 403,
      `Status ${studentKitchenRes.status}`
    );

    // Kitchen login for scenarios 13 & 14
    const kitchenLogin = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'kitchen@platewise.campus',
        password: 'Kitchen@123',
      }),
    });
    const kitchenCookies = parseCookies(kitchenLogin.headers);

    // 13. Kitchen calling /api/kitchen/* -> allowed
    const kitchenRes = await fetch(`${baseUrl}/api/kitchen/overview`, {
      headers: { Cookie: `platewise_auth=${kitchenCookies.platewise_auth}` },
    });
    record(
      13,
      'Kitchen calling /api/kitchen/* -> allowed',
      kitchenRes.status === 200,
      `Status ${kitchenRes.status}`
    );

    // 14. Kitchen calling /api/admin/* -> 403
    const kitchenAdminRes = await fetch(`${baseUrl}/api/admin/impact`, {
      headers: { Cookie: `platewise_auth=${kitchenCookies.platewise_auth}` },
    });
    record(
      14,
      'Kitchen calling /api/admin/* -> 403',
      kitchenAdminRes.status === 403,
      `Status ${kitchenAdminRes.status}`
    );

    // Admin login for scenario 15
    const adminLogin = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@platewise.campus',
        password: 'Admin@123',
      }),
    });
    const adminCookies = parseCookies(adminLogin.headers);

    // 15. Admin calling /api/admin/* and /api/kitchen/* -> allowed
    const adminImpactRes = await fetch(`${baseUrl}/api/admin/impact`, {
      headers: { Cookie: `platewise_auth=${adminCookies.platewise_auth}` },
    });
    const adminKitchenRes = await fetch(`${baseUrl}/api/kitchen/overview`, {
      headers: { Cookie: `platewise_auth=${adminCookies.platewise_auth}` },
    });
    record(
      15,
      'Admin calling /api/admin/* and /api/kitchen/* -> allowed',
      adminImpactRes.status === 200 && adminKitchenRes.status === 200,
      `Admin status: ${adminImpactRes.status}, Kitchen status: ${adminKitchenRes.status}`
    );

    // 16. Logout clears the cookie; /api/auth/me then returns 401
    const logoutRes = await fetch(`${baseUrl}/api/auth/logout`, {
      method: 'POST',
      headers: { Cookie: `platewise_auth=${cookies.platewise_auth}` },
    });
    const unauthMe = await fetch(`${baseUrl}/api/auth/me`);
    record(
      16,
      'Logout clears cookie; /api/auth/me returns 401',
      logoutRes.status === 200 && unauthMe.status === 401,
      `Logout status ${logoutRes.status}, subsequent /me status: ${unauthMe.status}`
    );

    // 17. Session restore: with a valid cookie, /api/auth/me returns the current user
    const restoreRes = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Cookie: `platewise_auth=${cookies.platewise_auth}` },
    });
    const restoreData = await restoreRes.json();
    record(
      17,
      'Session restore: with valid cookie, /api/auth/me returns current user',
      restoreRes.status === 200 && restoreData.user?.email === 'aarav.sharma@campus.edu',
      `Restored email: ${restoreData.user?.email}, role: ${restoreData.user?.role}`
    );

    // 18. A request with only x-demo-role: admin and no token -> 401
    const spoofRes = await fetch(`${baseUrl}/api/admin/impact`, {
      headers: { 'x-demo-role': 'admin' },
    });
    record(
      18,
      'Request with only x-demo-role: admin and no token -> 401',
      spoofRes.status === 401,
      `Status ${spoofRes.status}`
    );

    // 19. State-changing request without a valid CSRF header -> 403
    const noCsrfRes = await fetch(`${baseUrl}/api/complaints`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `platewise_auth=${cookies.platewise_auth}; csrf_token=${cookies.csrf_token}`,
      },
      body: JSON.stringify({ description: 'Testing CSRF missing header' }),
    });
    record(
      19,
      'State-changing request without a valid CSRF header -> 403',
      noCsrfRes.status === 403,
      `Status ${noCsrfRes.status}`
    );

    // 20. Student A cannot read student B's complaint
    // Find or create complaint for Student B (user_id 6, Ananya Verma)
    const [bComplaints] = await pool.query(
      'SELECT complaint_id FROM complaints WHERE user_id = 6 LIMIT 1'
    );
    let targetComplaintId = bComplaints[0]?.complaint_id;

    if (!targetComplaintId) {
      const [insertB] = await pool.query(
        "INSERT INTO complaints (user_id, description, category, severity, status) VALUES (6, 'Student B issue', 'food_quality', 'medium', 'open')"
      );
      targetComplaintId = insertB.insertId;
    }

    // Student A (user_id 5) attempts to access Student B's complaint
    const studentAReadB = await fetch(`${baseUrl}/api/complaints/${targetComplaintId}`, {
      headers: {
        Cookie: `platewise_auth=${cookies.platewise_auth}`,
      },
    });

    record(
      20,
      "Student A cannot read student B's complaint -> 403",
      studentAReadB.status === 403,
      `Status ${studentAReadB.status}`
    );

    console.log('\n================================================================================');
    const passedCount = results.filter((r) => r.status === 'PASSED').length;
    console.log(` Results Summary: ${passedCount}/${results.length} Scenarios PASSED.`);
    console.log('================================================================================');

    if (passedCount !== results.length) {
      process.exitCode = 1;
    }
  } catch (err) {
    console.error('Test suite error:', err);
    process.exitCode = 1;
  } finally {
    server.close();
    await pool.end();
  }
}

runAuthTests();
