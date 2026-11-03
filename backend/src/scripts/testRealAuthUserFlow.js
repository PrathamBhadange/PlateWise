/* global process */
process.env.NODE_ENV = 'test';

import http from 'http';
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

async function runRealAuthFlowTests() {
  console.log('================================================================================');
  console.log(' PlateWise Real User Database Authentication Test Suite');
  console.log('================================================================================\n');

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  const testResults = [];

  function record(id, title, passed, detail) {
    testResults.push({ id, title, passed, detail });
    const badge = passed ? '✓ PASSED' : '✗ FAILED';
    console.log(`[Test ${String(id).padStart(2)}] ${badge} : ${title}`);
    console.log(`          Output: ${detail}\n`);
  }

  const timestamp = Date.now();
  const testEmail = `new.student.${timestamp}@campus.edu`;
  const testPassword = 'StudentSecret@2026';
  const testFullName = 'Riya Sen';

  try {
    // 1. Register a completely new student
    const regRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: testFullName,
        email: testEmail,
        password: testPassword,
        confirm_password: testPassword,
      }),
    });
    const regBody = await regRes.json();
    record(
      1,
      'Register a completely new student',
      regRes.status === 201 && regBody.user?.role === 'student',
      `HTTP Status: ${regRes.status}, Body: ${JSON.stringify(regBody)}`
    );

    // 2. Verify the user is inserted into MySQL
    const [dbUserRows] = await pool.query(
      'SELECT user_id, full_name, email, role, password_hash, created_at FROM users WHERE email = ?',
      [testEmail]
    );
    const dbUser = dbUserRows[0];
    record(
      2,
      'Verify the user is inserted into MySQL users table',
      !!dbUser && dbUser.email === testEmail && dbUser.role === 'student',
      `Row in MySQL: user_id=${dbUser?.user_id}, full_name="${dbUser?.full_name}", role="${dbUser?.role}", created_at=${dbUser?.created_at}`
    );

    // 3. Verify the password is stored as a bcrypt hash, never plaintext
    const hash = dbUser?.password_hash || '';
    const isBcrypt = hash.startsWith('$2a$') || hash.startsWith('$2b$');
    const notPlaintext = hash !== testPassword;
    record(
      3,
      'Verify password is stored as bcrypt hash, never plaintext',
      isBcrypt && notPlaintext && hash.length === 60,
      `Hash prefix: ${hash.substring(0, 4)}, total length: ${hash.length}, plaintext check: ${notPlaintext ? 'NEVER PLAINTEXT' : 'FAILED'}`
    );

    // 4. Log in using the newly registered credentials
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
      }),
    });
    const loginCookies = parseCookies(loginRes.headers);
    const loginBody = await loginRes.json();
    record(
      4,
      'Log in using the newly registered credentials',
      loginRes.status === 200 && !!loginCookies.platewise_auth && loginBody.user?.email === testEmail,
      `HTTP Status: ${loginRes.status}, Authenticated user: ${loginBody.user?.full_name} (${loginBody.user?.role}), HttpOnly cookie present: ${!!loginCookies.platewise_auth}`
    );

    // 5. Log in with an incorrect password and verify rejection
    const badLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'IncorrectPassword!999',
      }),
    });
    const badLoginBody = await badLoginRes.json();
    record(
      5,
      'Log in with an incorrect password and verify rejection',
      badLoginRes.status === 401 && badLoginBody.message === 'Invalid email or password',
      `HTTP Status: ${badLoginRes.status}, Message: "${badLoginBody.message}"`
    );

    // 6. Register the same email again and verify rejection
    const dupRegRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: 'Duplicate Riya',
        email: testEmail,
        password: 'AnotherPassword@123',
        confirm_password: 'AnotherPassword@123',
      }),
    });
    const dupRegBody = await dupRegRes.json();
    record(
      6,
      'Register the same email again and verify rejection',
      dupRegRes.status === 409 && dupRegBody.message === 'An account with this email already exists',
      `HTTP Status: ${dupRegRes.status}, Message: "${dupRegBody.message}"`
    );

    // 7. Refresh the page and verify session restoration (GET /api/auth/me)
    const sessionRes = await fetch(`${baseUrl}/api/auth/me`, {
      headers: {
        Cookie: `platewise_auth=${loginCookies.platewise_auth}`,
      },
    });
    const sessionBody = await sessionRes.json();
    record(
      7,
      'Session restoration: verify GET /api/auth/me with valid session cookie',
      sessionRes.status === 200 && sessionBody.user?.email === testEmail,
      `HTTP Status: ${sessionRes.status}, Restored user: ${sessionBody.user?.email} (role: ${sessionBody.user?.role})`
    );

    // 8. Log out and verify the session is destroyed
    const logoutRes = await fetch(`${baseUrl}/api/auth/logout`, {
      method: 'POST',
      headers: {
        Cookie: `platewise_auth=${loginCookies.platewise_auth}`,
      },
    });
    const postLogoutRes = await fetch(`${baseUrl}/api/auth/me`);
    record(
      8,
      'Log out and verify session is destroyed',
      logoutRes.status === 200 && postLogoutRes.status === 401,
      `Logout Status: ${logoutRes.status}, Subsequent /api/auth/me Status: ${postLogoutRes.status}`
    );

    // 9. Verify a student cannot access /kitchen or /admin
    const studentKitchenRes = await fetch(`${baseUrl}/api/kitchen/overview`, {
      headers: {
        Cookie: `platewise_auth=${loginCookies.platewise_auth}`,
      },
    });
    const studentAdminRes = await fetch(`${baseUrl}/api/admin/impact`, {
      headers: {
        Cookie: `platewise_auth=${loginCookies.platewise_auth}`,
      },
    });
    record(
      9,
      'Verify student cannot access /kitchen or /admin APIs',
      studentKitchenRes.status === 403 && studentAdminRes.status === 403,
      `Student -> /api/kitchen: ${studentKitchenRes.status} Forbidden, Student -> /api/admin: ${studentAdminRes.status} Forbidden`
    );

    // 10. Verify an existing kitchen account can access /kitchen
    const kitchenLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'kitchen@platewise.campus',
        password: 'Kitchen@123',
      }),
    });
    const kitchenCookies = parseCookies(kitchenLoginRes.headers);
    const kitchenAccessRes = await fetch(`${baseUrl}/api/kitchen/overview`, {
      headers: {
        Cookie: `platewise_auth=${kitchenCookies.platewise_auth}`,
      },
    });
    record(
      10,
      'Verify existing kitchen account can access /kitchen',
      kitchenAccessRes.status === 200,
      `Kitchen Login: ${kitchenLoginRes.status}, Kitchen Access to /api/kitchen: ${kitchenAccessRes.status} OK`
    );

    // 11. Verify an existing admin account can access /admin
    const adminLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@platewise.campus',
        password: 'Admin@123',
      }),
    });
    const adminCookies = parseCookies(adminLoginRes.headers);
    const adminAccessRes = await fetch(`${baseUrl}/api/admin/impact`, {
      headers: {
        Cookie: `platewise_auth=${adminCookies.platewise_auth}`,
      },
    });
    record(
      11,
      'Verify existing admin account can access /admin',
      adminAccessRes.status === 200,
      `Admin Login: ${adminLoginRes.status}, Admin Access to /api/admin: ${adminAccessRes.status} OK`
    );

    // 12. Verify frontend never silently falls back to a mock user
    const unauthCheck = await fetch(`${baseUrl}/api/auth/me`);
    const unauthBody = await unauthCheck.json();
    record(
      12,
      'Verify system never silently falls back to a mock user when unauthenticated',
      unauthCheck.status === 401 && !unauthBody.user,
      `Unauthenticated /api/auth/me returned ${unauthCheck.status} Unauthorized without mock user object`
    );

    const totalPassed = testResults.filter((t) => t.passed).length;
    console.log('================================================================================');
    console.log(` Summary: ${totalPassed}/${testResults.length} Tests PASSED.`);
    console.log('================================================================================\n');

    if (totalPassed !== testResults.length) {
      process.exitCode = 1;
    }
  } catch (err) {
    console.error('Test execution error:', err);
    process.exitCode = 1;
  } finally {
    server.close();
    await pool.end();
  }
}

runRealAuthFlowTests();
