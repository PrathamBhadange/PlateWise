import api from './api';

/**
 * Student API Client
 * Derives student identity strictly from the backend cookie session.
 * Uses CSRF tokens automatically via the Axios interceptor in api.js.
 */

export async function getStudentDashboard() {
  const res = await api.get('/student/dashboard');
  return res.data;
}

export async function getStudentMenu() {
  const res = await api.get('/student/menu');
  return res.data;
}

export async function getStudentSurplusDeals() {
  const res = await api.get('/student/surplus');
  return res.data;
}

export async function getStudentOrders() {
  const res = await api.get('/student/orders');
  return res.data;
}

export async function getPickupSlots(date) {
  const res = await api.get(`/student/pickup-slots?date=${encodeURIComponent(date)}`);
  return res.data;
}

export async function placeStudentOrder(payload) {
  // payload: { items: [{ menu_item_id, quantity }], pickup_slot, pickup_date, idempotency_key }
  const res = await api.post('/student/orders', payload);
  return res.data;
}

export async function cancelStudentOrder(orderId) {
  const res = await api.patch(`/student/orders/${orderId}/cancel`);
  return res.data;
}

export async function getAvailableCommunityCredits() {
  const res = await api.get('/student/credits/available');
  return res.data;
}

export async function createStudentSponsorship(payload) {
  const res = await api.post('/student/sponsorships', payload);
  return res.data;
}

export async function getMySponsorships() {
  const res = await api.get('/student/sponsorships/my');
  return res.data;
}

export async function getCreditLedgerHistory() {
  const res = await api.get('/student/credits/history');
  return res.data;
}

export async function getCheckoutPreview(payload) {
  // payload: { items: [{ menu_item_id, quantity }], redeem_credits }
  const res = await api.post('/student/orders/preview', payload);
  return res.data;
}

export async function getStudentComplaints() {
  const res = await api.get('/complaints');
  return res.data;
}

export async function submitStudentComplaint(payload) {
  // payload: { menu_item_id, description }
  const res = await api.post('/complaints', payload);
  return res.data;
}

export async function getStudentProfile() {
  const res = await api.get('/auth/me');
  return res.data;
}
