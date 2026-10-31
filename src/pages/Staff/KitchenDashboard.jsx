import {
  UtensilsCrossed,
  Flame,
  CheckCircle2,
  Clock,
  Calendar,
  ChefHat,
  Sparkles,
} from 'lucide-react';
import KitchenOrderQueue from '../../components/staff/KitchenOrderQueue';
import PreparationChart from '../../components/staff/PreparationChart';
import KitchenNotes from '../../components/staff/KitchenNotes';
import { useStaffOrders } from '../../context/StaffOrderContext';

export default function KitchenDashboard() {
  const { orders, updateOrderStatus } = useStaffOrders();

  // Purely derived counts from the EXACT same centralized order dataset:
  const pendingOrders = orders.filter((o) => o.status === 'Pending');
  const preparingOrders = orders.filter((o) => o.status === 'Preparing');
  const readyOrders = orders.filter((o) => o.status === 'Ready');

  const pendingCount = pendingOrders.length;
  const preparingCount = preparingOrders.length;
  const readyCount = readyOrders.length;

  // Active queue total = orders waiting or actively being cooked (Pending + Preparing)
  const queueTotal = pendingCount + preparingCount;

  return (
    <div className="space-y-6 sm:space-y-7 text-left">
      {/* 1. Welcome Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold text-[#252A27] tracking-tight flex items-center gap-2">
            <span>Good Morning, Suresh!</span>
            <ChefHat className="w-7 h-7 text-[#245C45]" />
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-[#252A27]/75 font-normal">
            Prepare healthy meals. Serve with care. Zero food waste.
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
              Main Kitchen · Preparation Bay
            </span>
          </div>
        </div>
      </div>

      {/* Frontend Demo Sync Banner */}
      <div className="p-3 bg-[#E6EFE7]/70 border border-[#245C45]/20 rounded-2xl flex items-center justify-between gap-3 text-xs text-[#245C45]">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#E99A55] flex-shrink-0" />
          <span>
            <strong>Frontend Demo Synchronization:</strong> Kitchen prep transitions update the live Cashier counter queue in real time for this session. Phase 2 connects to central PostgreSQL DBMS.
          </span>
        </div>
      </div>

      {/* 2. Four Quick Statistics Cards (strictly derived from shared dataset) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#245C45]/15 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-[#E6EFE7] text-[#245C45] flex items-center justify-center">
              <UtensilsCrossed className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#245C45] bg-[#E6EFE7] px-2 py-0.5 rounded-full">
              Live Queue
            </span>
          </div>
          <span className="font-serif text-2xl sm:text-3xl font-bold text-[#252A27] block">
            {queueTotal}
          </span>
          <span className="text-xs font-semibold text-[#252A27]/85 mt-0.5 block">
            Orders in Queue
          </span>
          <span className="text-[11px] text-[#6B8F71] block">
            Pending ({pendingCount}) + Preparing ({preparingCount})
          </span>
        </div>

        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#245C45]/15 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Flame className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
              Cooking
            </span>
          </div>
          <span className="font-serif text-2xl sm:text-3xl font-bold text-[#252A27] block">
            {preparingCount}
          </span>
          <span className="text-xs font-semibold text-[#252A27]/85 mt-0.5 block">
            Now Preparing
          </span>
          <span className="text-[11px] text-[#6B8F71] block">
            Active chef cooking bays
          </span>
        </div>

        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#245C45]/15 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-[#E6EFE7] text-[#245C45] flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#245C45] bg-[#E6EFE7] px-2 py-0.5 rounded-full">
              Hot Box
            </span>
          </div>
          <span className="font-serif text-2xl sm:text-3xl font-bold text-[#252A27] block">
            {readyCount}
          </span>
          <span className="text-xs font-semibold text-[#252A27]/85 mt-0.5 block">
            Ready for Pickup
          </span>
          <span className="text-[11px] text-[#6B8F71] block">
            Staged in express hot racks
          </span>
        </div>

        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#245C45]/15 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-[#E99A55]/15 text-[#E99A55] flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#E99A55] bg-[#E99A55]/10 px-2 py-0.5 rounded-full">
              Average
            </span>
          </div>
          <span className="font-serif text-2xl sm:text-3xl font-bold text-[#252A27] block">
            ~14 min
          </span>
          <span className="text-xs font-semibold text-[#252A27]/85 mt-0.5 block">
            Avg. Prep Time
          </span>
          <span className="text-[11px] text-[#6B8F71] block">
            Measured across current shift
          </span>
        </div>
      </div>

      {/* 3. Middle Section: Current Order Queue (7 cols) + Donut Chart & Notes (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Order Queue Cards (7 cols) */}
        <div className="lg:col-span-7">
          <KitchenOrderQueue
            orders={orders}
            onUpdateStatus={updateOrderStatus}
          />
        </div>

        {/* Right Column: Donut Chart + Kitchen Notes (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <PreparationChart
            pendingCount={pendingCount}
            preparingCount={preparingCount}
            readyCount={readyCount}
          />
          <KitchenNotes />
        </div>
      </div>
    </div>
  );
}
