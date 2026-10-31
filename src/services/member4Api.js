import api from './api';
import {
  MOCK_MENU_ITEMS,
  MOCK_KITCHEN_OVERVIEW,
  MOCK_KITCHEN_ORDERS,
  MOCK_KITCHEN_INVENTORY,
  MOCK_KITCHEN_SUMMARY,
  MOCK_SALES_REPORT,
  MOCK_DEMAND_RECOMMENDATIONS,
  MOCK_ADMIN_IMPACT,
  MOCK_COMPLAINTS,
  MOCK_STAFF,
  MOCK_AUDIT_LOGS,
} from './mockData';

const isMockEnabled = () => import.meta.env.VITE_USE_MOCK === 'true';

// Helper for local mock state mutability during demo
let localComplaints = [...MOCK_COMPLAINTS];
let localAuditLogs = [...MOCK_AUDIT_LOGS];
let localOrders = [...MOCK_KITCHEN_ORDERS];

/**
 * GET /api/kitchen/overview
 */
export async function getKitchenOverview() {
  if (isMockEnabled()) {
    return { ...MOCK_KITCHEN_OVERVIEW };
  }
  try {
    const res = await api.get('/kitchen/overview');
    return res.data;
  } catch (err) {
    console.warn('[member4Api] Fallback to mock kitchen overview:', err.message);
    return { ...MOCK_KITCHEN_OVERVIEW };
  }
}

/**
 * GET /api/kitchen/orders
 */
export async function getKitchenOrders(filters = {}) {
  if (isMockEnabled()) {
    let result = [...localOrders];
    if (filters.status && filters.status !== 'all') {
      result = result.filter(
        (o) => o.status.toLowerCase() === filters.status.toLowerCase()
      );
    }
    if (filters.pickup_slot && filters.pickup_slot !== 'all') {
      result = result.filter((o) => o.pickup_slot === filters.pickup_slot);
    }
    if (filters.search && filters.search.trim()) {
      const q = filters.search.toLowerCase().trim();
      result = result.filter(
        (o) =>
          String(o.order_id).includes(q) ||
          o.student_name.toLowerCase().includes(q) ||
          (o.items_summary && o.items_summary.toLowerCase().includes(q))
      );
    }
    if (filters.sort === 'oldest') {
      result.sort((a, b) => new Date(a.order_date) - new Date(b.order_date));
    } else {
      result.sort((a, b) => new Date(b.order_date) - new Date(a.order_date));
    }
    return { orders: result, total: result.length };
  }
  try {
    const res = await api.get('/kitchen/orders', { params: filters });
    return res.data;
  } catch (err) {
    console.warn('[member4Api] Fallback to mock kitchen orders:', err.message);
    return { orders: localOrders, total: localOrders.length };
  }
}

/**
 * PATCH /api/kitchen/orders/:orderId/status
 */
export async function updateOrderStatus(orderId, targetStatus, currentStatus) {
  if (isMockEnabled()) {
    const VALID = {
      Pending: ['Confirmed', 'Cancelled'],
      Confirmed: ['Preparing', 'Cancelled'],
      Preparing: ['Ready', 'Cancelled'],
      Ready: ['Collected'],
      Collected: [],
      Cancelled: [],
    };
    const idx = localOrders.findIndex((o) => o.order_id === Number(orderId));
    if (idx === -1) {
      const err = new Error(`Order #${orderId} not found`);
      err.response = { status: 404, data: { message: err.message } };
      throw err;
    }
    const current = localOrders[idx].status;
    const allowed = VALID[current] || [];
    if (!allowed.includes(targetStatus)) {
      const err = new Error(
        `Cannot transition order #${orderId} from '${current}' to '${targetStatus}'.`
      );
      err.response = { status: 409, data: { message: err.message } };
      throw err;
    }
    localOrders[idx] = { ...localOrders[idx], status: targetStatus };
    return {
      message: `Order #${orderId} transitioned to ${targetStatus}`,
      order_id: Number(orderId),
      previous_status: current,
      new_status: targetStatus,
    };
  }

  const res = await api.patch(`/kitchen/orders/${orderId}/status`, {
    status: targetStatus,
    current_status: currentStatus,
  });
  return res.data;
}

