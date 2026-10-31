import { useState, useEffect, useTransition } from 'react';
import {
  Utensils,
  DollarSign,
  Flame,
  Download,
  Calendar,
  Award,
  Clock,
  CheckCircle2,
  PackageCheck,
  ChefHat,
  ShoppingBag,
  Search,
  Sparkles,
  RefreshCw,
  AlertCircle,
  XCircle,
  Layers,
} from 'lucide-react';
import {
  ResponsiveContainer,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  Line,
  ComposedChart,
} from 'recharts';
import Member4Header from '../../components/dashboard/Member4Header';
import StatCard from '../../components/dashboard/StatCard';
import StatusBadge from '../../components/dashboard/StatusBadge';
import ConfidenceChip from '../../components/dashboard/ConfidenceChip';
import LoadingSpinner from '../../components/dashboard/LoadingSpinner';
import ErrorMessage from '../../components/dashboard/ErrorMessage';
import EmptyState from '../../components/dashboard/EmptyState';
import {
  getKitchenOverview,
  getKitchenOrders,
  updateOrderStatus,
  getKitchenSales,
  getDemand,
  generateDemand,
  getKitchenInventory,
} from '../../services/member4Api';

export default function KitchenDashboard() {
  const [selectedDate, setSelectedDate] = useState(
    () => new Date().toISOString().split('T')[0]
  );
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'orders' | 'demand' | 'sales' | 'inventory'
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [generatingDemand, setGeneratingDemand] = useState(false);
  const [error, setError] = useState(null);
  const [actionNotice, setActionNotice] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Data states
  const [overview, setOverview] = useState(null);
  const [orders, setOrders] = useState([]);
  const [salesData, setSalesData] = useState(null);
  const [demandData, setDemandData] = useState([]);
  const [inventoryData, setInventoryData] = useState([]);

  // Orders filters state
  const [orderSearch, setOrderSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [slotFilter, setSlotFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('newest');

  // Updating order ID tracker for button spinner
  const [updatingOrderId, setUpdatingOrderId] = useState(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    let active = true;

    async function fetchDashboardData() {
      try {
        const [overviewRes, ordersRes, salesRes, demandRes, invRes] =
          await Promise.all([
            getKitchenOverview(),
            getKitchenOrders({
              search: orderSearch,
              status: statusFilter,
              pickup_slot: slotFilter,
              date: selectedDate,
              sort: sortOrder,
            }),
            getKitchenSales(selectedDate),
            getDemand(selectedDate),
            getKitchenInventory(selectedDate),
          ]);

        if (active) {
          setOverview(overviewRes);
          setOrders(ordersRes?.orders || []);
          setSalesData(salesRes);
          setDemandData(demandRes?.recommendations || []);
          setInventoryData(invRes?.items || []);
          setLoading(false);
          setRefreshing(false);
        }
      } catch (err) {
        if (active) {
          console.error('Failed to load kitchen dashboard data:', err);
          setError(err.message || 'Failed to load kitchen metrics');
          setLoading(false);
          setRefreshing(false);
        }
      }
    }

    fetchDashboardData();

    return () => {
      active = false;
    };
  }, [selectedDate, refreshTrigger, orderSearch, statusFilter, slotFilter, sortOrder]);

  const handleDateChange = (newDate) => {
    setSelectedDate(newDate);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setError(null);
    setRefreshTrigger((prev) => prev + 1);
  };

  // Generate Demand Recommendation (calls POST endpoint)
  const handleGenerateDemand = async () => {
    setGeneratingDemand(true);
    setError(null);
    setActionNotice(null);
    try {
      const res = await generateDemand(selectedDate);
      startTransition(() => {
        setDemandData(res?.recommendations || []);
        setActionNotice({
          type: 'success',
          message: `Data-driven demand recommendations generated successfully for ${selectedDate}.`,
        });
      });
    } catch (err) {
      console.error('Failed to generate demand recommendations:', err);
      setActionNotice({
        type: 'error',
        message:
          err.response?.data?.message ||
          err.message ||
          'Failed to generate demand recommendations.',
      });
    } finally {
      setGeneratingDemand(false);
    }
  };

  // Status transition handler with HTTP 409 conflict detection
  const handleStatusTransition = async (orderId, targetStatus, currentStatus) => {
    setUpdatingOrderId(orderId);
    setError(null);
    setActionNotice(null);

    // Optimistic UI state update
    const previousOrders = [...orders];
    setOrders((prev) =>
      prev.map((o) => (o.order_id === orderId ? { ...o, status: targetStatus } : o))
    );

    try {
      const res = await updateOrderStatus(orderId, targetStatus, currentStatus);
      setActionNotice({
        type: 'success',
        message: res.message || `Order #${orderId} updated to ${targetStatus}`,
      });
      // Refresh overview stats in background
      getKitchenOverview().then(setOverview).catch(() => {});
    } catch (err) {
      console.error(`Status transition error for order #${orderId}:`, err);
      // Revert optimistic update
      setOrders(previousOrders);
      const msg =
        err.response?.data?.message ||
        err.message ||
        'Transition failed due to a server conflict.';
      setActionNotice({
        type: 'error',
        message: msg,
      });
    } finally {
      setUpdatingOrderId(null);
    }
  };

  // Export Prep Sheet CSV
  const handleExportCSV = () => {
    if (!demandData || demandData.length === 0) return;

    const headers = [
      'Menu Item ID',
      'Dish Name',
      'Category',
      'Price (INR)',
      'Weekday Historical Avg Sold',
      'Historical Waste %',
      'Active Pre-orders',
      'Recommended Cook Qty',
      'Confidence Level',
      'Data-Driven Rationale',
    ];

    const rows = demandData.map((d) => [
      d.menu_item_id,
      `"${d.item_name}"`,
      `"${d.category}"`,
      d.price,
      d.weekday_avg_sold,
      d.historical_waste_pct,
      d.pre_orders,
      d.recommended_qty,
      d.confidence_level,
      `"${d.recommendation_explanation || ''}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `platewise_demand_prep_sheet_${selectedDate}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Extract unique pickup slots from orders for filter dropdown
  const uniqueSlots = Array.from(
    new Set(orders.map((o) => o.pickup_slot).filter(Boolean))
  );

  // Inventory count summaries
  const inventoryCounts = {
    available: inventoryData.filter((i) => i.status === 'Available').length,
    lowStock: inventoryData.filter((i) => i.status === 'Low Stock').length,
    outOfStock: inventoryData.filter((i) => i.status === 'Out of Stock').length,
  };

  return (
    <div className="min-h-screen bg-[#F8F7F2] text-[#252A27] flex flex-col font-sans">
      <Member4Header
        title="Kitchen & Production Analytics"
        subtitle="Demand forecasting, daily batch prep recommendations, and real-time order lifecycle"
        onRoleChange={handleRefresh}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Top Controls: Target Date & Tab Navigation */}
        <div className="bg-white rounded-2xl border border-[#245C45]/10 shadow-sm p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-[#E6EFE7] text-[#245C45]">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <label
                  htmlFor="kitchen-date"
                  className="block text-xs font-semibold uppercase tracking-wider text-[#252A27]/60"
                >
                  Production Target Date
                </label>
                <input
                  id="kitchen-date"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => handleDateChange(e.target.value)}
                  className="mt-0.5 bg-white border border-[#245C45]/20 rounded-lg text-sm px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#245C45]/30 focus:border-[#245C45] font-medium"
                />
              </div>
            </div>

            <div className="hidden sm:block h-8 w-[1px] bg-[#245C45]/10" />

            {/* Quick Segmented Section Tabs */}
            <div className="inline-flex p-1 bg-[#F8F7F2] rounded-xl border border-[#245C45]/10 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeTab === 'all'
                    ? 'bg-[#245C45] text-white shadow-xs'
                    : 'text-[#252A27]/70 hover:text-[#252A27]'
                }`}
              >
                All Sections
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('orders')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'orders'
                    ? 'bg-[#245C45] text-white shadow-xs'
                    : 'text-[#252A27]/70 hover:text-[#252A27]'
                }`}
              >
                <span>Incoming Orders</span>
                {overview?.pending_orders > 0 && (
                  <span className="w-4 h-4 rounded-full bg-[#E99A55] text-white text-[10px] flex items-center justify-center font-bold">
                    {overview.pending_orders}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('demand')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeTab === 'demand'
                    ? 'bg-[#245C45] text-white shadow-xs'
                    : 'text-[#252A27]/70 hover:text-[#252A27]'
                }`}
              >
                Demand Planning
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('sales')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeTab === 'sales'
                    ? 'bg-[#245C45] text-white shadow-xs'
                    : 'text-[#252A27]/70 hover:text-[#252A27]'
                }`}
              >
                Daily Sales
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('inventory')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeTab === 'inventory'
                    ? 'bg-[#245C45] text-white shadow-xs'
                    : 'text-[#252A27]/70 hover:text-[#252A27]'
                }`}
              >
                Inventory
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex items-center gap-2 bg-white hover:bg-[#F8F7F2] text-[#252A27] border border-[#245C45]/20 rounded-xl text-sm font-medium px-3.5 py-2 transition-all cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-[#245C45]' : ''}`} />
              <span>Refresh</span>
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              disabled={demandData.length === 0}
              className="inline-flex items-center gap-2 bg-[#245C45] hover:bg-[#164B38] text-white rounded-xl text-sm font-medium px-4 py-2 transition-all shadow-xs cursor-pointer disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>Export Prep Sheet</span>
            </button>
          </div>
        </div>

        {/* Action / Error Banner */}
        {actionNotice && (
          <div
            className={`p-4 rounded-2xl border flex items-center justify-between gap-3 text-sm transition-all ${
              actionNotice.type === 'error'
                ? 'bg-[#B3402F]/10 border-[#B3402F]/30 text-[#B3402F]'
                : 'bg-[#E6EFE7] border-[#245C45]/20 text-[#245C45]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {actionNotice.type === 'error' ? (
                <AlertCircle className="w-5 h-5 shrink-0" />
              ) : (
                <CheckCircle2 className="w-5 h-5 shrink-0" />
              )}
              <span className="font-medium">{actionNotice.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setActionNotice(null)}
              className="p-1 hover:bg-black/5 rounded-lg cursor-pointer"
            >
              <XCircle className="w-4 h-4" />
            </button>
          </div>
        )}

        {error && <ErrorMessage message={error} onRetry={handleRefresh} />}

        {loading ? (
          <LoadingSpinner message="Loading live kitchen analytics & orders..." />
        ) : (
          <>
            {/* AREA 1: OVERVIEW STAT CARDS */}
            {(activeTab === 'all' || activeTab === 'orders' || activeTab === 'sales') && (
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-serif font-bold text-[#252A27] flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[#245C45]" />
                    <span>Kitchen Operational Summary</span>
                  </h2>
                  <span className="text-xs text-[#252A27]/60">Date: {selectedDate}</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 sm:gap-4">
                  <StatCard
                    title="Total Orders"
                    value={Number(overview?.total_orders_today || 0).toLocaleString()}
                    subtitle="Booked today"
                    icon={ShoppingBag}
                  />
                  <StatCard
                    title="Pending"
                    value={Number(overview?.pending_orders || 0).toLocaleString()}
                    subtitle="Awaiting confirm"
                    icon={Clock}
                    alert={Number(overview?.pending_orders || 0) > 0}
                  />
                  <StatCard
                    title="Preparing"
                    value={Number(overview?.orders_preparing || 0).toLocaleString()}
                    subtitle="In kitchen"
                    icon={ChefHat}
                  />
                  <StatCard
                    title="Ready"
                    value={Number(overview?.orders_ready || 0).toLocaleString()}
                    subtitle="Pickup counter"
                    icon={PackageCheck}
                  />
                  <StatCard
                    title="Dishes Sold"
                    value={Number(overview?.dishes_sold_today || 0).toLocaleString()}
                    subtitle="Fulfilled portions"
                    icon={Utensils}
                  />
                  <StatCard
                    title="Revenue"
                    value={`₹${Number(overview?.revenue_today || 0).toLocaleString('en-IN')}`}
                    subtitle="Active orders"
                    icon={DollarSign}
                  />
                  <StatCard
                    title="Available Inv."
                    value={Number(overview?.available_inventory || 0).toLocaleString()}
                    subtitle="Remaining dishes"
                    icon={Flame}
                  />
                </div>
              </section>
            )}

            {/* AREA 2: INCOMING ORDERS */}
            {(activeTab === 'all' || activeTab === 'orders') && (
              <section className="bg-white rounded-2xl border border-[#245C45]/10 shadow-sm p-5 sm:p-6 space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#245C45]/10 pb-4">
                  <div>
                    <h2 className="text-lg font-serif font-bold text-[#252A27] flex items-center gap-2">
                      <ShoppingBag className="w-5 h-5 text-[#245C45]" />
                      <span>Incoming Orders & Preparation Pipeline</span>
                    </h2>
                    <p className="text-xs text-[#252A27]/60">
                      Live state machine: Pending → Confirmed → Preparing → Ready → Collected
                    </p>
                  </div>

                  {/* Orders Filter Controls */}
                  <div className="flex flex-wrap items-center gap-2.5">
                    {/* Search */}
                    <div className="relative">
                      <Search className="w-4 h-4 text-[#252A27]/40 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search student or item..."
                        value={orderSearch}
                        onChange={(e) => setOrderSearch(e.target.value)}
                        className="pl-9 pr-3 py-1.5 bg-white border border-[#245C45]/20 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#245C45]/30 focus:border-[#245C45] w-48"
                      />
                    </div>

                    {/* Status filter */}
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="bg-white border border-[#245C45]/20 rounded-lg text-xs px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#245C45]/30 focus:border-[#245C45]"
                    >
                      <option value="all">All Statuses</option>
                      <option value="Pending">Pending</option>
                      <option value="Confirmed">Confirmed</option>
                      <option value="Preparing">Preparing</option>
                      <option value="Ready">Ready</option>
                      <option value="Collected">Collected</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>

                    {/* Pickup slot filter */}
                    {uniqueSlots.length > 0 && (
                      <select
                        value={slotFilter}
                        onChange={(e) => setSlotFilter(e.target.value)}
                        className="bg-white border border-[#245C45]/20 rounded-lg text-xs px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#245C45]/30 focus:border-[#245C45]"
                      >
                        <option value="all">All Pickup Slots</option>
                        {uniqueSlots.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    )}

                    {/* Sort Order */}
                    <select
                      value={sortOrder}
                      onChange={(e) => setSortOrder(e.target.value)}
                      className="bg-white border border-[#245C45]/20 rounded-lg text-xs px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#245C45]/30 focus:border-[#245C45]"
                    >
                      <option value="newest">Newest First</option>
                      <option value="oldest">Oldest First</option>
                    </select>
                  </div>
                </div>

                {orders.length === 0 ? (
                  <EmptyState
                    title="No matching kitchen orders found"
                    description="No orders match the selected search, status, or date filters."
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm border-collapse min-w-[850px]">
                      <thead>
                        <tr className="border-b border-[#245C45]/10 text-xs font-semibold uppercase tracking-wider text-[#252A27]/60">
                          <th className="py-3 px-3">Order ID</th>
                          <th className="py-3 px-3">Student Name</th>
                          <th className="py-3 px-3">Dishes & Quantity</th>
                          <th className="py-3 px-3 text-center">Items Qty</th>
                          <th className="py-3 px-3">Order Time</th>
                          <th className="py-3 px-3">Pickup Slot</th>
                          <th className="py-3 px-3">Payment</th>
                          <th className="py-3 px-3">Status</th>
                          <th className="py-3 px-3 text-right">Kitchen Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#245C45]/5">
                        {orders.map((o) => {
                          const isBusy = updatingOrderId === o.order_id;
                          const st = (o.status || 'Pending').toLowerCase();

                          return (
                            <tr
                              key={o.order_id}
                              className="hover:bg-[#F8F7F2]/60 transition-colors"
                            >
                              <td className="py-3 px-3 font-semibold text-[#245C45]">
                                #{o.order_id}
                              </td>
                              <td className="py-3 px-3">
                                <div className="font-medium text-[#252A27]">
                                  {o.student_name}
                                </div>
                                <span className="text-xs text-[#252A27]/50">
                                  {o.student_email}
                                </span>
                              </td>
                              <td className="py-3 px-3 max-w-xs">
                                <span className="font-medium text-[#252A27] line-clamp-2">
                                  {o.items_summary || 'Custom order'}
                                </span>
                              </td>
                              <td className="py-3 px-3 text-center font-bold text-[#245C45]">
                                {o.total_quantity}
                              </td>
                              <td className="py-3 px-3 text-xs text-[#252A27]/70 whitespace-nowrap">
                                {o.order_date
                                  ? new Date(o.order_date).toLocaleTimeString([], {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })
                                  : '-'}
                              </td>
                              <td className="py-3 px-3 whitespace-nowrap">
                                <span className="inline-flex items-center gap-1 bg-[#F8F7F2] border border-[#245C45]/15 text-[#252A27] text-xs font-medium px-2 py-0.5 rounded-md">
                                  <Clock className="w-3 h-3 text-[#6B8F71]" />
                                  {o.pickup_slot}
                                </span>
                              </td>
                              <td className="py-3 px-3 whitespace-nowrap">
                                <span
                                  className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-md ${
                                    o.payment_status === 'Paid'
                                      ? 'bg-[#E6EFE7] text-[#245C45]'
                                      : 'bg-[#E99A55]/20 text-[#252A27]'
                                  }`}
                                >
                                  {o.payment_status || 'Paid'}
                                </span>
                              </td>
                              <td className="py-3 px-3 whitespace-nowrap">
                                <StatusBadge status={o.status} />
                              </td>
                              <td className="py-3 px-3 text-right whitespace-nowrap">
                                {st === 'pending' && (
                                  <div className="inline-flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      disabled={isBusy}
                                      onClick={() =>
                                        handleStatusTransition(o.order_id, 'Confirmed', o.status)
                                      }
                                      className="bg-[#245C45] hover:bg-[#164B38] text-white rounded-lg text-xs font-medium px-2.5 py-1.5 transition-all shadow-2xs cursor-pointer disabled:opacity-50"
                                    >
                                      {isBusy ? 'Saving...' : 'Confirm'}
                                    </button>
                                    <button
                                      type="button"
                                      disabled={isBusy}
                                      onClick={() =>
                                        handleStatusTransition(o.order_id, 'Cancelled', o.status)
                                      }
                                      className="text-[#B3402F] hover:bg-[#B3402F]/10 rounded-lg text-xs font-medium px-2 py-1.5 transition-all cursor-pointer disabled:opacity-50"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                )}

                                {st === 'confirmed' && (
                                  <button
                                    type="button"
                                    disabled={isBusy}
                                    onClick={() =>
                                      handleStatusTransition(o.order_id, 'Preparing', o.status)
                                    }
                                    className="bg-[#E99A55] hover:bg-[#d88741] text-white rounded-lg text-xs font-medium px-2.5 py-1.5 transition-all shadow-2xs cursor-pointer disabled:opacity-50 inline-flex items-center gap-1"
                                  >
                                    <ChefHat className="w-3.5 h-3.5" />
                                    <span>{isBusy ? 'Saving...' : 'Start Prep'}</span>
                                  </button>
                                )}

                                {st === 'preparing' && (
                                  <button
                                    type="button"
                                    disabled={isBusy}
                                    onClick={() =>
                                      handleStatusTransition(o.order_id, 'Ready', o.status)
                                    }
                                    className="bg-[#245C45] hover:bg-[#164B38] text-white rounded-lg text-xs font-medium px-2.5 py-1.5 transition-all shadow-2xs cursor-pointer disabled:opacity-50 inline-flex items-center gap-1"
                                  >
                                    <PackageCheck className="w-3.5 h-3.5" />
                                    <span>{isBusy ? 'Saving...' : 'Mark Ready'}</span>
                                  </button>
                                )}

                                {st === 'ready' && (
                                  <button
                                    type="button"
                                    disabled={isBusy}
                                    onClick={() =>
                                      handleStatusTransition(o.order_id, 'Collected', o.status)
                                    }
                                    className="bg-[#164B38] hover:bg-[#0f3427] text-white rounded-lg text-xs font-medium px-2.5 py-1.5 transition-all shadow-2xs cursor-pointer disabled:opacity-50 inline-flex items-center gap-1"
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>{isBusy ? 'Saving...' : 'Handed Over'}</span>
                                  </button>
                                )}

                                {(st === 'collected' || st === 'picked_up') && (
                                  <span className="text-xs text-[#245C45] font-semibold inline-flex items-center gap-1">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>Fulfilled</span>
                                  </span>
                                )}

                                {st === 'cancelled' && (
                                  <span className="text-xs text-[#B3402F] font-semibold">
                                    Cancelled
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            )}

            {/* AREA 3: DEMAND PREDICTION */}
            {(activeTab === 'all' || activeTab === 'demand') && (
              <section className="bg-white rounded-2xl border border-[#245C45]/10 shadow-sm p-5 sm:p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#245C45]/10 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-serif font-bold text-[#252A27]">
                        Demand Forecasting & Batch Sizing
                      </h2>
                      <span className="bg-[#E6EFE7] text-[#245C45] rounded-full text-xs font-semibold px-2.5 py-0.5 inline-flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-[#245C45]" />
                        <span>AI-assisted demand prediction</span>
                      </span>
                    </div>
                    <p className="text-xs text-[#252A27]/60">
                      Multi-factor regression: 4-week weekday averages, active pre-orders, and &gt;15% waste reduction damping
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleGenerateDemand}
                    disabled={generatingDemand}
                    className="inline-flex items-center gap-2 bg-[#245C45] hover:bg-[#164B38] text-white rounded-xl text-sm font-medium px-4 py-2 transition-all shadow-xs cursor-pointer disabled:opacity-50 shrink-0 self-start sm:self-auto"
                  >
                    <Sparkles className={`w-4 h-4 ${generatingDemand ? 'animate-spin' : ''}`} />
                    <span>
                      {generatingDemand ? 'Calculating...' : 'Generate Demand Recommendations'}
                    </span>
                  </button>
                </div>

                {demandData.length === 0 ? (
                  <EmptyState
                    title="No demand forecast available"
                    description="Click 'Generate Demand Recommendations' to compute dynamic recommendations."
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm border-collapse min-w-[750px]">
                      <thead>
                        <tr className="border-b border-[#245C45]/10 text-xs font-semibold uppercase tracking-wider text-[#252A27]/60">
                          <th className="py-3 px-3">Dish / Category</th>
                          <th className="py-3 px-3 text-right">Price</th>
                          <th className="py-3 px-3 text-right">4-Wk Weekday Avg</th>
                          <th className="py-3 px-3 text-right">Waste Rate</th>
                          <th className="py-3 px-3 text-right">Pre-Orders</th>
                          <th className="py-3 px-3 text-right">Recommended Cook</th>
                          <th className="py-3 px-3 text-center">Confidence</th>
                          <th className="py-3 px-3">Recommendation Explanation</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#245C45]/5">
                        {demandData.map((dish) => {
                          const isHighWaste = Number(dish.historical_waste_pct) > 15;
                          return (
                            <tr
                              key={dish.menu_item_id}
                              className="hover:bg-[#F8F7F2]/60 transition-colors"
                            >
                              <td className="py-3.5 px-3">
                                <div className="font-semibold text-[#252A27]">
                                  {dish.item_name}
                                </div>
                                <span className="text-xs text-[#6B8F71] font-medium">
                                  {dish.category}
                                </span>
                              </td>
                              <td className="py-3.5 px-3 text-right font-medium">
                                ₹{dish.price}
                              </td>
                              <td className="py-3.5 px-3 text-right font-medium">
                                {dish.weekday_avg_sold}
                              </td>
                              <td className="py-3.5 px-3 text-right">
                                <span
                                  className={`text-xs font-semibold ${
                                    isHighWaste
                                      ? 'text-[#B3402F] bg-[#B3402F]/10 px-2 py-0.5 rounded-md'
                                      : 'text-[#6B8F71]'
                                  }`}
                                >
                                  {dish.historical_waste_pct}%
                                </span>
                              </td>
                              <td className="py-3.5 px-3 text-right font-semibold text-[#245C45]">
                                {dish.pre_orders}
                              </td>
                              <td className="py-3.5 px-3 text-right">
                                <span className="inline-block bg-[#245C45] text-white font-serif font-bold px-3 py-1 rounded-lg text-sm shadow-xs">
                                  {dish.recommended_qty}
                                </span>
                              </td>
                              <td className="py-3.5 px-3 text-center">
                                <ConfidenceChip level={dish.confidence_level} />
                              </td>
                              <td className="py-3.5 px-3 text-xs text-[#252A27]/75 max-w-xs">
                                {dish.recommendation_explanation}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            )}

            {/* AREA 4: DAILY SALES ANALYTICS */}
            {(activeTab === 'all' || activeTab === 'sales') && (
              <section className="space-y-4">
                {/* Metrics + Best Selling Dish Card */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {/* Daily Sales Card */}
                  <div className="lg:col-span-2 bg-white rounded-2xl border border-[#245C45]/10 shadow-sm p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-serif font-bold text-base text-[#252A27]">
                          Sales & Portion Audit ({selectedDate})
                        </h3>
                        <p className="text-xs text-[#252A27]/60">
                          Reusing v_daily_sales & sales_history with zero-production guards
                        </p>
                      </div>
                      <span className="text-xs bg-[#E6EFE7] text-[#245C45] px-2.5 py-1 rounded-full font-semibold">
                        Fulfilled
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="p-3 rounded-xl bg-[#F8F7F2] border border-[#245C45]/5">
                        <span className="text-xs text-[#252A27]/60 block">Produced</span>
                        <span className="text-lg font-bold text-[#252A27]">
                          {salesData?.produced_portions || 0}
                        </span>
                      </div>
                      <div className="p-3 rounded-xl bg-[#F8F7F2] border border-[#245C45]/5">
                        <span className="text-xs text-[#252A27]/60 block">Sold</span>
                        <span className="text-lg font-bold text-[#245C45]">
                          {salesData?.sold_portions || 0}
                        </span>
                      </div>
                      <div className="p-3 rounded-xl bg-[#F8F7F2] border border-[#245C45]/5">
                        <span className="text-xs text-[#252A27]/60 block">Leftover</span>
                        <span className="text-lg font-bold text-[#E99A55]">
                          {salesData?.remaining_portions || 0}
                        </span>
                      </div>
                      <div className="p-3 rounded-xl bg-[#F8F7F2] border border-[#245C45]/5">
                        <span className="text-xs text-[#252A27]/60 block">Waste %</span>
                        <span
                          className={`text-lg font-bold ${
                            Number(salesData?.waste_percentage || 0) > 15
                              ? 'text-[#B3402F]'
                              : 'text-[#6B8F71]'
                          }`}
                        >
                          {salesData?.waste_percentage || 0}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Best Selling Dish Highlight */}
                  <div className="bg-white rounded-2xl border border-[#245C45]/10 shadow-sm p-5 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="p-2 rounded-xl bg-[#E6EFE7] text-[#245C45]">
                          <Award className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-serif font-bold text-sm text-[#252A27]">
                            Best-Selling Dish
                          </h4>
                          <span className="text-xs text-[#252A27]/60">Top canteen performer</span>
                        </div>
                      </div>

                      {salesData?.best_selling_dish ? (
                        <div className="p-3 rounded-xl bg-[#F8F7F2] border border-[#245C45]/10 space-y-1">
                          <p className="font-serif font-bold text-[#245C45] text-base">
                            {salesData.best_selling_dish.item_name}
                          </p>
                          <span className="text-xs text-[#6B8F71] font-medium">
                            Category: {salesData.best_selling_dish.category || 'General'}
                          </span>
                          <div className="flex items-center justify-between text-xs pt-2 border-t border-[#245C45]/5 text-[#252A27]">
                            <span>
                              Sold: <strong>{salesData.best_selling_dish.qty_sold || 0}</strong>{' '}
                              portions
                            </span>
                            <span>
                              Revenue:{' '}
                              <strong>
                                ₹
                                {Number(
                                  salesData.best_selling_dish.revenue || 0
                                ).toLocaleString('en-IN')}
                              </strong>
                            </span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-[#252A27]/60">No sales recorded today.</p>
                      )}
                    </div>

                    <div className="mt-3 pt-3 border-t border-[#245C45]/10 flex items-center justify-between text-xs text-[#252A27]/60">
                      <span>Total Revenue:</span>
                      <span className="font-serif font-bold text-[#245C45] text-sm">
                        ₹{Number(salesData?.revenue || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Sales Trend Chart */}
                {salesData?.sales_trend && salesData.sales_trend.length > 0 && (
                  <div className="bg-white rounded-2xl border border-[#245C45]/10 shadow-sm p-5 sm:p-6 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-serif font-bold text-base text-[#252A27]">
                          14-Day Production Volume & Revenue Trend
                        </h3>
                        <p className="text-xs text-[#252A27]/60">
                          Reused from v_daily_sales view: Cooked portions vs. Sold portions with moving average revenue
                        </p>
                      </div>
                    </div>

                    <div className="h-64 sm:h-72 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart
                          data={salesData.sales_trend}
                          margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#245C45" strokeOpacity={0.1} />
                          <XAxis
                            dataKey="sale_date"
                            tick={{ fill: '#252A27', fontSize: 11 }}
                            tickFormatter={(d) => d.slice(5)}
                          />
                          <YAxis yAxisId="left" tick={{ fill: '#252A27', fontSize: 11 }} />
                          <YAxis
                            yAxisId="right"
                            orientation="right"
                            tick={{ fill: '#E99A55', fontSize: 11 }}
                            tickFormatter={(v) => `₹${v / 1000}k`}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#FFFFFF',
                              borderColor: '#245C45',
                              borderRadius: '12px',
                              fontSize: '12px',
                            }}
                          />
                          <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                          <Bar
                            yAxisId="left"
                            dataKey="total_cooked"
                            name="Cooked (Portions)"
                            fill="#6B8F71"
                            radius={[4, 4, 0, 0]}
                          />
                          <Bar
                            yAxisId="left"
                            dataKey="total_sold"
                            name="Sold (Portions)"
                            fill="#245C45"
                            radius={[4, 4, 0, 0]}
                          />
                          <Line
                            yAxisId="right"
                            type="monotone"
                            dataKey="moving_avg_7d_revenue"
                            name="7-Day Avg Revenue"
                            stroke="#E99A55"
                            strokeWidth={2.5}
                            dot={false}
                          />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </section>
            )}

            {/* AREA 5: INVENTORY OVERVIEW */}
            {(activeTab === 'all' || activeTab === 'inventory') && (
              <section className="bg-white rounded-2xl border border-[#245C45]/10 shadow-sm p-5 sm:p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#245C45]/10 pb-4">
                  <div>
                    <h2 className="text-lg font-serif font-bold text-[#252A27] flex items-center gap-2">
                      <Flame className="w-5 h-5 text-[#245C45]" />
                      <span>Live Canteen Inventory & Portion Availability</span>
                    </h2>
                    <p className="text-xs text-[#252A27]/60">
                      Cooked batches, portions sold, and remaining inventory with low stock warning (threshold: 15)
                    </p>
                  </div>

                  {/* Inventory Summary Pills */}
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 bg-[#E6EFE7] text-[#245C45] text-xs font-semibold px-2.5 py-1 rounded-full">
                      <span className="w-2 h-2 rounded-full bg-[#245C45]" />
                      {inventoryCounts.available} Available
                    </span>
                    <span className="inline-flex items-center gap-1 bg-[#E99A55]/20 text-[#252A27] text-xs font-semibold px-2.5 py-1 rounded-full">
                      <span className="w-2 h-2 rounded-full bg-[#E99A55]" />
                      {inventoryCounts.lowStock} Low Stock
                    </span>
                    <span className="inline-flex items-center gap-1 bg-[#B3402F]/10 text-[#B3402F] text-xs font-semibold px-2.5 py-1 rounded-full">
                      <span className="w-2 h-2 rounded-full bg-[#B3402F]" />
                      {inventoryCounts.outOfStock} Out of Stock
                    </span>
                  </div>
                </div>

                {inventoryData.length === 0 ? (
                  <EmptyState
                    title="No inventory batches logged"
                    description="No production batches found for this date in food_batches."
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm border-collapse min-w-[650px]">
                      <thead>
                        <tr className="border-b border-[#245C45]/10 text-xs font-semibold uppercase tracking-wider text-[#252A27]/60">
                          <th className="py-3 px-3">Dish / Category</th>
                          <th className="py-3 px-3 text-right">Unit Price</th>
                          <th className="py-3 px-3 text-right">Available Qty</th>
                          <th className="py-3 px-3 text-right">Cooked (Produced)</th>
                          <th className="py-3 px-3 text-right">Sold Qty</th>
                          <th className="py-3 px-3 text-right">Remaining</th>
                          <th className="py-3 px-3 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#245C45]/5">
                        {inventoryData.map((item) => (
                          <tr
                            key={item.menu_item_id}
                            className="hover:bg-[#F8F7F2]/60 transition-colors"
                          >
                            <td className="py-3 px-3">
                              <div className="font-semibold text-[#252A27]">
                                {item.item_name}
                              </div>
                              <span className="text-xs text-[#6B8F71] font-medium">
                                {item.category}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right font-medium">
                              ₹{item.price}
                            </td>
                            <td className="py-3 px-3 text-right font-bold text-[#245C45]">
                              {item.available_qty}
                            </td>
                            <td className="py-3 px-3 text-right text-[#252A27]/80">
                              {item.produced_qty}
                            </td>
                            <td className="py-3 px-3 text-right text-[#252A27]/80">
                              {item.sold_qty}
                            </td>
                            <td className="py-3 px-3 text-right font-semibold">
                              <span
                                className={
                                  item.remaining_qty === 0
                                    ? 'text-[#B3402F]'
                                    : item.remaining_qty <= 15
                                    ? 'text-[#E99A55]'
                                    : 'text-[#252A27]'
                                }
                              >
                                {item.remaining_qty}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-center">
                              <StatusBadge status={item.status} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}
