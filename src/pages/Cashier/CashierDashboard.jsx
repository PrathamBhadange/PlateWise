import { useState, useEffect, useCallback } from 'react';
import {
  Utensils,
  IndianRupee,
  Clock,
  Star,
  Plus,
  CreditCard,
  BookOpen,
  Calendar,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import TokenVerification from '../../components/cashier/TokenVerification';
import TodaysOrdersTable from '../../components/cashier/TodaysOrdersTable';
import SalesChart from '../../components/cashier/SalesChart';
import { useAuth } from '../../context/useAuth';
import api from '../../services/api';

export default function CashierDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [overview, setOverview] = useState({
    orders_served_today: 0,
    total_sales_today: 0,
    orders_in_queue: 0,
    orders_ready: 0,
    total_plates_today: 0,
    satisfaction: 98,
    hourly_sales: [],
    top_items: [],
  });

  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const loadData = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  useEffect(() => {
    let active = true;

    async function fetchDashboardData() {
      try {
        const [overviewRes, ordersRes] = await Promise.all([
          api.get('/cashier/overview'),
          api.get('/cashier/orders?date=all'),
        ]);
        if (active) {
          setOverview(overviewRes.data);
          setOrders(ordersRes.data);
        }
      } catch (err) {
        console.error('[Cashier] Failed to load cashier dashboard data:', err);
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    fetchDashboardData();

    // Poll every 15 seconds for counter synchronization
    const timer = setInterval(fetchDashboardData, 15000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [refreshKey]);

  // Prioritize Ready orders (eligible for counter pickup), then preparing/pending, then other orders
  const activeTokens = [
    ...orders.filter((o) => o.status === 'Ready').map((o) => o.token),
    ...orders.filter((o) => ['Preparing', 'Pending', 'Confirmed'].includes(o.status)).map((o) => o.token),
    ...orders.filter((o) => o.status === 'Collected' || o.status === 'picked_up').map((o) => o.token),
    ...orders.map((o) => o.token),
  ].filter(Boolean).filter((val, idx, self) => self.indexOf(val) === idx);

  const handleQuickAction = (action) => {
    if (action === 'new-order') {
      navigate('/cashier/new-order');
    } else if (action === 'credits') {
      navigate('/cashier/credits');
    } else if (action === 'menu') {
      navigate('/cashier/orders');
    }
  };

  return (
    <div className="space-y-6 text-left">
      {/* 1. Welcome & Shift Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold text-[#252A27] tracking-tight flex items-center gap-2">
            <span>Good Day, {user?.full_name?.split(' ')[0] || 'Staff'}!</span>
            <span className="text-xl sm:text-2xl animate-pulse">👩‍💼</span>
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-[#252A27]/75 font-normal">
            Serve meals. Verify tokens. Keep the queue moving smoothly.
          </p>
        </div>

        {/* Date & Location Pill */}
        <div className="flex items-center gap-2.5 px-3.5 py-2 bg-white rounded-2xl border border-[#245C45]/15 shadow-2xs w-fit">
          <div className="w-8 h-8 rounded-lg bg-[#E6EFE7] text-[#245C45] flex items-center justify-center flex-shrink-0">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-bold text-[#252A27] block">
              {new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
            <span className="text-[10px] text-[#245C45] font-semibold">
              Canteen · Main Counter
            </span>
          </div>
        </div>
      </div>

      {/* Real DB Sync Notice */}
        <div className="p-3 bg-[#E6EFE7]/80 border border-[#245C45]/20 rounded-2xl flex items-center justify-between gap-3 text-xs text-[#245C45]">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#E99A55] flex-shrink-0" />
            <span>
              <strong>Connected to PlateWise MySQL Database:</strong> Token verification, orders, and sales analytics reflect live orders placed by students and updated by kitchen staff.
            </span>
          </div>
        </div>

        {/* 2. Four Quick Statistics Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#245C45]/15 shadow-2xs">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-[#E6EFE7] text-[#245C45] flex items-center justify-center">
                <Utensils className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#245C45] bg-[#E6EFE7] px-2 py-0.5 rounded-full">
                Today
              </span>
            </div>
            <span className="font-serif text-2xl sm:text-3xl font-bold text-[#252A27] block">
              {overview.orders_served_today}
            </span>
            <span className="text-xs font-semibold text-[#252A27]/85 mt-0.5 block">
              Orders Served
            </span>
            <span className="text-[11px] text-[#6B8F71] block">
              Collected at counter
            </span>
          </div>

          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#245C45]/15 shadow-2xs">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-[#E99A55]/15 text-[#E99A55] flex items-center justify-center">
                <IndianRupee className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#E99A55] bg-[#E99A55]/10 px-2 py-0.5 rounded-full">
                Revenue
              </span>
            </div>
            <span className="font-serif text-2xl sm:text-3xl font-bold text-[#252A27] block">
              ₹{overview.total_sales_today.toLocaleString('en-IN')}
            </span>
            <span className="text-xs font-semibold text-[#252A27]/85 mt-0.5 block">
              Total Sales
            </span>
            <span className="text-[11px] text-[#6B8F71] block">
              {overview.total_plates_today} total plates
            </span>
          </div>

          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#245C45]/15 shadow-2xs">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                Queue
              </span>
            </div>
            <span className="font-serif text-2xl sm:text-3xl font-bold text-[#252A27] block">
              {overview.orders_in_queue}
            </span>
            <span className="text-xs font-semibold text-[#252A27]/85 mt-0.5 block">
              Orders in Queue
            </span>
            <span className="text-[11px] text-[#6B8F71] block">
              {overview.orders_ready} ready for pickup
            </span>
          </div>

          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#245C45]/15 shadow-2xs">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-[#E6EFE7] text-[#245C45] flex items-center justify-center">
                <Star className="w-5 h-5 fill-[#245C45]" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#245C45] bg-[#E6EFE7] px-2 py-0.5 rounded-full">
                Rating
              </span>
            </div>
            <span className="font-serif text-2xl sm:text-3xl font-bold text-[#252A27] block">
              {overview.satisfaction}%
            </span>
            <span className="text-xs font-semibold text-[#252A27]/85 mt-0.5 block">
              Student Satisfaction
            </span>
            <span className="text-[11px] text-[#6B8F71] block">
              Feedback score
            </span>
          </div>
        </div>

        {/* 3. Middle Section: Token Verification + Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Token Verification (7 cols) */}
          <div className="lg:col-span-7">
            <TokenVerification
              onOrderUpdated={loadData}
              sampleTokens={activeTokens}
            />
          </div>

          {/* Right Column: Quick Actions (5 cols) */}
          <div className="lg:col-span-5 bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-[#245C45]/15 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-[#245C45]/10">
                <div>
                  <h3 className="font-serif text-lg font-bold text-[#252A27]">
                    Quick Actions
                  </h3>
                  <p className="text-[11px] text-[#252A27]/60">
                    Instant counter operations
                  </p>
                </div>
                <Sparkles className="w-4 h-4 text-[#E99A55]" />
              </div>

              <div className="mt-3.5 space-y-2.5">
                <button
                  type="button"
                  onClick={() => handleQuickAction('new-order')}
                  className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-[#F8F7F2] hover:bg-[#E6EFE7] border border-[#245C45]/10 text-left transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#245C45] text-white flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                      <Plus className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[#252A27]">
                        New Walk-in Order
                      </h4>
                      <p className="text-[10px] text-[#252A27]/60">
                        Counter walk-in token generation
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-[#245C45] group-hover:translate-x-0.5 transition-transform" />
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickAction('credits')}
                  className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-[#F8F7F2] hover:bg-[#E6EFE7] border border-[#245C45]/10 text-left transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#6B8F71] text-white flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                      <CreditCard className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[#252A27]">
                        Check Meal Credits
                      </h4>
                      <p className="text-[10px] text-[#252A27]/60">
                        Query student semester balance
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-[#245C45] group-hover:translate-x-0.5 transition-transform" />
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickAction('menu')}
                  className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-[#F8F7F2] hover:bg-[#E6EFE7] border border-[#245C45]/10 text-left transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#E99A55] text-white flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                      <BookOpen className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[#252A27]">
                        View Today's Menu
                      </h4>
                      <p className="text-[10px] text-[#252A27]/60">
                        Batch availability & inventory
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-[#245C45] group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[#245C45]/10 text-center">
              <span className="text-[11px] text-[#6B8F71] font-medium">
                PlateWise Cashier POS · Main Counter 1
              </span>
            </div>
          </div>
        </div>

        {/* 4. Lower Section: Today's Orders Table + Sales Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7">
            <TodaysOrdersTable
              orders={orders}
              onOrderUpdated={loadData}
              isLoading={isLoading}
            />
          </div>

          <div className="lg:col-span-5">
            <SalesChart
              hourlySales={overview.hourly_sales}
              topItems={overview.top_items}
              totalSales={overview.total_sales_today}
              totalPlates={overview.total_plates_today}
            />
          </div>
        </div>
      </div>
    );
  }