/**
 * GET /api/kitchen/sales?date=
 */
export async function getKitchenSales(date) {
  if (isMockEnabled()) {
    return {
      date,
      produced_portions: MOCK_KITCHEN_SUMMARY.summary.total_cooked,
      sold_portions: MOCK_KITCHEN_SUMMARY.summary.total_sold,
      remaining_portions: MOCK_KITCHEN_SUMMARY.summary.total_leftover,
      revenue: MOCK_KITCHEN_SUMMARY.summary.total_revenue,
      waste_percentage: MOCK_KITCHEN_SUMMARY.summary.waste_percentage,
      best_selling_dish: MOCK_KITCHEN_SUMMARY.topSelling[0],
      sales_trend: MOCK_SALES_REPORT,
    };
  }
  try {
    const res = await api.get('/kitchen/sales', { params: { date } });
    return res.data;
  } catch (err) {
    console.warn('[member4Api] Fallback to mock kitchen sales:', err.message);
    return {
      date,
      produced_portions: MOCK_KITCHEN_SUMMARY.summary.total_cooked,
      sold_portions: MOCK_KITCHEN_SUMMARY.summary.total_sold,
      remaining_portions: MOCK_KITCHEN_SUMMARY.summary.total_leftover,
      revenue: MOCK_KITCHEN_SUMMARY.summary.total_revenue,
      waste_percentage: MOCK_KITCHEN_SUMMARY.summary.waste_percentage,
      best_selling_dish: MOCK_KITCHEN_SUMMARY.topSelling[0],
      sales_trend: MOCK_SALES_REPORT,
    };
  }
}

/**
 * GET /api/kitchen/demand?date=
 */
export async function getDemand(date) {
  if (isMockEnabled()) {
    return {
      target_date: date,
      engine: 'AI-assisted demand prediction',
      recommendations: MOCK_DEMAND_RECOMMENDATIONS.map((d) => ({
        ...d,
        recommendation_explanation: `4-week weekday baseline: ${d.weekday_avg_sold} portions; +${d.pre_orders} active pre-orders accounted for.`,
      })),
    };
  }
  try {
    const res = await api.get('/kitchen/demand', { params: { date } });
    return res.data;
  } catch (err) {
    console.warn('[member4Api] Fallback to mock demand:', err.message);
    return {
      target_date: date,
      engine: 'AI-assisted demand prediction',
      recommendations: MOCK_DEMAND_RECOMMENDATIONS.map((d) => ({
        ...d,
        recommendation_explanation: `4-week weekday baseline: ${d.weekday_avg_sold} portions; +${d.pre_orders} active pre-orders accounted for.`,
      })),
    };
  }
}

/**
 * POST /api/kitchen/demand/generate
 */
export async function generateDemand(date) {
  if (isMockEnabled()) {
    return getDemand(date);
  }
  const res = await api.post('/kitchen/demand/generate', { date });
  return res.data;
}

/**
 * GET /api/kitchen/inventory?date=
 */
export async function getKitchenInventory(date) {
  if (isMockEnabled()) {
    return {
      date,
      low_stock_threshold: 15,
      items: MOCK_KITCHEN_INVENTORY,
    };
  }
  try {
    const res = await api.get('/kitchen/inventory', { params: { date } });
    return res.data;
  } catch (err) {
    console.warn('[member4Api] Fallback to mock inventory:', err.message);
    return {
      date,
      low_stock_threshold: 15,
      items: MOCK_KITCHEN_INVENTORY,
    };
  }
}

/**
 * GET /api/kitchen/summary?date=
 */
export async function getKitchenSummary(date) {
  if (isMockEnabled()) {
    return { ...MOCK_KITCHEN_SUMMARY };
  }
  try {
    const res = await api.get('/kitchen/summary', { params: { date } });
    return res.data;
  } catch (err) {
    console.warn('[member4Api] Fallback to mock kitchen summary:', err.message);
    return { ...MOCK_KITCHEN_SUMMARY };
  }
}

