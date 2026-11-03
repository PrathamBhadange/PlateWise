import { useState, useEffect, useCallback } from 'react';
import TodaysOrdersTable from '../../components/cashier/TodaysOrdersTable';
import api from '../../services/api';

export default function CashierOrdersView() {
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleOrderUpdated = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  useEffect(() => {
    let active = true;

    async function fetchOrders() {
      try {
        const res = await api.get('/cashier/orders?date=all');
        if (active) {
          setOrders(res.data);
        }
      } catch (err) {
        console.error('[CashierOrdersView] Failed to load orders:', err);
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    fetchOrders();
    const timer = setInterval(fetchOrders, 15000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [refreshKey]);

  return (
    <div className="space-y-6 text-left">
      <div>
        <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#252A27]">
          Today's Counter Orders
        </h1>
        <p className="text-xs sm:text-sm text-[#252A27]/75 mt-0.5">
          Full audit list of all pre-booked and counter walk-in tokens from the central MySQL database
        </p>
      </div>

      <TodaysOrdersTable
        orders={orders}
        onOrderUpdated={handleOrderUpdated}
        isLoading={isLoading}
      />
    </div>
  );
}
