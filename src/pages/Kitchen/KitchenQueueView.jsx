import { useState, useEffect, useCallback } from 'react';
import KitchenOrderQueue from '../../components/kitchen/KitchenOrderQueue';
import { getKitchenOrders, updateOrderStatus } from '../../services/member4Api';

export default function KitchenQueueView() {
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingOrderId, setUpdatingOrderId] = useState(null);

  const fetchOrders = useCallback(async () => {
    try {
      const res = await getKitchenOrders({ date: 'all' });
      setOrders(res?.orders || []);
    } catch (err) {
      console.error('[KitchenQueueView] Failed to load kitchen orders:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const res = await getKitchenOrders({ date: 'all' });
        if (active) {
          setOrders(res?.orders || []);
          setIsLoading(false);
        }
      } catch (err) {
        if (active) {
          console.error('[KitchenQueueView] Error loading orders:', err);
          setIsLoading(false);
        }
      }
    }

    load();

    const interval = setInterval(fetchOrders, 10000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [fetchOrders]);

  const handleUpdateStatus = async (orderId, targetStatus, currentStatus) => {
    setUpdatingOrderId(orderId);
    try {
      await updateOrderStatus(orderId, targetStatus, currentStatus);
      // Immediately refresh orders list
      await fetchOrders();
    } finally {
      setUpdatingOrderId(null);
    }
  };

  return (
    <div className="space-y-6 text-left">
      <div>
        <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#252A27]">
          Kitchen Order Queue
        </h1>
        <p className="text-xs sm:text-sm text-[#252A27]/75 mt-0.5">
          Live preparation pipeline for campus thalis, rice bowls, and breakfast specials
        </p>
      </div>

      <KitchenOrderQueue
        orders={orders}
        onUpdateStatus={handleUpdateStatus}
        updatingOrderId={updatingOrderId}
        isLoading={isLoading}
      />
    </div>
  );
}