/**
 * GET /api/kitchen/sales-report?from=&to=
 */
export async function getKitchenSalesReport(from, to) {
  if (isMockEnabled()) {
    return { from, to, data: MOCK_SALES_REPORT };
  }
  try {
    const res = await api.get('/kitchen/sales-report', { params: { from, to } });
    return res.data;
  } catch (err) {
    console.warn('[member4Api] Fallback to mock sales report:', err.message);
    return { from, to, data: MOCK_SALES_REPORT };
  }
}

/**
 * GET /api/kitchen/demand-recommendation?date=
 */
export async function getDemandRecommendation(date) {
  if (isMockEnabled()) {
    return { target_date: date, recommendations: MOCK_DEMAND_RECOMMENDATIONS };
  }
  try {
    const res = await api.get('/kitchen/demand-recommendation', { params: { date } });
    return res.data;
  } catch (err) {
    console.warn('[member4Api] Fallback to mock demand recommendation:', err.message);
    return { target_date: date, recommendations: MOCK_DEMAND_RECOMMENDATIONS };
  }
}

/**
 * GET /api/admin/impact
 */
export async function getAdminImpact() {
  if (isMockEnabled()) {
    return { ...MOCK_ADMIN_IMPACT };
  }
  try {
    const res = await api.get('/admin/impact');
    return res.data;
  } catch (err) {
    console.warn('[member4Api] Fallback to mock impact:', err.message);
    return { ...MOCK_ADMIN_IMPACT };
  }
}

/**
 * GET /api/admin/complaints?status=&severity=&category=
 */
export async function getAdminComplaints(filters = {}) {
  if (isMockEnabled()) {
    let filtered = [...localComplaints];
    if (filters.status && filters.status !== 'all') {
      filtered = filtered.filter((c) => c.status === filters.status);
    }
    if (filters.severity && filters.severity !== 'all') {
      filtered = filtered.filter((c) => c.severity === filters.severity);
    }
    if (filters.category && filters.category !== 'all') {
      filtered = filtered.filter((c) => c.category === filters.category);
    }
    return {
      kpis: MOCK_ADMIN_IMPACT.complaintKpis,
      complaints: filtered,
      staff: MOCK_STAFF,
    };
  }
  try {
    const res = await api.get('/admin/complaints', { params: filters });
    return res.data;
  } catch (err) {
    console.warn('[member4Api] Fallback to mock complaints:', err.message);
    return {
      kpis: MOCK_ADMIN_IMPACT.complaintKpis,
      complaints: localComplaints,
      staff: MOCK_STAFF,
    };
  }
}

/**
 * GET /api/admin/complaints/:id/actions
 */
export async function getComplaintActions(complaintId) {
  if (isMockEnabled()) {
    return [
      {
        complaint_action_id: 1,
        complaint_id: complaintId,
        action_type: 'note',
        action_by_name: 'Student (Reported)',
        remarks: 'Complaint lodged via portal',
        created_at: new Date(Date.now() - 12 * 3600000).toISOString(),
      },
      {
        complaint_action_id: 2,
        complaint_id: complaintId,
        action_type: 'assigned',
        action_by_name: 'Dr. Ramesh Sharma',
        remarks: 'Assigned to Chef Suresh Kumar for kitchen review',
        created_at: new Date(Date.now() - 11 * 3600000).toISOString(),
      },
    ];
  }
  try {
    const res = await api.get(`/admin/complaints/${complaintId}/actions`);
    return res.data;
  } catch (err) {
    console.warn('[member4Api] Fallback to mock complaint actions:', err.message);
    return [];
  }
}

/**
 * GET /api/admin/audit-logs
 */
export async function getAuditLogs() {
  if (isMockEnabled()) {
    return [...localAuditLogs];
  }
  try {
    const res = await api.get('/admin/audit-logs');
    return res.data;
  } catch (err) {
    console.warn('[member4Api] Fallback to mock audit logs:', err.message);
    return [...localAuditLogs];
  }
}

/**
 * POST /api/complaints
 */
