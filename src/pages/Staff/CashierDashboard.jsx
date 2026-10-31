import { useNavigate } from 'react-router-dom';
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
import TokenVerification from '../../components/staff/TokenVerification';
import TodaysOrdersTable from '../../components/staff/TodaysOrdersTable';
import SalesChart from '../../components/staff/SalesChart';
import { useStaffOrders } from '../../context/StaffOrderContext';

export default function CashierDashboard() {
  const navigate = useNavigate();
  const { orders } = useStaffOrders();

  // Derived statistics from centralized order state
  const collectedCount = orders.filter((o) => o.status === 'Collected').length;
  const ordersServed = 41 + collectedCount; // Initial 41 served + dynamic session handovers
  const pendingCount = orders.filter((o) => o.status !== 'Collected').length;
  const totalSales = 1260;
  const satisfaction = 98;

  return (
    <div className="space-y-6 sm:space-y-7 text-left">
      {/* 1. Welcome Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold text-[#252A27] tracking-tight flex items-center gap-2">
            <span>Good Morning, Priya!</span>
            <span className="text-xl sm:text-2xl animate-pulse">👩‍💼</span>
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-[#252A27]/75 font-normal">
            Serve meals. Support students. Reduce waste.
          </p>
        </div>

        {/* Date & Location Pill */}
        <div className="flex items-center gap-2.5 px-3.5 py-2 bg-white rounded-2xl border border-[#245C45]/15 shadow-2xs w-fit">
          <div className="w-8 h-8 rounded-lg bg-[#E6EFE7] text-[#245C45] flex items-center justify-center flex-shrink-0">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-bold text-[#252A27] block">
              Friday, 30 Oct 2026
            </span>
            <span className="text-[10px] text-[#245C45] font-semibold">
              Canteen · Main Counter
            </span>
          </div>
        </div>
      </div>

      {/* Frontend Demo Sync Banner */}
      <div className="p-3 bg-[#E6EFE7]/70 border border-[#245C45]/20 rounded-2xl flex items-center justify-between gap-3 text-xs text-[#245C45]">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#E99A55] flex-shrink-0" />
          <span>
            <strong>Frontend Demo Synchronization:</strong> Token verification and counter orders are live-synced with the Kitchen station for this browser session. Phase 2 connects to central PostgreSQL DBMS.
          </span>
        </div>
      </div>

      {/* 2. Four Quick Statistics Cards Derived from Shared Data */}
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
            {ordersServed}
          </span>
          <span className="text-xs font-semibold text-[#252A27]/85 mt-0.5 block">
            Orders Served
          </span>
          <span className="text-[11px] text-[#6B8F71] block">
            Pre-orders & walk-ins
          </span>
        </div>

        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#245C45]/15 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-[#E99A55]/15 text-[#E99A55] flex items-center justify-center">
              <IndianRupee className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#E99A55] bg-[#E99A55]/10 px-2 py-0.5 rounded-full">
              Today
            </span>
          </div>
          <span className="font-serif text-2xl sm:text-3xl font-bold text-[#252A27] block">
            ₹{totalSales.toLocaleString('en-IN')}
          </span>
          <span className="text-xs font-semibold text-[#252A27]/85 mt-0.5 block">
            Total Sales
          </span>
          <span className="text-[11px] text-[#6B8F71] block">
            Credits & UPI collections
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
            {pendingCount}
          </span>
          <span className="text-xs font-semibold text-[#252A27]/85 mt-0.5 block">
            Pending Orders
          </span>
          <span className="text-[11px] text-[#6B8F71] block">
            Waiting at counter / kitchen
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
            {satisfaction}%
          </span>
          <span className="text-xs font-semibold text-[#252A27]/85 mt-0.5 block">
            Student Satisfaction
          </span>
          <span className="text-[11px] text-[#6B8F71] block">
            Based on 38 ratings
          </span>
        </div>
      </div>

      {/* 3. Middle Section: Token Verification + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Quick Token Verification (7 cols) */}
        <div className="lg:col-span-7">
          <TokenVerification />
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
                onClick={() => navigate('/staff/new-order')}
                className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-[#F8F7F2] hover:bg-[#E6EFE7] border border-[#245C45]/10 text-left transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#245C45] text-white flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                    <Plus className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#252A27]">
                      New Order (Walk-in)
                    </h4>
                    <p className="text-[10px] text-[#252A27]/60">
                      Generate cash or UPI token
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-[#245C45] group-hover:translate-x-0.5 transition-transform" />
              </button>

              <button
                type="button"
                onClick={() => navigate('/staff/credits')}
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
                onClick={() => navigate('/staff/orders')}
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
                      Portion availability & specials
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-[#245C45] group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#245C45]/10 text-center">
            <span className="text-[11px] text-[#6B8F71] font-medium">
              PlateWise Cashier POS · Canteen Counter 2
            </span>
          </div>
        </div>
      </div>

      {/* 4. Lower Section: Today's Orders Table + Sales Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Today's Orders Table (7 cols) */}
        <div className="lg:col-span-7">
          <TodaysOrdersTable />
        </div>

        {/* Right Column: Today's Sales Analytics (5 cols) */}
        <div className="lg:col-span-5">
          <SalesChart />
        </div>
      </div>
    </div>
  );
}
