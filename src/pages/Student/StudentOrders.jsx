import { useState, useEffect, useMemo, useCallback } from 'react';
import { Clock, CheckCircle2, XCircle, RotateCcw, AlertTriangle, AlertCircle } from 'lucide-react';
import { getStudentOrders, cancelStudentOrder } from '../../services/studentApi';
import OrderStatusTracker from '../../components/student/OrderStatusTracker';
import EmptyState from '../../components/student/EmptyState';
import LoadingSpinner from '../../components/dashboard/LoadingSpinner';

export default function StudentOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('All');
  const [cancellingId, setCancellingId] = useState(null);

  const reloadOrders = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getStudentOrders();
      setOrders(Array.isArray(data) ? data : data.orders || []);
    } catch (err) {
      console.error('Failed to load orders:', err);
      setError(
        err.response?.data?.message || err.response?.data?.error || 'Failed to load your orders from database.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    getStudentOrders()
      .then((data) => {
        if (!ignore) {
          setOrders(Array.isArray(data) ? data : data.orders || []);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!ignore) {
          console.error('Failed to load orders:', err);
          setError(
            err.response?.data?.message || err.response?.data?.error || 'Failed to load your orders from database.'
          );
          setLoading(false);
        }
      });
    return () => {
      ignore = true;
    };
  }, []);

  const handleCancel = async (orderId) => {
    if (!window.confirm(`Are you sure you want to cancel order #${orderId}?`)) return;
    setCancellingId(orderId);
    try {
      await cancelStudentOrder(orderId);
      await reloadOrders();
    } catch (err) {
      alert(err.response?.data?.message || err.response?.data?.error || 'Failed to cancel order.');
    } finally {
      setCancellingId(null);
    }
  };

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const s = String(order.status || '').toLowerCase();
      if (activeTab === 'Active') {
        return ['pending', 'confirmed', 'preparing', 'ready'].includes(s);
      }
      if (activeTab === 'Completed') {
        return ['collected', 'picked_up'].includes(s);
      }
      if (activeTab === 'Cancelled') {
        return s === 'cancelled';
      }
      return true; // All
    });
  }, [orders, activeTab]);

  const tabCounts = useMemo(() => {
    return {
      All: orders.length,
      Active: orders.filter((o) =>
        ['pending', 'confirmed', 'preparing', 'ready'].includes(String(o.status || '').toLowerCase())
      ).length,
      Completed: orders.filter((o) =>
        ['collected', 'picked_up'].includes(String(o.status || '').toLowerCase())
      ).length,
      Cancelled: orders.filter((o) => String(o.status || '').toLowerCase() === 'cancelled').length,
    };
  }, [orders]);

  if (loading) {
    return (
      <div className="py-24 flex justify-center">
        <LoadingSpinner text="Retrieving your orders from database..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl p-8 border border-rose-200 text-center max-w-md mx-auto my-12">
        <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
        <h3 className="text-base font-bold text-[#252A27]">Orders Error</h3>
        <p className="text-xs text-rose-600 mt-1">{error}</p>
        <button
          onClick={reloadOrders}
          className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-[#245C45] text-white hover:bg-[#1b4634] transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Retry</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-serif font-bold text-[#252A27]">My Orders History</h1>
        <p className="text-xs text-[#252A27]/70 mt-1">
          Track active kitchen preparations and view your complete canteen pickup history.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#245C45]/15 gap-2 pb-px overflow-x-auto">
        {['All', 'Active', 'Completed', 'Cancelled'].map((tab) => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'border-[#245C45] text-[#245C45]'
                  : 'border-transparent text-[#252A27]/60 hover:text-[#252A27]'
              }`}
            >
              <span>{tab}</span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full ${
                  isActive ? 'bg-[#245C45] text-white' : 'bg-stone-100 text-stone-600'
                }`}
              >
                {tabCounts[tab]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Orders List */}
      {filteredOrders.length > 0 ? (
        <div className="space-y-4">
          {filteredOrders.map((ord) => {
            const isPending = ord.status?.toLowerCase() === 'pending';
            const isActiveOrder = ['pending', 'confirmed', 'preparing', 'ready'].includes(
              String(ord.status || '').toLowerCase()
            );

            return (
              <div
                key={ord.order_id}
                className="bg-white rounded-2xl border border-[#245C45]/15 p-5 sm:p-6 shadow-xs hover:shadow-sm transition-shadow space-y-4"
              >
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-stone-100 gap-2">
                  <div className="flex items-center gap-3">
                    <span className="font-serif font-bold text-base text-[#252A27]">
                      Order #{ord.order_id}
                    </span>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md ${
                        ord.status === 'Collected' || ord.status === 'picked_up'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : ord.status === 'Cancelled'
                          ? 'bg-rose-50 text-rose-800 border border-rose-200'
                          : 'bg-amber-50 text-amber-800 border border-amber-200'
                      }`}
                    >
                      {ord.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-[#252A27]/70">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-[#245C45]" />
                      {new Date(ord.order_date).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}{' '}
                      at{' '}
                      {new Date(ord.order_date).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    <span className="font-bold text-base text-[#245C45]">
                      ₹{Number(ord.final_amount !== undefined && ord.final_amount !== null ? ord.final_amount : ord.total_amount || 0).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Progress bar for active orders */}
                {isActiveOrder && (
                  <div className="py-2">
                    <OrderStatusTracker status={ord.status} />
                  </div>
                )}

                {/* Pickup Token Banner */}
                {ord.pickup_token && (
                  <div className="flex items-center justify-between bg-[#E6EFE7]/50 px-4 py-2.5 rounded-xl border border-[#245C45]/15">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#245C45] block">
                        PICKUP TOKEN
                      </span>
                      <span className="text-xl sm:text-2xl font-serif font-black text-[#245C45] tracking-tight">
                        {ord.pickup_token}
                      </span>
                    </div>
                    <span className="text-[11px] text-[#245C45] font-semibold bg-white/80 px-2.5 py-1 rounded-lg border border-[#245C45]/10">
                      Show at Canteen Counter
                    </span>
                  </div>
                )}

                {/* Order Details & Items */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs bg-[#F8F7F2] p-4 rounded-xl border border-[#245C45]/10">
                  <div>
                    <span className="font-bold uppercase text-[10px] text-[#252A27]/60 tracking-wider block mb-1">
                      Items Ordered
                    </span>
                    <div className="space-y-1">
                      {ord.items && ord.items.length > 0 ? (
                        ord.items.map((it, idx) => (
                          <div key={idx} className="flex justify-between text-[#252A27]">
                            <span>
                              <strong>{it.quantity}x</strong> {it.name || it.item_name}
                            </span>
                            <span className="text-[#252A27]/70">
                              ₹{(Number(it.unit_price) * it.quantity).toFixed(2)}
                            </span>
                          </div>
                        ))
                      ) : (
                        <p className="text-[#252A27]/80">{ord.items_summary || 'Standard meal'}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5 sm:border-l sm:border-stone-200 sm:pl-4">
                    <div className="flex justify-between">
                      <span className="text-[#252A27]/60">Pickup Slot:</span>
                      <span className="font-semibold text-[#252A27]">{ord.pickup_slot}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#252A27]/60">Pickup Date:</span>
                      <span className="font-semibold text-[#252A27]">
                        {ord.pickup_date ? String(ord.pickup_date).split('T')[0] : 'Today'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#252A27]/60">Payment:</span>
                      <span className="font-semibold text-[#245C45]">
                        {ord.payment_method === 'credit_funded' ? 'Community Credit Pool' : `${ord.payment_status} (Demo/Manual)`}
                      </span>
                    </div>
                    {ord.discount_amount > 0 && (
                      <div className="flex justify-between text-[#245C45]">
                        <span>Credits Redeemed:</span>
                        <span className="font-semibold">-₹{Number(ord.discount_amount).toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Cancel button if pending */}
                {isPending && (
                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      disabled={cancellingId === ord.order_id}
                      onClick={() => handleCancel(ord.order_id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-300 text-rose-700 hover:bg-rose-50 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>{cancellingId === ord.order_id ? 'Cancelling...' : 'Cancel Order'}</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={activeTab === 'Cancelled' ? XCircle : activeTab === 'Completed' ? CheckCircle2 : Clock}
          title={`No ${activeTab} Orders Found`}
          description={
            activeTab === 'All'
              ? "You haven't placed any canteen orders yet. Discover today's dishes and order ahead."
              : `You have no ${activeTab.toLowerCase()} orders at the moment.`
          }
          actionText={activeTab === 'All' ? 'Browse Menu' : undefined}
          actionLink={activeTab === 'All' ? '/student/menu' : undefined}
        />
      )}
    </div>
  );
}
