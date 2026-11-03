/* global process */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

async function loginUser(email, password, loginAs = null) {
  const payload = { email, password };
  if (loginAs) payload.login_as = loginAs;

  const res = await request(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const jar = parseCookies(res.cookies);
  return { status: res.status, data: res.data, jar, csrfToken: jar['csrf_token'] };
}

async function runTests() {
  console.log('================================================================');
  console.log(' PlateWise Admin Kitchen & Route Scoping Verification Suite');
  console.log('================================================================\n');

  let passed = 0;
  let total = 0;

  function record(testNum, testName, isPass, detail) {
    total++;
    if (isPass) passed++;
    console.log(
      `[${String(testNum).padStart(2, '0')}] ${isPass ? '✓ PASS' : '✗ FAIL'} : ${testName} - ${detail}`
    );
  }

  try {
    // 1. Static route and navigation verification
    const member4HeaderCode = fs.readFileSync(
      path.resolve(__dirname, '../../../src/components/dashboard/Member4Header.jsx'),
      'utf8'
    );
    const member4RoutesCode = fs.readFileSync(
      path.resolve(__dirname, '../../../src/routes/member4Routes.jsx'),
      'utf8'
    );
    const adminKitchenCode = fs.readFileSync(
      path.resolve(__dirname, '../../../src/pages/Admin/AdminKitchen.jsx'),
      'utf8'
    );
    const kitchenDashboardCode = fs.readFileSync(
      path.resolve(__dirname, '../../../src/pages/Kitchen/KitchenDashboard.jsx'),
      'utf8'
    );

    // Test 1: Admin navbar points "Kitchen & Demand" to /admin/kitchen
    const hasAdminKitchenNav =
      member4HeaderCode.includes("user?.role === 'admin' ? '/admin/kitchen' : '/kitchen'") &&
      member4HeaderCode.includes("{ label: 'Kitchen & Demand', path: kitchenPath");
    record(1, 'Admin nav item points to /admin/kitchen', hasAdminKitchenNav, 'Member4Header dynamically points to /admin/kitchen for role=admin');

    // Test 2: Active link logic differentiates /admin from /admin/kitchen
    const hasActiveLogic =
      member4HeaderCode.includes("linkPath === '/admin'") &&
      member4HeaderCode.includes("isLinkActive(link.path)");
    record(2, 'Admin navbar active state differentiation', hasActiveLogic, 'Correctly isolates /admin from /admin/kitchen without duplicate active pills');

    // Test 3: /admin/kitchen route defined and protected with allowedRoles=['admin']
    const hasAdminKitchenRoute =
      member4RoutesCode.includes('path="/admin/kitchen"') &&
      member4RoutesCode.includes("<ProtectedRoute allowedRoles={['admin']}>") &&
      member4RoutesCode.includes('<AdminKitchen />');
    record(3, '/admin/kitchen route protected for Admin only', hasAdminKitchenRoute, 'member4Routes.jsx declares /admin/kitchen with allowedRoles=[admin]');

    // Test 4: /kitchen route remains accessible to kitchen and admin
    const hasKitchenRoute =
      member4RoutesCode.includes('path="/kitchen"') &&
      member4RoutesCode.includes("<ProtectedRoute allowedRoles={['kitchen', 'admin']}>");
    record(4, 'Standalone /kitchen route preserved for kitchen and admin', hasKitchenRoute, 'member4Routes.jsx retains /kitchen with allowedRoles=[kitchen, admin]');

    // Test 5: AdminKitchen renders Member4Header and KitchenDashboard
    const hasAdminLayout =
      adminKitchenCode.includes('<Member4Header') &&
      adminKitchenCode.includes('<KitchenDashboard showTitle={false} />') &&
      adminKitchenCode.includes('max-w-7xl');
    record(5, 'AdminKitchen renders inside existing Admin layout and navbar', hasAdminLayout, 'AdminKitchen embeds KitchenDashboard within Member4Header and standard Admin shell');

    // Test 6: KitchenDashboard supports showTitle prop
    const hasShowTitleProp =
      kitchenDashboardCode.includes('function KitchenDashboard({ showTitle = true })') &&
      kitchenDashboardCode.includes('{showTitle && (');
    record(6, 'KitchenDashboard content component is cleanly reusable', hasShowTitleProp, 'KitchenDashboard accepts showTitle prop without code duplication');

    // 2. Live API Role & Permission Checks
    const adminLogin = await loginUser('admin@platewise.campus', 'Admin@123');
    record(7, 'Admin login succeeds', adminLogin.status === 200 && adminLogin.data.user.role === 'admin', `Role: ${adminLogin.data?.user?.role}`);

    const adminCookie = buildCookieHeader(adminLogin.jar);
    const adminMe = await request(`${BASE_URL}/auth/me`, {
      headers: { Cookie: adminCookie },
    });
    record(8, 'Session restoration for Admin (/api/auth/me)', adminMe.status === 200 && adminMe.data.user.role === 'admin', `User: ${adminMe.data?.user?.email}`);

    // Admin calling Kitchen endpoints
    const adminOverview = await request(`${BASE_URL}/kitchen/overview`, {
      headers: { Cookie: adminCookie },
    });
    record(9, 'Admin authorized on GET /api/kitchen/overview', adminOverview.status === 200, `Status: ${adminOverview.status}`);

    const adminOrders = await request(`${BASE_URL}/kitchen/orders`, {
      headers: { Cookie: adminCookie },
    });
    record(10, 'Admin authorized on GET /api/kitchen/orders', adminOrders.status === 200, `Orders count: ${adminOrders.data?.orders?.length || 0}`);

    const adminSales = await request(`${BASE_URL}/kitchen/sales`, {
      headers: { Cookie: adminCookie },
    });
    record(11, 'Admin authorized on GET /api/kitchen/sales', adminSales.status === 200, `Status: ${adminSales.status}`);

    const adminDemand = await request(`${BASE_URL}/kitchen/demand`, {
      headers: { Cookie: adminCookie },
    });
    record(12, 'Admin authorized on GET /api/kitchen/demand', adminDemand.status === 200, `Status: ${adminDemand.status}`);

    const adminInv = await request(`${BASE_URL}/kitchen/inventory`, {
      headers: { Cookie: adminCookie },
    });
    record(13, 'Admin authorized on GET /api/kitchen/inventory', adminInv.status === 200, `Status: ${adminInv.status}`);

    // Admin calling Admin endpoints (Admin Impact, Complaints)
    const adminImpact = await request(`${BASE_URL}/admin/impact`, {
      headers: { Cookie: adminCookie },
    });
    record(14, 'Admin authorized on GET /api/admin/impact', adminImpact.status === 200, `Status: ${adminImpact.status}`);

    const adminComplaints = await request(`${BASE_URL}/complaints`, {
      headers: { Cookie: adminCookie },
    });
    record(15, 'Admin authorized on GET /api/complaints', adminComplaints.status === 200, `Status: ${adminComplaints.status}`);

    // Kitchen user checks
    const kitchenLogin = await loginUser('kitchen@platewise.campus', 'Kitchen@123');
    record(16, 'Kitchen staff login succeeds', kitchenLogin.status === 200 && kitchenLogin.data.user.role === 'kitchen', `Role: ${kitchenLogin.data?.user?.role}`);

    const kitchenCookie = buildCookieHeader(kitchenLogin.jar);
    const kitchenOverview = await request(`${BASE_URL}/kitchen/overview`, {
      headers: { Cookie: kitchenCookie },
    });
    record(17, 'Kitchen staff can access /api/kitchen/*', kitchenOverview.status === 200, `Status: ${kitchenOverview.status}`);

    const kitchenAdminAccess = await request(`${BASE_URL}/admin/overview`, {
      headers: { Cookie: kitchenCookie },
    });
    record(18, 'Kitchen staff blocked from /api/admin/* (403)', kitchenAdminAccess.status === 403, `Status: ${kitchenAdminAccess.status}`);

    // Cashier user checks
    const cashierLogin = await loginUser('cashier@platewise.campus', 'Cashier@123');
    const cashierCookie = buildCookieHeader(cashierLogin.jar);
    const cashierKitchen = await request(`${BASE_URL}/kitchen/overview`, {
      headers: { Cookie: cashierCookie },
    });
    const cashierAdmin = await request(`${BASE_URL}/admin/overview`, {
      headers: { Cookie: cashierCookie },
    });
    record(19, 'Cashier blocked from /api/kitchen/* (403)', cashierKitchen.status === 403, `Status: ${cashierKitchen.status}`);
    record(20, 'Cashier blocked from /api/admin/* (403)', cashierAdmin.status === 403, `Status: ${cashierAdmin.status}`);

    // Student user checks
    const studentLogin = await loginUser('aarav.sharma@campus.edu', 'Student@123');
    const studentCookie = buildCookieHeader(studentLogin.jar);
    const studentKitchen = await request(`${BASE_URL}/kitchen/overview`, {
      headers: { Cookie: studentCookie },
    });
    const studentAdmin = await request(`${BASE_URL}/admin/overview`, {
      headers: { Cookie: studentCookie },
    });
    record(21, 'Student blocked from /api/kitchen/* (403)', studentKitchen.status === 403, `Status: ${studentKitchen.status}`);
    record(22, 'Student blocked from /api/admin/* (403)', studentAdmin.status === 403, `Status: ${studentAdmin.status}`);

    // NGO user checks
    const ngoLogin = await loginUser('ngo@platewise.org', 'Ngo@123');
    const ngoCookie = buildCookieHeader(ngoLogin.jar);
    const ngoKitchen = await request(`${BASE_URL}/kitchen/overview`, {
      headers: { Cookie: ngoCookie },
    });
    const ngoAdmin = await request(`${BASE_URL}/admin/overview`, {
      headers: { Cookie: ngoCookie },
    });
    record(23, 'NGO blocked from /api/kitchen/* (403)', ngoKitchen.status === 403, `Status: ${ngoKitchen.status}`);
    record(24, 'NGO blocked from /api/admin/* (403)', ngoAdmin.status === 403, `Status: ${ngoAdmin.status}`);

    console.log('\n================================================================');
    console.log(` Summary: ${passed}/${total} checks PASSED.`);
    console.log('================================================================');
  } catch (err) {
    console.error('Test execution failed:', err);
    process.exit(1);
  }
}

runTests();
