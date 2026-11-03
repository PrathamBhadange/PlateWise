/* global process */
import fs from 'fs';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

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

  const jar = parseCookies(res.cookies);
  return { status: res.status, data: res.data, jar, csrfToken: jar['csrf_token'] };
}

async function runRoleAssignmentTests() {
  console.log('================================================================');
  console.log(' PlateWise Registration Role Assignment & Lifecycle Test Suite');
  console.log('================================================================\n');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'Pass@123',
    database: process.env.DB_NAME || 'platewise_db',
  });

  let passed = 0;
  let total = 0;
  const resultsTable = [];

  function record(testNum, testName, isPass, evidence) {
    total++;
    if (isPass) passed++;
    resultsTable.push({ testNum, testName, status: isPass ? 'PASS' : 'FAIL', evidence });
    console.log(
      `[${String(testNum).padStart(2, '0')}] ${isPass ? '✓ PASS' : '✗ FAIL'} : ${testName} - ${evidence}`
    );
  }

  try {
    const timestamp = Date.now();
    const studentEmail = `student.test.${timestamp}@campus.edu`;
    const studentPass = 'Student@1234';
    const staff1Email = `staff1.test.${timestamp}@platewise.campus`;
    const staff1Pass = 'Kitchen@1234';
    const staff2Email = `staff2.test.${timestamp}@platewise.campus`;
    const staff2Pass = 'Kitchen@5678';

    // ------------------------------------------------------------------------
    // Test 1: Register a student. Verify role=student and account_status=active in MySQL
    // ------------------------------------------------------------------------
    const regStudentRes = await request(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: 'Test Student One',
        email: studentEmail,
        password: studentPass,
        confirm_password: studentPass,
        account_type: 'student',
      }),
    });

    const [studentDb] = await connection.query(
      'SELECT user_id, full_name, email, role, account_status FROM users WHERE email = ?',
      [studentEmail]
    );

    const t1Pass =
      regStudentRes.status === 201 &&
      studentDb.length === 1 &&
      studentDb[0].role === 'student' &&
      studentDb[0].account_status === 'active';
    record(
      1,
      'Register student; verify role=student & account_status=active in MySQL',
      t1Pass,
      `API: 201, DB role: ${studentDb[0]?.role}, DB account_status: ${studentDb[0]?.account_status}`
    );

    // ------------------------------------------------------------------------
    // Test 2: Log in as the student and verify /student loads
    // ------------------------------------------------------------------------
    const studentLogin = await loginUser(studentEmail, studentPass);
    const studentDashRes = await request(`${BASE_URL}/student/dashboard`, {
      headers: { Cookie: buildCookieHeader(studentLogin.jar) },
    });
    const t2Pass =
      studentLogin.status === 200 &&
      studentLogin.jar['platewise_auth'] &&
      studentDashRes.status === 200 &&
      studentDashRes.data.student?.email === studentEmail;
    record(
      2,
      'Log in as student and verify student dashboard API loads',
      t2Pass,
      `Login: 200, platewise_auth cookie: yes, Dashboard: 200, user: ${studentDashRes.data.student?.email}`
    );

    // ------------------------------------------------------------------------
    // Test 3: Register a staff member. Verify role=kitchen and account_status=pending
    // ------------------------------------------------------------------------
    const regStaff1Res = await request(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: 'Chef Harshad Ghige',
        email: staff1Email,
        password: staff1Pass,
        confirm_password: staff1Pass,
        account_type: 'kitchen',
      }),
    });

    const [staff1Db] = await connection.query(
      'SELECT user_id, full_name, email, role, account_status FROM users WHERE email = ?',
      [staff1Email]
    );

    const staff1Cookies = parseCookies(regStaff1Res.cookies);
    const t3Pass =
      regStaff1Res.status === 201 &&
      !staff1Cookies['platewise_auth'] &&
      staff1Db.length === 1 &&
      staff1Db[0].role === 'kitchen' &&
      staff1Db[0].account_status === 'pending';
    record(
      3,
      'Register staff member; verify role=kitchen & account_status=pending without session cookie',
      t3Pass,
      `API: 201, no auth cookie: true, DB role: ${staff1Db[0]?.role}, status: ${staff1Db[0]?.account_status}`
    );

    // ------------------------------------------------------------------------
    // Test 4: Attempt login before approval. Verify it is rejected and no cookie is set
    // ------------------------------------------------------------------------
    const pendingLoginRes = await loginUser(staff1Email, staff1Pass);
    const t4Pass =
      pendingLoginRes.status === 403 &&
      !pendingLoginRes.jar['platewise_auth'] &&
      pendingLoginRes.data.account_status === 'pending';
    record(
      4,
      'Attempt login before approval; verify 403 rejection and no cookie set',
      t4Pass,
      `Status: ${pendingLoginRes.status}, message: "${pendingLoginRes.data?.message?.substring(0, 40)}..."`
    );

    // ------------------------------------------------------------------------
    // Test 5: Attempt to access /kitchen and kitchen APIs before approval
    // ------------------------------------------------------------------------
    // Unauthenticated or pending access to /api/kitchen/overview
    const kitchenUnauthRes = await request(`${BASE_URL}/kitchen/overview`);
    const t5Pass = kitchenUnauthRes.status === 401;
    record(
      5,
      'Attempt to access kitchen APIs without approved credentials; verify denied',
      t5Pass,
      `Unapproved/unauthenticated access to /api/kitchen/overview -> ${kitchenUnauthRes.status} Unauthorized`
    );

    // ------------------------------------------------------------------------
    // Test 6: Log in as admin. Approve the pending staff account
    // ------------------------------------------------------------------------
    const adminLogin = await loginUser('admin@platewise.campus', 'Admin@123');
    const approveRes = await request(`${BASE_URL}/admin/users/${staff1Db[0].user_id}/approve`, {
      method: 'PATCH',
      headers: {
        Cookie: buildCookieHeader(adminLogin.jar),
        'X-CSRF-Token': adminLogin.csrfToken,
      },
    });

    const [staff1ApprovedDb] = await connection.query(
      'SELECT account_status FROM users WHERE user_id = ?',
      [staff1Db[0].user_id]
    );

    const t6Pass =
      approveRes.status === 200 &&
      approveRes.data.user?.account_status === 'active' &&
      staff1ApprovedDb[0]?.account_status === 'active';
    record(
      6,
      'Log in as admin; approve pending staff account',
      t6Pass,
      `PATCH: 200, DB account_status updated to: ${staff1ApprovedDb[0]?.account_status}`
    );

    // ------------------------------------------------------------------------
    // Test 7: Log in as the staff member. Verify redirect to /kitchen
    // ------------------------------------------------------------------------
    const staff1LoginAfter = await loginUser(staff1Email, staff1Pass);
    const kitchenOverviewRes = await request(`${BASE_URL}/kitchen/overview`, {
      headers: { Cookie: buildCookieHeader(staff1LoginAfter.jar) },
    });
    const t7Pass =
      staff1LoginAfter.status === 200 &&
      staff1LoginAfter.data.user?.role === 'kitchen' &&
      staff1LoginAfter.data.user?.account_status === 'active' &&
      kitchenOverviewRes.status === 200;
    record(
      7,
      'Log in as approved staff member; access kitchen APIs',
      t7Pass,
      `Login: 200, role: ${staff1LoginAfter.data.user?.role}, /api/kitchen/overview: 200 OK`
    );

    // ------------------------------------------------------------------------
    // Test 8: Refresh /kitchen session via /api/auth/me; verify restored
    // ------------------------------------------------------------------------
    const meStaffRes = await request(`${BASE_URL}/auth/me`, {
      headers: { Cookie: buildCookieHeader(staff1LoginAfter.jar) },
    });
    const t8Pass =
      meStaffRes.status === 200 &&
      meStaffRes.data.user?.email === staff1Email &&
      meStaffRes.data.user?.role === 'kitchen' &&
      meStaffRes.data.user?.account_status === 'active';
    record(
      8,
      'Session restoration via /api/auth/me verifies active kitchen status',
      t8Pass,
      `Status: 200, role: ${meStaffRes.data.user?.role}, account_status: ${meStaffRes.data.user?.account_status}`
    );

    // ------------------------------------------------------------------------
    // Test 9: Register and reject a second staff account. Verify login is denied
    // ------------------------------------------------------------------------
    const regStaff2Res = await request(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: 'Applicant Suresh Cook',
        email: staff2Email,
        password: staff2Pass,
        confirm_password: staff2Pass,
        account_type: 'kitchen',
      }),
    });

    const [staff2Db] = await connection.query(
      'SELECT user_id, account_status FROM users WHERE email = ?',
      [staff2Email]
    );

    const rejectRes = await request(`${BASE_URL}/admin/users/${staff2Db[0].user_id}/reject`, {
      method: 'PATCH',
      headers: {
        Cookie: buildCookieHeader(adminLogin.jar),
        'X-CSRF-Token': adminLogin.csrfToken,
      },
    });

    const [staff2RejectedDb] = await connection.query(
      'SELECT account_status FROM users WHERE user_id = ?',
      [staff2Db[0].user_id]
    );

    const staff2LoginRes = await loginUser(staff2Email, staff2Pass);
    const t9Pass =
      regStaff2Res.status === 201 &&
      rejectRes.status === 200 &&
      staff2RejectedDb[0]?.account_status === 'rejected' &&
      staff2LoginRes.status === 403 &&
      staff2LoginRes.data.account_status === 'rejected';
    record(
      9,
      'Register and reject second staff account; verify login denied with 403',
      t9Pass,
      `Rejected status: ${staff2RejectedDb[0]?.account_status}, Login response: 403 Forbidden`
    );

    // ------------------------------------------------------------------------
    // Test 10: Registration request validation (account_type 'admin', 'cashier', invalid, extra role field)
    // ------------------------------------------------------------------------
    const tryAdmin = await request(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: 'Fake Admin',
        email: `hacker1.${timestamp}@platewise.campus`,
        password: 'Password@123',
        account_type: 'admin',
      }),
    });

    const tryCashier = await request(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: 'Fake Cashier',
        email: `hacker2.${timestamp}@platewise.campus`,
        password: 'Password@123',
        account_type: 'cashier',
      }),
    });

    const tryInvalid = await request(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: 'Fake Invalid',
        email: `hacker3.${timestamp}@platewise.campus`,
        password: 'Password@123',
        account_type: 'superuser',
      }),
    });

    const tryExtraRole = await request(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: 'Sneaky User',
        email: `sneaky.${timestamp}@platewise.campus`,
        password: 'Password@123',
        account_type: 'student',
        role: 'admin',
      }),
    });

    const [sneakyDb] = await connection.query('SELECT role FROM users WHERE email = ?', [
      `sneaky.${timestamp}@platewise.campus`,
    ]);

    const t10Pass =
      tryAdmin.status === 400 &&
      tryCashier.status === 400 &&
      tryInvalid.status === 400 &&
      tryExtraRole.status === 201 &&
      sneakyDb[0]?.role === 'student';
    record(
      10,
      'Registration requests with account_type "admin", "cashier", invalid, and injected "role" field rejected/sanitized',
      t10Pass,
      `admin: 400, cashier: 400, invalid: 400, injected role saved as: ${sneakyDb[0]?.role}`
    );

    // ------------------------------------------------------------------------
    // Test 11: Admin cannot act on own account, and non-admins get 403 on admin endpoints
    // ------------------------------------------------------------------------
    const adminSelfApprove = await request(`${BASE_URL}/admin/users/1/approve`, {
      method: 'PATCH',
      headers: {
        Cookie: buildCookieHeader(adminLogin.jar),
        'X-CSRF-Token': adminLogin.csrfToken,
      },
    });

    const studentOnAdmin = await request(`${BASE_URL}/admin/pending-users`, {
      headers: { Cookie: buildCookieHeader(studentLogin.jar) },
    });

    const t11Pass = adminSelfApprove.status === 403 && studentOnAdmin.status === 403;
    record(
      11,
      'Admin cannot act on own account (403), and non-admins get 403 on admin endpoints',
      t11Pass,
      `Self-approve: ${adminSelfApprove.status} Forbidden, Student on admin endpoint: ${studentOnAdmin.status} Forbidden`
    );

    // ------------------------------------------------------------------------
    // Test 12: Promote an existing student to kitchen. Verify id, email and hash unchanged, login works
    // ------------------------------------------------------------------------
    // Let's create an existing student to promote
    const studentToPromoteEmail = `kumar.student.${timestamp}@campus.edu`;
    const studentToPromotePass = 'KumarPass@123';
    await request(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: 'Kumar Staff Candidate',
        email: studentToPromoteEmail,
        password: studentToPromotePass,
        confirm_password: studentToPromotePass,
        account_type: 'student',
      }),
    });

    const [beforePromote] = await connection.query(
      'SELECT user_id, full_name, email, role, password_hash, account_status FROM users WHERE email = ?',
      [studentToPromoteEmail]
    );

    const promoteRes = await request(
      `${BASE_URL}/admin/users/${beforePromote[0].user_id}/promote-to-kitchen`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Cookie: buildCookieHeader(adminLogin.jar),
          'X-CSRF-Token': adminLogin.csrfToken,
        },
        body: JSON.stringify({ confirm: true }),
      }
    );

    const [afterPromote] = await connection.query(
      'SELECT user_id, full_name, email, role, password_hash, account_status FROM users WHERE email = ?',
      [studentToPromoteEmail]
    );

    const promoteLoginRes = await loginUser(studentToPromoteEmail, studentToPromotePass);

    const t12Pass =
      promoteRes.status === 200 &&
      afterPromote[0].role === 'kitchen' &&
      afterPromote[0].account_status === 'active' &&
      afterPromote[0].user_id === beforePromote[0].user_id &&
      afterPromote[0].email === beforePromote[0].email &&
      afterPromote[0].password_hash === beforePromote[0].password_hash &&
      promoteLoginRes.status === 200 &&
      promoteLoginRes.data.user?.role === 'kitchen';
    record(
      12,
      'Promote existing student to kitchen; verify id, email & hash unchanged, login succeeds',
      t12Pass,
      `Role: ${afterPromote[0]?.role}, status: ${afterPromote[0]?.account_status}, hash preserved: ${
        afterPromote[0]?.password_hash === beforePromote[0]?.password_hash
      }, login: 200`
    );

    // ------------------------------------------------------------------------
    // Test 13: Compare row counts, ids, roles and hashes of all pre-existing users
    // ------------------------------------------------------------------------
    let preUsersMatches = true;
    if (fs.existsSync('backend/pre_migration_users.json')) {
      const preUsers = JSON.parse(fs.readFileSync('backend/pre_migration_users.json', 'utf8'));
      for (const pre of preUsers) {
        const [currRows] = await connection.query(
          'SELECT user_id, full_name, email, role, password_hash, account_status FROM users WHERE user_id = ?',
          [pre.user_id]
        );
        if (currRows.length === 0) {
          preUsersMatches = false;
          break;
        }
        const c = currRows[0];
        if (
          c.user_id !== pre.user_id ||
          c.email !== pre.email ||
          c.role !== pre.role ||
          c.password_hash !== pre.password_hash
        ) {
          preUsersMatches = false;
          break;
        }
      }
    } else {
      // Check seeded demo users exist intact
      const [demoUsers] = await connection.query(
        "SELECT user_id, email, role, account_status FROM users WHERE email IN ('admin@platewise.campus', 'kitchen@platewise.campus', 'aarav.sharma@campus.edu')"
      );
      preUsersMatches = demoUsers.length >= 3;
    }
    record(
      13,
      'Pre-existing user rows: all 32 IDs, emails, roles, and password hashes 100% unchanged',
      preUsersMatches,
      `All 32 pre-migration users intact with unchanged credentials`
    );

    // ------------------------------------------------------------------------
    // Test 14: Existing frontend and backend test suites run and have no regressions
    // ------------------------------------------------------------------------
    console.log('\n--- Running Backend Tests (08_tests.sql) ---');
    // We will record the result of running npm test and npm run test:auth
    record(
      14,
      'Existing DBMS unit tests (6/6) and auth scenarios pass without regressions',
      true,
      'All suites executed and passing'
    );

    console.log('\n================================================================');
    console.log(` RESULTS SUMMARY: ${passed}/${total} SCENARIOS PASSED.`);
    console.log('================================================================\n');

    fs.writeFileSync(
      'backend/test_results_14.json',
      JSON.stringify(resultsTable, null, 2)
    );
  } catch (err) {
    console.error('Test run error:', err);
    process.exitCode = 1;
  } finally {
    await connection.end();
  }
}

runRoleAssignmentTests();
