/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useMemo, useCallback } from 'react';
import { INITIAL_STAFF_ORDERS } from '../data/initialStaffOrders';

const StaffOrderContext = createContext(null);

export function StaffOrderProvider({ children }) {
  const [orders, setOrders] = useState(INITIAL_STAFF_ORDERS);

  // Update order status by ID or Token
  const updateOrderStatus = useCallback((idOrToken, newStatus) => {
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id === idOrToken || o.token.toUpperCase() === String(idOrToken).trim().toUpperCase()) {
          return { ...o, status: newStatus };
        }
        return o;
      })
    );
  }, []);

  // Find order by token string
  const findOrderByToken = useCallback((rawQuery) => {
    if (!rawQuery) return null;
    const clean = rawQuery.trim().toUpperCase();
    const tokenKey = clean.startsWith('#') ? clean : `#${clean}`;
    return orders.find((o) => o.token.toUpperCase() === tokenKey) || null;
  }, [orders]);

  // Structured verification info for TokenVerification
  const verifyTokenDetails = useCallback((rawQuery) => {
    const order = findOrderByToken(rawQuery);
    if (!order) {
      return {
        found: false,
        error: `Token "${rawQuery}" not found in today's order roster. Success cannot be confirmed for unregistered tokens.`,
      };
    }

    let eligible = false;
    let reason = '';

    if (order.status === 'Ready') {
      eligible = true;
      reason = 'Meal is staged in heated rack and ready for immediate counter handover.';
    } else if (order.status === 'Preparing') {
      eligible = false;
      reason = `Kitchen is currently preparing this order at ${order.station || 'cooking bay'} (~5 mins remaining). Not ready for pickup yet.`;
    } else if (order.status === 'Pending') {
      eligible = false;
      reason = 'Order is queued in kitchen pipeline. Cooking has not started yet.';
    } else if (order.status === 'Collected') {
      eligible = false;
      reason = `This meal token (${order.token}) has already been collected and served at ${order.counter}.`;
    }

    return {
      found: true,
      order,
      token: order.token,
      student: order.student,
      studentId: order.studentId,
      meal: order.meal,
      time: order.time,
      counter: order.counter,
      status: order.status,
      eligible,
      reason,
      payment: order.payment,
      specialInstructions: order.specialInstructions,
    };
  }, [findOrderByToken]);

  const markOrderCollected = useCallback((token) => {
    updateOrderStatus(token, 'Collected');
  }, [updateOrderStatus]);

  // Reset to initial demo orders
  const resetDemoOrders = useCallback(() => {
    setOrders(INITIAL_STAFF_ORDERS);
  }, []);

  const value = useMemo(
    () => ({
      orders,
      updateOrderStatus,
      findOrderByToken,
      verifyTokenDetails,
      markOrderCollected,
      resetDemoOrders,
    }),
    [orders, updateOrderStatus, findOrderByToken, verifyTokenDetails, markOrderCollected, resetDemoOrders]
  );

  return (
    <StaffOrderContext.Provider value={value}>
      {children}
    </StaffOrderContext.Provider>
  );
}

export function useStaffOrders() {
  const context = useContext(StaffOrderContext);
  if (!context) {
    throw new Error('useStaffOrders must be used within a StaffOrderProvider');
  }
  return context;
}
