import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  UtensilsCrossed,
  Clock,
  HeartHandshake,
  AlertCircle,
  ShoppingBag,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import { useAuth } from '../../context/useAuth';
import { getStudentDashboard, cancelStudentOrder } from '../../services/studentApi';
import StudentStatCard from '../../components/student/StudentStatCard';
import ActiveOrderCard from '../../components/student/ActiveOrderCard';
import EmptyState from '../../components/student/EmptyState';
import LoadingSpinner from '../../components/dashboard/LoadingSpinner';

export default function StudentDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancellingId, setCancellingId] = useState(null);

  const reloadDashboard = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getStudentDashboard();
      setData(res);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
      setError(
        err.response?.data?.message || err.response?.data?.error || 'Unable to load dashboard data. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    getStudentDashboard()
      .then((res) => {
        if (!ignore) {
          setData(res);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!ignore) {
          setError(
            err.response?.data?.message || err.response?.data?.error || 'Unable to load dashboard data. Please try again.'
          );
          setLoading(false);
        }
      });
    return () => {
      ignore = true;
    };
  }, []);

  const handleCancelOrder = async (orderId) => {
    if (!window.confirm(`Are you sure you want to cancel order #${orderId}?`)) return;
    setCancellingId(orderId);
    try {
      await cancelStudentOrder(orderId);
      await reloadDashboard();
    } catch (err) {
      alert(err.response?.data?.message || err.response?.data?.error || 'Failed to cancel order.');
    } finally {
      setCancellingId(null);
    }
  };

  const currentDateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  if (loading) {
    return (
      <div className="py-20 flex justify-center">
        <LoadingSpinner text="Loading your canteen dashboard..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl p-8 border border-rose-200 text-center max-w-md mx-auto my-8">
        <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
        <h3 className="text-base font-bold text-[#252A27]">Dashboard Error</h3>
        <p className="text-xs text-rose-600 mt-1">{error}</p>
        <button
          onClick={reloadDashboard}
          className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-[#245C45] text-white hover:bg-[#1b4634] transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Retry</span>
        </button>
      </div>
    );
  }

  const stats = data?.stats || {
    total_orders: 0,
    active_orders: 0,
    completed_orders: 0,
    total_spent: 0,
  };

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#245C45]/15 shadow-xs relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-semibold text-[#245C45] bg-[#E6EFE7] px-3 py-1 rounded-full uppercase tracking-wider">
                {currentDateStr}
              </span>
              <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#252A27] mt-2">
                Welcome back, {user?.full_name?.split(' ')[0] || 'Student'}! 👋
              </h1>
              <p className="text-xs sm:text-sm text-[#252A27]/70 mt-1 max-w-xl">
                Ready for fresh, sustainably prepared meals? Order ahead, skip the canteen queue, and reduce campus food waste.
              </p>
            </div>
            <div>
              <Link
                to="/student/menu"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-[#245C45] text-white hover:bg-[#1b4634] shadow-xs hover:shadow-md transition-all whitespace-nowrap"
              >
                <UtensilsCrossed className="w-4 h-4" />
                <span>Explore Today&apos;s Menu</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StudentStatCard
          label="Total Orders"
          value={stats.total_orders}
          subtext="Lifetime campus orders"
          icon={ShoppingBag}
          color="emerald"
        />
        <StudentStatCard
          label="Active Orders"
          value={stats.active_orders}
          subtext="Being prepared or ready"
          icon={Clock}
          color="amber"
        />
        <StudentStatCard
          label="Completed"
          value={stats.completed_orders}
          subtext="Successfully collected"
          icon={CheckCircle2}
          color="blue"
        />
        <StudentStatCard
          label="Total Spent"
          value={`₹${Number(stats.total_spent || 0).toFixed(2)}`}
          subtext="Campus meals purchased"
          icon={TrendingUp}
          color="purple"
        />
      </div>

      {/* Active Order Card or Empty State */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-serif font-bold text-[#252A27]">
            Active Canteen Pickup
          </h2>
          {data?.active_order && (
            <Link to="/student/orders" className="text-xs font-semibold text-[#245C45] hover:underline">
              View all orders →
            </Link>
          )}
        </div>

        {data?.active_order ? (
          <ActiveOrderCard
            order={data.active_order}
            onCancelOrder={handleCancelOrder}
            isCancelling={cancellingId === data.active_order.order_id}
          />
        ) : (
          <EmptyState
            icon={ShoppingBag}
            title="No Active Orders Right Now"
            description="You don't have any meals in preparation. Browse today's freshly prepared specials and place a pre-order."
            actionText="Browse Menu"
            actionLink="/student/menu"
          />
        )}
      </div>

      {/* Recent Orders Section & Quick Actions Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 sm:p-6 border border-[#245C45]/10 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-serif font-bold text-[#252A27]">Recent Orders</h3>
            <Link to="/student/orders" className="text-xs font-semibold text-[#245C45] hover:underline">
              Full History
            </Link>
          </div>

          {data?.recent_orders && data.recent_orders.length > 0 ? (
            <div className="divide-y divide-stone-100">
              {data.recent_orders.map((ord) => (
                <div key={ord.order_id} className="py-3 flex items-center justify-between gap-3 text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[#252A27]">Order #{ord.order_id}</span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          ord.status === 'Collected' || ord.status === 'picked_up'
                            ? 'bg-emerald-50 text-emerald-700'
                            : ord.status === 'Cancelled'
                            ? 'bg-rose-50 text-rose-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {ord.status}
                      </span>
                    </div>
                    <p className="text-[#252A27]/60 text-[11px] mt-0.5 line-clamp-1">
                      {ord.items_summary || `${ord.total_quantity || 1} item(s)`}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-bold text-[#252A27]">₹{Number(ord.total_amount || 0).toFixed(2)}</span>
                    <p className="text-[10px] text-[#252A27]/50 mt-0.5">
                      {new Date(ord.order_date).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[#252A27]/60 py-4 text-center">No previous order history yet.</p>
          )}
        </div>

        {/* Quick Actions (1 col) */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-[#245C45]/10 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-base font-serif font-bold text-[#252A27] mb-3">Quick Actions</h3>
            <div className="space-y-2">
              <Link
                to="/student/menu"
                className="flex items-center gap-3 p-3 rounded-xl border border-[#245C45]/10 hover:bg-[#E6EFE7]/50 transition-colors text-xs font-medium text-[#252A27]"
              >
                <div className="p-2 rounded-lg bg-[#E6EFE7] text-[#245C45]">
                  <UtensilsCrossed className="w-4 h-4" />
                </div>
                <span>Order Food Now</span>
              </Link>
              <Link
                to="/student/orders"
                className="flex items-center gap-3 p-3 rounded-xl border border-[#245C45]/10 hover:bg-[#E6EFE7]/50 transition-colors text-xs font-medium text-[#252A27]"
              >
                <div className="p-2 rounded-lg bg-[#E6EFE7] text-[#245C45]">
                  <Clock className="w-4 h-4" />
                </div>
                <span>Track My Orders</span>
              </Link>
              <Link
                to="/student/pay-it-forward"
                className="flex items-center gap-3 p-3 rounded-xl border border-[#245C45]/10 hover:bg-[#E6EFE7]/50 transition-colors text-xs font-medium text-[#252A27]"
              >
                <div className="p-2 rounded-lg bg-[#E6EFE7] text-[#245C45]">
                  <HeartHandshake className="w-4 h-4" />
                </div>
                <span>Pay-It-Forward</span>
              </Link>
              <Link
                to="/student/complaints"
                className="flex items-center gap-3 p-3 rounded-xl border border-[#245C45]/10 hover:bg-[#E6EFE7]/50 transition-colors text-xs font-medium text-[#252A27]"
              >
                <div className="p-2 rounded-lg bg-[#E6EFE7] text-[#245C45]">
                  <AlertCircle className="w-4 h-4" />
                </div>
                <span>Report Grievance</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
