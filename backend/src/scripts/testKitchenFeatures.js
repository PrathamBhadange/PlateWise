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

  let csrfToken = null;
  for (const c of cookieHeaders) {
    if (c.startsWith('csrf_token=')) {
      csrfToken = c.split(';')[0].replace('csrf_token=', '');
    }
  }

  const authenticatedClient = axios.create({
    baseURL: BASE_URL,
    validateStatus: () => true,
    withCredentials: true,
    headers: {
      Cookie: cookieHeaders.map((c) => c.split(';')[0]).join('; '),
      ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
    },
  });

  return { res, client: authenticatedClient, csrfToken };
}

async function runTests() {
  console.log('================================================================================');
  console.log(' PlateWise Kitchen Features Integration Verification Suite');
  console.log('================================================================================\n');

  try {
    // 1. Authenticate Roles
    console.log('[Phase 1] Role Authentication');
    const kitchenAuth = await loginUser('kitchen@platewise.campus', 'Kitchen@123');
    assert(
      kitchenAuth.res.status === 200 && kitchenAuth.res.data?.user?.role === 'kitchen',
      'Kitchen staff logs in successfully',
      `role: ${kitchenAuth.res.data?.user?.role}`
    );

    const cashierAuth = await loginUser('cashier@platewise.campus', 'Cashier@123');
    assert(
      cashierAuth.res.status === 200 && cashierAuth.res.data?.user?.role === 'cashier',
      'Cashier staff logs in successfully',
      `role: ${cashierAuth.res.data?.user?.role}`
    );

    const studentAuth = await loginUser('aarav.sharma@campus.edu', 'Student@123');
    assert(
      studentAuth.res.status === 200 && studentAuth.res.data?.user?.role === 'student',
      'Student logs in successfully',
      `role: ${studentAuth.res.data?.user?.role}`
    );

    const ngoAuth = await loginUser('ngo@platewise.org', 'Ngo@123');
    assert(
      ngoAuth.res.status === 200 && ngoAuth.res.data?.user?.role === 'ngo',
      'NGO logs in successfully',
      `role: ${ngoAuth.res.data?.user?.role}`
    );

    const adminAuth = await loginUser('admin@platewise.campus', 'Admin@123');
    assert(
      adminAuth.res.status === 200 && adminAuth.res.data?.user?.role === 'admin',
      'Admin logs in successfully',
      `role: ${adminAuth.res.data?.user?.role}`
    );

    // 2. Order Queue: Fetch Orders with Tokens & Line Items
    console.log('\n[Phase 2] Order Queue: Live Data & Preparation Transitions');
    const ordersRes = await kitchenAuth.client.get('/kitchen/orders');
    assert(
      ordersRes.status === 200 && Array.isArray(ordersRes.data?.orders) && ordersRes.data.orders.length > 0,
      'Kitchen fetches live orders list',
      `count: ${ordersRes.data?.orders?.length}`
    );

    const firstOrder = ordersRes.data.orders[0];
    assert(
      firstOrder.token && firstOrder.token.startsWith('#') && firstOrder.order_id && firstOrder.student_name,
      'Order record includes formatted token, ID, and student details',
      `token: ${firstOrder.token}, id: ${firstOrder.order_id}, student: ${firstOrder.student_name}`
    );

    // Setup an order for testing transitions
    // Ensure order 104 is in 'Pending' with today's pickup date
    await pool.query("UPDATE orders SET status = 'Pending', pickup_date = CURDATE() WHERE order_id = 104");

    // Kitchen: Pending -> Preparing
    const prepRes = await kitchenAuth.client.patch('/kitchen/orders/104/status', {
      status: 'Preparing',
      current_status: 'Pending',
    });
    assert(
      prepRes.status === 200 && prepRes.data?.new_status === 'Preparing',
      'Kitchen valid transition: Pending -> Preparing succeeds',
      `status: ${prepRes.status}, new_status: ${prepRes.data?.new_status}`
    );

    // Kitchen: Preparing -> Ready
    const readyRes = await kitchenAuth.client.patch('/kitchen/orders/104/status', {
      status: 'Ready',
      current_status: 'Preparing',
    });
    assert(
      readyRes.status === 200 && readyRes.data?.new_status === 'Ready',
      'Kitchen valid transition: Preparing -> Ready succeeds',
      `status: ${readyRes.status}, new_status: ${readyRes.data?.new_status}`
    );

    // Kitchen: Attempt invalid transition (Ready -> Preparing)
    const invalidRes = await kitchenAuth.client.patch('/kitchen/orders/104/status', {
      status: 'Preparing',
      current_status: 'Ready',
    });
    assert(
      invalidRes.status === 409,
      'Invalid state transition rejected with 409 Conflict',
      `status: ${invalidRes.status}, error: ${invalidRes.data?.error}`
    );

    // Kitchen: Attempt Handover (Ready -> Collected) via Kitchen route -> MUST BE FORBIDDEN
    const kitchenHandoverRes = await kitchenAuth.client.patch('/kitchen/orders/104/status', {
      status: 'Collected',
      current_status: 'Ready',
    });
    assert(
      kitchenHandoverRes.status === 403,
      'Kitchen role NEVER allowed to perform handover (Ready -> Collected); rejected with 403 Forbidden',
      `status: ${kitchenHandoverRes.status}, message: ${kitchenHandoverRes.data?.message}`
    );

    // 3. Ready for Pickup & Cashier Handover Flow
    console.log('\n[Phase 3] Ready for Pickup: Queue Segregation & Cashier Handover');
    const readyQueueRes = await kitchenAuth.client.get('/kitchen/orders?status=Ready&date=all');
    assert(
      readyQueueRes.status === 200 &&
        readyQueueRes.data.orders.every((o) => o.status === 'Ready'),
      'Ready for Pickup query returns strictly "Ready" orders only',
      `ready count: ${readyQueueRes.data.orders.length}`
    );

    const isOrder104InReady = readyQueueRes.data.orders.some((o) => o.order_id === 104);
    assert(
      isOrder104InReady,
      'Order #104 is present in the Ready for Pickup rack',
      `order_id: 104, token: #B-04`
    );

    // Cashier performs official handover at counter
    const cashierHandoverRes = await cashierAuth.client.patch('/cashier/orders/104/handover');
    assert(
      cashierHandoverRes.status === 200 && cashierHandoverRes.data?.status === 'Collected',
      'Cashier successfully hands over meal at counter -> Order #104 marked "Collected"',
      `status: ${cashierHandoverRes.data?.status}`
    );

    // Verify Order 104 has left the Ready list
    const postHandoverReadyRes = await kitchenAuth.client.get('/kitchen/orders?status=Ready&date=all');
    const isOrder104StillInReady = postHandoverReadyRes.data.orders.some((o) => o.order_id === 104);
    assert(
      !isOrder104StillInReady,
      'Order #104 automatically disappeared from Ready for Pickup once marked Collected',
      `order 104 in ready list: ${isOrder104StillInReady}`
    );

    // Reset order 104 back to Preparing for future stability
    await pool.query("UPDATE orders SET status = 'Preparing' WHERE order_id = 104");

    // 4. Menu Management & Availability Controls
    console.log('\n[Phase 4] Menu Management & Availability Controls');
    const menuRes = await kitchenAuth.client.get('/kitchen/menu');
    assert(
      menuRes.status === 200 && Array.isArray(menuRes.data) && menuRes.data.length > 0,
      'Kitchen fetches canteen menu items with availability',
      `items count: ${menuRes.data.length}`
    );

    const testItem = menuRes.data.find((m) => m.name.includes('Poha') || m.menu_item_id === 1) || menuRes.data[0];
    const testItemId = testItem.menu_item_id;

    // Toggle to unavailable (sold out)
    const toggleOffRes = await kitchenAuth.client.patch(`/kitchen/menu/${testItemId}/availability`, {
      is_available: false,
    });
    assert(
      toggleOffRes.status === 200 && toggleOffRes.data?.is_available === false,
      `Kitchen toggles "${testItem.name}" to unavailable (is_available = false)`,
      `status: ${toggleOffRes.status}`
    );

    // Verify in database directly
    const [dbMenuOff] = await pool.query('SELECT is_available FROM menu_items WHERE menu_item_id = ?', [testItemId]);
    assert(
      dbMenuOff[0]?.is_available === 0,
      'Database confirms menu_items.is_available is 0',
      `db is_available: ${dbMenuOff[0]?.is_available}`
    );

    // Verify student menu reflects false
    const studentMenuRes = await studentAuth.client.get('/student/menu');
    const studentDish = studentMenuRes.data.find((d) => d.menu_item_id === testItemId);
    assert(
      studentDish?.is_available === false,
      'Student menu endpoint reflects is_available = false for sold-out dish',
      `dish: ${studentDish?.name}, is_available: ${studentDish?.is_available}`
    );

    // Verify student checkout fails with 400 when attempting to order unavailable dish
    const badOrderRes = await studentAuth.client.post('/student/orders', {
      items: [{ menu_item_id: testItemId, quantity: 1 }],
      pickup_slot: '12:30 PM - 01:00 PM',
    });
    assert(
      badOrderRes.status === 400 && badOrderRes.data?.error === 'Dish Unavailable',
      'Student checkout rejects order with unavailable dish with 400 Bad Request',
      `status: ${badOrderRes.status}, error: ${badOrderRes.data?.error}, message: ${badOrderRes.data?.message}`
    );

    // Restore dish availability (live on student app)
    const toggleOnRes = await kitchenAuth.client.patch(`/kitchen/menu/${testItemId}/availability`, {
      is_available: true,
    });
    assert(
      toggleOnRes.status === 200 && toggleOnRes.data?.is_available === true,
      `Kitchen restores "${testItem.name}" to live menu (is_available = true)`,
      `status: ${toggleOnRes.status}`
    );

    // Verify student menu now shows available again
    const studentMenuResAfter = await studentAuth.client.get('/student/menu');
    const studentDishAfter = studentMenuResAfter.data.find((d) => d.menu_item_id === testItemId);
    assert(
      studentDishAfter?.is_available === true,
      'Student menu endpoint reflects is_available = true after restore',
      `is_available: ${studentDishAfter?.is_available}`
    );

    // 5. Role Permissions Enforcement
    console.log('\n[Phase 5] Role Permissions Boundaries');

    // Student calling /kitchen/*
    const stuKitchen = await studentAuth.client.get('/kitchen/menu');
    assert(stuKitchen.status === 403, 'Student blocked from /api/kitchen/* with 403 Forbidden', `status: ${stuKitchen.status}`);

    // Cashier calling /kitchen/*
    const cashKitchen = await cashierAuth.client.get('/kitchen/menu');
    assert(cashKitchen.status === 403, 'Cashier blocked from /api/kitchen/* with 403 Forbidden', `status: ${cashKitchen.status}`);

    // NGO calling /kitchen/*
    const ngoKitchen = await ngoAuth.client.get('/kitchen/menu');
    assert(ngoKitchen.status === 403, 'NGO blocked from /api/kitchen/* with 403 Forbidden', `status: ${ngoKitchen.status}`);

    // Kitchen calling /cashier/*
    const kitCashier = await kitchenAuth.client.get('/cashier/overview');
    assert(kitCashier.status === 403, 'Kitchen blocked from /api/cashier/* with 403 Forbidden', `status: ${kitCashier.status}`);

    // Kitchen calling /admin/*
    const kitAdmin = await kitchenAuth.client.get('/admin/impact');
    assert(kitAdmin.status === 403, 'Kitchen blocked from /api/admin/* with 403 Forbidden', `status: ${kitAdmin.status}`);

    // Admin calling /kitchen/* (Admin retains preview and control)
    const adminKitchen = await adminAuth.client.get('/kitchen/menu');
    assert(adminKitchen.status === 200, 'Admin authorized on /api/kitchen/* with 200 OK', `status: ${adminKitchen.status}`);

    console.log('\n================================================================================');
    console.log(` Results Summary: ${passed} Passed, ${failed} Failed`);
    console.log('================================================================================\n');

    process.exit(failed > 0 ? 1 : 0);
  } catch (error) {
    console.error('Test run failed with error:', error);
    process.exit(1);
  }
}

runTests();