export async function submitComplaint(payload) {
  if (isMockEnabled()) {
    // Client-side rule classifier for mock mode
    const text = (payload.description || '').toLowerCase();
    let category = 'other';
    let severity = 'medium';

    if (text.includes('cockroach') || text.includes('lizard') || text.includes('rat') || text.includes('worm')) {
      category = 'hygiene';
      severity = 'critical';
    } else if (text.includes('glass') || text.includes('nail')) {
      category = 'foreign_object';
      severity = 'critical';
    } else if (text.includes('insect') || text.includes('hair') || text.includes('plastic') || text.includes('stone')) {
      category = text.includes('hair') || text.includes('insect') ? 'hygiene' : 'foreign_object';
      severity = 'high';
    } else if (text.includes('stale') || text.includes('smell') || text.includes('spoiled')) {
      category = 'food_quality';
      severity = 'high';
    } else if (text.includes('cold') || text.includes('delayed') || text.includes('slow')) {
      category = text.includes('delayed') || text.includes('slow') ? 'service' : 'food_quality';
      severity = 'low';
    }

    const newTicket = {
      complaint_id: Date.now(),
      user_id: payload.user_id || 5,
      student_name: 'Demo Student',
      student_email: 'student@campus.edu',
      menu_item_id: payload.menu_item_id,
      menu_item_name: MOCK_MENU_ITEMS.find((m) => m.menu_item_id === Number(payload.menu_item_id))?.name || 'General Canteen',
      description: payload.description,
      category,
      severity,
      status: 'open',
      assigned_to: null,
      created_at: new Date().toISOString(),
      resolution_deadline: new Date(Date.now() + 24 * 3600000).toISOString(),
      resolved_at: null,
      escalated_at: null,
      escalation_level: 0,
      is_overdue: 0,
      hours_overdue: -24.0,
    };

    localComplaints.unshift(newTicket);
    return {
      message: 'Complaint submitted successfully',
      ticket: newTicket,
      classification: { category, severity },
    };
  }

  const res = await api.post('/complaints', payload);
  return res.data;
}

/**
 * PATCH /api/complaints/:id
 */
export async function updateComplaint(id, payload) {
  if (isMockEnabled()) {
    const idx = localComplaints.findIndex((c) => c.complaint_id === Number(id));
    if (idx !== -1) {
      localComplaints[idx] = {
        ...localComplaints[idx],
        ...payload,
        assigned_to_name: payload.assigned_to
          ? MOCK_STAFF.find((s) => s.user_id === Number(payload.assigned_to))?.full_name || 'Staff'
          : localComplaints[idx].assigned_to_name,
        resolved_at: payload.status === 'resolved' ? new Date().toISOString() : localComplaints[idx].resolved_at,
      };
      return { message: 'Complaint updated successfully', complaint: localComplaints[idx] };
    }
  }

  const res = await api.patch(`/complaints/${id}`, payload);
  return res.data;
}

/**
 * POST /api/admin/complaints/escalate-overdue
 */
export async function escalateOverdueComplaints() {
  if (isMockEnabled()) {
    let count = 0;
    localComplaints = localComplaints.map((c) => {
      if (c.status !== 'resolved' && c.status !== 'closed' && c.is_overdue) {
        count++;
        return {
          ...c,
          status: 'escalated',
          escalation_level: (c.escalation_level || 0) + 1,
          escalated_at: new Date().toISOString(),
        };
      }
      return c;
    });
    return {
      message: 'Escalation routine executed successfully',
      escalated_count: count,
      timestamp: new Date().toISOString(),
    };
  }

  const res = await api.post('/admin/complaints/escalate-overdue');
  return res.data;
}

/**
 * GET /api/complaints/menu-items
 */
export async function getMenuItems() {
  if (isMockEnabled()) {
    return MOCK_MENU_ITEMS;
  }
  try {
    const res = await api.get('/complaints/menu-items');
    return res.data;
  } catch (err) {
    console.warn('[member4Api] Fallback to mock menu items:', err.message);
    return MOCK_MENU_ITEMS;
  }
}

