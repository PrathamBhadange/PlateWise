import { useState, useEffect, useTransition } from 'react';
import { useLocation } from 'react-router-dom';
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
  PlusCircle,
  Send,
  Trash2,
  HeartHandshake,
  X,
  AlertTriangle,
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
  recordKitchenProduction,
  recordKitchenWaste,
  publishSurplusDonation,
  getBatchStock,
  getMenuItems,
} from '../../services/member4Api';

export default function KitchenDashboard({ showTitle = true }) {
  const location = useLocation();

  const getActiveTab = (pathname) => {
    if (pathname.includes('/orders')) return 'orders';
    if (pathname.includes('/demand')) return 'demand';
    if (pathname.includes('/sales')) return 'sales';
    if (pathname.includes('/inventory')) return 'inventory';
    return 'all';
  };

  const activeTab = getActiveTab(location.pathname);

  const [selectedDate, setSelectedDate] = useState(
    () => sessionStorage.getItem('kitchen_selected_date') || new Date().toISOString().split('T')[0]
  );
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
  const [menuItemsList, setMenuItemsList] = useState([]);

  // Production batch modal state
  const [showProductionModal, setShowProductionModal] = useState(false);
  const [productionForm, setProductionForm] = useState({
    menu_item_id: '',
    batch_date: '',
    meal_session: 'Lunch',
    cooked_qty: '',
    batch_code: '',
    notes: '',
  });
  const [productionSubmitting, setProductionSubmitting] = useState(false);
  const [productionError, setProductionError] = useState(null);

  // Publish surplus donation modal state
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [selectedBatchForDonation, setSelectedBatchForDonation] = useState(null);
  const [donationForm, setDonationForm] = useState({
    quantity: '',
    collection_deadline: '',
    notes: '',
  });
  const [publishSubmitting, setPublishSubmitting] = useState(false);
  const [publishError, setPublishError] = useState(null);

  // Wastage modal state
  const [showWasteModal, setShowWasteModal] = useState(false);
  const [selectedBatchForWaste, setSelectedBatchForWaste] = useState(null);
  const [wasteForm, setWasteForm] = useState({
    quantity: '',
    category: 'Preparation_Waste',
    reason: '',
  });
  const [wasteSubmitting, setWasteSubmitting] = useState(false);
  const [wasteError, setWasteError] = useState(null);

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
        const [overviewRes, ordersRes, salesRes, demandRes, invRes, menuItemsRes] =
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
            getMenuItems().catch(() => []),
          ]);

        if (active) {
          setOverview(overviewRes);
          setOrders(ordersRes?.orders || []);
          setSalesData(salesRes);
          setDemandData(demandRes?.recommendations || []);
          setInventoryData(invRes?.items || []);
          setMenuItemsList(Array.isArray(menuItemsRes) ? menuItemsRes : []);
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
    sessionStorage.setItem('kitchen_selected_date', newDate);
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

  // Open Production Modal
  const handleOpenProductionModal = () => {
    const defaultMenuId = menuItemsList[0]?.menu_item_id || inventoryData[0]?.menu_item_id || '';
    setProductionForm({
      menu_item_id: defaultMenuId,
      batch_date: selectedDate,
      meal_session: 'Lunch',
      cooked_qty: '',
      batch_code: '',
      notes: '',
    });
    setProductionError(null);
    setShowProductionModal(true);
  };

  // Submit Production Entry
  const handleSubmitProduction = async (e) => {
    e.preventDefault();
    setProductionSubmitting(true);
    setProductionError(null);
    try {
      const res = await recordKitchenProduction({
        menu_item_id: parseInt(productionForm.menu_item_id, 10),
        batch_date: productionForm.batch_date || selectedDate,
        meal_session: productionForm.meal_session,
        cooked_qty: parseInt(productionForm.cooked_qty, 10),
        batch_code: productionForm.batch_code || undefined,
        notes: productionForm.notes || undefined,
      });
      setShowProductionModal(false);
      setActionNotice({
        type: 'success',
        message: res.message || 'Production batch logged successfully!',
      });
      handleRefresh();
    } catch (err) {
      console.error('Failed to record production batch:', err);
      setProductionError(err.response?.data?.error || err.message || 'Failed to record production batch');
    } finally {
      setProductionSubmitting(false);
    }
  };

  // Open Publish Surplus Donation Modal
  const handleOpenPublishModal = (item) => {
    if (!item.food_batch_id || item.available_surplus <= 0) return;
    setSelectedBatchForDonation(item);
    setDonationForm({
      quantity: item.available_surplus,
      collection_deadline: '',
      notes: '',
    });
    setPublishError(null);
    setShowPublishModal(true);
  };

  // Submit Surplus Donation
  const handleSubmitPublishDonation = async (e) => {
    e.preventDefault();
    if (!selectedBatchForDonation) return;
    setPublishSubmitting(true);
    setPublishError(null);
    try {
      const res = await publishSurplusDonation({
        food_batch_id: selectedBatchForDonation.food_batch_id,
        quantity: parseInt(donationForm.quantity, 10),
        collection_deadline: donationForm.collection_deadline || undefined,
        notes: donationForm.notes || undefined,
      });
      setShowPublishModal(false);
      setActionNotice({
        type: 'success',
        message: res.message || 'Surplus food donation published successfully!',
      });
      handleRefresh();
    } catch (err) {
      console.error('Failed to publish surplus donation:', err);
      setPublishError(err.response?.data?.error || err.message || 'Failed to publish surplus donation');
    } finally {
      setPublishSubmitting(false);
    }
  };

  // Open Wastage Modal
  const handleOpenWasteModal = (item) => {
    if (!item.food_batch_id || item.physical_stock_remaining <= 0) return;
    setSelectedBatchForWaste(item);
    setWasteForm({
      quantity: 1,
      category: 'Preparation_Waste',
      reason: '',
    });
    setWasteError(null);
    setShowWasteModal(true);
  };

  // Submit Wastage Entry
  const handleSubmitWaste = async (e) => {
    e.preventDefault();
    if (!selectedBatchForWaste) return;
    setWasteSubmitting(true);
    setWasteError(null);
    try {
      const res = await recordKitchenWaste({
        food_batch_id: selectedBatchForWaste.food_batch_id,
        quantity: parseInt(wasteForm.quantity, 10),
        category: wasteForm.category,
        reason: wasteForm.reason || undefined,
      });
      setShowWasteModal(false);
      setActionNotice({
        type: 'success',
        message: res.message || 'Wastage recorded successfully.',
      });
      handleRefresh();
    } catch (err) {
      console.error('Failed to record wastage:', err);
      setWasteError(err.response?.data?.error || err.message || 'Failed to record wastage');
    } finally {
      setWasteSubmitting(false);
    }
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
    <div className="space-y-6 text-left">
      {showTitle && (
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#252A27]">
            Kitchen & Production Analytics
          </h1>
          <p className="text-xs sm:text-sm text-[#252A27]/75 mt-0.5">
            Demand forecasting, daily batch prep recommendations, and real-time order lifecycle
          </p>
        </div>
      )}

      {/* Top Controls: Target Date & Action Buttons */}
      <div className="bg-white rounded-2xl border border-[#245C45]/10 shadow-sm p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-7 gap-3 sm:gap-4">
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
                  <div className="overflow-x-auto max-w-full rounded-xl border border-[#245C45]/10">
                    <table className="w-full text-left text-sm border-collapse min-w-[940px]">
                      <thead>
                        <tr className="border-b border-[#245C45]/10 text-xs font-semibold uppercase tracking-wider text-[#252A27]/60 bg-[#F8F7F2]/40">
                          <th className="py-3 px-3.5 w-20">Order ID</th>
                          <th className="py-3 px-3.5 min-w-[150px]">Student Name</th>
                          <th className="py-3 px-3.5 min-w-[200px]">Dishes & Quantity</th>
                          <th className="py-3 px-3.5 w-20 text-center">Items Qty</th>
                          <th className="py-3 px-3.5 w-24 whitespace-nowrap">Order Time</th>
                          <th className="py-3 px-3.5 w-28 whitespace-nowrap">Pickup Slot</th>
                          <th className="py-3 px-3.5 w-24 whitespace-nowrap">Payment</th>
                          <th className="py-3 px-3.5 w-28 whitespace-nowrap">Status</th>
                          <th className="py-3 px-4 w-44 min-w-[170px] text-right whitespace-nowrap">Kitchen Action</th>
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
                              <td className="py-3 px-3.5 font-semibold text-[#245C45] whitespace-nowrap">
                                #{o.order_id}
                              </td>
                              <td className="py-3 px-3.5 min-w-[150px]">
                                <div className="font-medium text-[#252A27]">
                                  {o.student_name}
                                </div>
                                <span className="text-xs text-[#252A27]/50 block">
                                  {o.student_email}
                                </span>
                              </td>
                              <td className="py-3 px-3.5 min-w-[200px]">
                                <span className="font-medium text-[#252A27] line-clamp-2">
                                  {o.items_summary || 'Custom order'}
                                </span>
                              </td>
                              <td className="py-3 px-3.5 text-center font-bold text-[#245C45]">
                                {o.total_quantity}
                              </td>
                              <td className="py-3 px-3.5 text-xs text-[#252A27]/70 whitespace-nowrap">
                                {o.order_date
                                  ? new Date(o.order_date).toLocaleTimeString([], {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })
                                  : '-'}
                              </td>
                              <td className="py-3 px-3.5 whitespace-nowrap">
                                <span className="inline-flex items-center gap-1 bg-[#F8F7F2] border border-[#245C45]/15 text-[#252A27] text-xs font-medium px-2 py-0.5 rounded-md">
                                  <Clock className="w-3 h-3 text-[#6B8F71]" />
                                  {o.pickup_slot}
                                </span>
                              </td>
                              <td className="py-3 px-3.5 whitespace-nowrap">
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
                              <td className="py-3 px-3.5 whitespace-nowrap">
                                <StatusBadge status={o.status} />
                              </td>
                              <td className="py-3 px-4 text-right whitespace-nowrap min-w-[170px]">
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
                  <div className="overflow-x-auto max-w-full rounded-xl border border-[#245C45]/10">
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

            {/* AREA 5: REAL-TIME PRODUCTION & SURPLUS INVENTORY */}
            {(activeTab === 'all' || activeTab === 'inventory') && (
              <section className="bg-white rounded-2xl border border-[#245C45]/10 shadow-sm p-5 sm:p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#245C45]/10 pb-4">
                  <div>
                    <h2 className="text-lg font-serif font-bold text-[#252A27] flex items-center gap-2">
                      <Flame className="w-5 h-5 text-[#245C45]" />
                      <span>Live Canteen Inventory & Surplus Calculation</span>
                    </h2>
                    <p className="text-xs text-[#252A27]/60">
                      Real-time production, committed student orders, cancellations, donations, and leftover surplus
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleOpenProductionModal}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#245C45] text-white text-xs font-semibold hover:bg-[#1D4A37] transition-all shadow-sm"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>Log Production Batch</span>
                    </button>

                    {/* Inventory Summary Pills */}
                    <div className="flex items-center gap-1.5">
                      <span className="inline-flex items-center gap-1 bg-[#E6EFE7] text-[#245C45] text-xs font-semibold px-2.5 py-1 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#245C45]" />
                        {inventoryCounts.available} Available
                      </span>
                      <span className="inline-flex items-center gap-1 bg-[#E99A55]/20 text-[#252A27] text-xs font-semibold px-2.5 py-1 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#E99A55]" />
                        {inventoryCounts.lowStock} Low Stock
                      </span>
                      <span className="inline-flex items-center gap-1 bg-[#B3402F]/10 text-[#B3402F] text-xs font-semibold px-2.5 py-1 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#B3402F]" />
                        {inventoryCounts.outOfStock} Out of Stock
                      </span>
                    </div>
                  </div>
                </div>

                {inventoryData.length === 0 ? (
                  <EmptyState
                    title="No inventory batches logged"
                    description="No production batches found for this date. Click 'Log Production Batch' above to record prepared food."
                  />
                ) : (
                  <div className="overflow-x-auto max-w-full rounded-xl border border-[#245C45]/10">
                    <table className="w-full text-left text-sm border-collapse min-w-[950px]">
                      <thead>
                        <tr className="border-b border-[#245C45]/10 text-xs font-semibold uppercase tracking-wider text-[#252A27]/60 bg-[#F8F7F2]/40">
                          <th className="py-3 px-3">Dish / Food Item</th>
                          <th className="py-3 px-2 text-right">Total Prepared</th>
                          <th className="py-3 px-2 text-right">Student Orders Committed</th>
                          <th className="py-3 px-2 text-right">Cancelled Orders</th>
                          <th className="py-3 px-2 text-right">Collected Donations</th>
                          <th className="py-3 px-2 text-right">Recorded Wastage</th>
                          <th className="py-3 px-2 text-right">Active Reservations</th>
                          <th className="py-3 px-3 text-right">Available Surplus</th>
                          <th className="py-3 px-3 text-center">Actions & Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#245C45]/5">
                        {inventoryData.map((item) => {
                          const totalPrepared = Number(item.total_prepared ?? item.produced_qty ?? 0);
                          const ordersCommitted = Number(item.student_orders_committed ?? item.sold_qty ?? 0);
                          const cancelledQty = Number(item.cancelled_orders_qty ?? 0);
                          const collectedDonations = Number(item.collected_donations ?? 0);
                          const recordedWaste = Number(item.recorded_waste ?? 0);
                          const activeReservations = Number(item.active_reservations ?? 0);
                          const availableSurplus = Number(item.available_surplus ?? item.available_qty ?? 0);
                          const physicalStock = Number(item.physical_stock_remaining ?? Math.max(0, totalPrepared - ordersCommitted - collectedDonations - recordedWaste));

                          return (
                            <tr
                              key={item.food_batch_id ? `batch-${item.food_batch_id}` : `menu-${item.menu_item_id}`}
                              className="hover:bg-[#F8F7F2]/60 transition-colors"
                            >
                              <td className="py-3 px-3">
                                <div className="font-semibold text-[#252A27]">
                                  {item.item_name}
                                </div>
                                <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                                  <span className="text-[11px] text-[#6B8F71] font-medium">
                                    {item.category}
                                  </span>
                                  {item.batch_code && (
                                    <span className="text-[10px] bg-[#245C45]/10 text-[#245C45] px-1.5 py-0.5 rounded font-mono font-medium">
                                      {item.batch_code}
                                    </span>
                                  )}
                                  {item.meal_session && (
                                    <span className="text-[10px] bg-[#E99A55]/20 text-[#252A27] px-1.5 py-0.5 rounded font-medium">
                                      {item.meal_session}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-3 px-2 text-right font-medium text-[#252A27]">
                                {totalPrepared}
                              </td>
                              <td className="py-3 px-2 text-right font-medium text-[#245C45]">
                                {ordersCommitted}
                              </td>
                              <td className="py-3 px-2 text-right text-xs text-[#252A27]/60">
                                {cancelledQty}
                              </td>
                              <td className="py-3 px-2 text-right text-xs text-[#E99A55] font-medium">
                                {collectedDonations}
                              </td>
                              <td className="py-3 px-2 text-right text-xs text-[#B3402F] font-medium">
                                {recordedWaste}
                              </td>
                              <td className="py-3 px-2 text-right text-xs text-[#252A27]/80">
                                {activeReservations}
                              </td>
                              <td className="py-3 px-3 text-right">
                                <span
                                  className={`text-base font-bold ${
                                    availableSurplus === 0
                                      ? 'text-[#B3402F]'
                                      : availableSurplus <= 15
                                      ? 'text-[#E99A55]'
                                      : 'text-[#245C45]'
                                  }`}
                                >
                                  {availableSurplus}
                                </span>
                              </td>
                              <td className="py-3 px-3">
                                <div className="flex flex-col sm:flex-row items-center justify-center gap-1.5">
                                  {item.food_batch_id ? (
                                    <>
                                      <button
                                        type="button"
                                        disabled={availableSurplus <= 0}
                                        onClick={() => handleOpenPublishModal(item)}
                                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all shadow-sm ${
                                          availableSurplus > 0
                                            ? 'bg-[#245C45] text-white hover:bg-[#1D4A37]'
                                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                        }`}
                                        title={
                                          availableSurplus > 0
                                            ? `Publish up to ${availableSurplus} portions as NGO surplus donation`
                                            : 'No available surplus to publish'
                                        }
                                      >
                                        <HeartHandshake className="w-3.5 h-3.5" />
                                        <span>Publish Surplus</span>
                                      </button>

                                      <button
                                        type="button"
                                        disabled={physicalStock <= 0}
                                        onClick={() => handleOpenWasteModal(item)}
                                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium border transition-all ${
                                          physicalStock > 0
                                            ? 'border-[#B3402F]/30 text-[#B3402F] hover:bg-[#B3402F]/10'
                                            : 'border-gray-200 text-gray-300 cursor-not-allowed'
                                        }`}
                                        title={
                                          physicalStock > 0
                                            ? `Log food wastage (${physicalStock} portions on hand)`
                                            : 'No physical stock remaining'
                                        }
                                      >
                                        <Trash2 className="w-3 h-3" />
                                        <span>Waste</span>
                                      </button>
                                    </>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setProductionForm((prev) => ({
                                          ...prev,
                                          menu_item_id: item.menu_item_id,
                                          batch_date: selectedDate,
                                        }));
                                        setShowProductionModal(true);
                                      }}
                                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#E6EFE7] text-[#245C45] hover:bg-[#245C45] hover:text-white transition-all"
                                    >
                                      <PlusCircle className="w-3 h-3" />
                                      <span>Log Batch</span>
                                    </button>
                                  )}

                                  <StatusBadge status={item.status} />
                                </div>
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

            {/* MODAL 1: RECORD PRODUCTION BATCH */}
            {showProductionModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
                <div className="bg-white rounded-2xl border border-[#245C45]/20 shadow-xl max-w-md w-full p-6 space-y-4 relative animate-in fade-in duration-150">
                  <div className="flex items-center justify-between border-b border-[#245C45]/10 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-xl bg-[#E6EFE7] text-[#245C45]">
                        <ChefHat className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-serif font-bold text-base text-[#252A27]">
                          Record Production Batch
                        </h3>
                        <p className="text-xs text-[#252A27]/60">
                          Log prepared plates for kitchen inventory & surplus tracking
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowProductionModal(false)}
                      className="p-1 rounded-lg text-[#252A27]/60 hover:text-[#252A27] hover:bg-[#F8F7F2]"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {productionError && (
                    <div className="p-3 rounded-xl bg-[#B3402F]/10 border border-[#B3402F]/20 text-[#B3402F] text-xs flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{productionError}</span>
                    </div>
                  )}

                  <form onSubmit={handleSubmitProduction} className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-[#252A27] mb-1">
                        Food Item / Dish *
                      </label>
                      <select
                        required
                        value={productionForm.menu_item_id}
                        onChange={(e) =>
                          setProductionForm((prev) => ({
                            ...prev,
                            menu_item_id: e.target.value,
                          }))
                        }
                        className="w-full text-sm border border-[#245C45]/20 rounded-xl px-3 py-2 bg-white text-[#252A27] focus:ring-2 focus:ring-[#245C45]/30 focus:outline-none"
                      >
                        <option value="" disabled>
                          Select food item...
                        </option>
                        {(menuItemsList.length > 0 ? menuItemsList : inventoryData).map(
                          (dish) => (
                            <option key={dish.menu_item_id} value={dish.menu_item_id}>
                              {dish.name || dish.item_name} ({dish.category || 'General'})
                            </option>
                          )
                        )}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-[#252A27] mb-1">
                          Production Date *
                        </label>
                        <input
                          type="date"
                          required
                          value={productionForm.batch_date}
                          onChange={(e) =>
                            setProductionForm((prev) => ({
                              ...prev,
                              batch_date: e.target.value,
                            }))
                          }
                          className="w-full text-sm border border-[#245C45]/20 rounded-xl px-3 py-2 bg-white text-[#252A27] focus:ring-2 focus:ring-[#245C45]/30 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[#252A27] mb-1">
                          Meal Session *
                        </label>
                        <select
                          value={productionForm.meal_session}
                          onChange={(e) =>
                            setProductionForm((prev) => ({
                              ...prev,
                              meal_session: e.target.value,
                            }))
                          }
                          className="w-full text-sm border border-[#245C45]/20 rounded-xl px-3 py-2 bg-white text-[#252A27] focus:ring-2 focus:ring-[#245C45]/30 focus:outline-none"
                        >
                          <option value="Breakfast">Breakfast</option>
                          <option value="Lunch">Lunch</option>
                          <option value="Evening">Evening</option>
                          <option value="Dinner">Dinner</option>
                          <option value="All_Day">All Day</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-[#252A27] mb-1">
                          Total Plates Prepared *
                        </label>
                        <input
                          type="number"
                          min="1"
                          required
                          placeholder="e.g. 100"
                          value={productionForm.cooked_qty}
                          onChange={(e) =>
                            setProductionForm((prev) => ({
                              ...prev,
                              cooked_qty: e.target.value,
                            }))
                          }
                          className="w-full text-sm border border-[#245C45]/20 rounded-xl px-3 py-2 bg-white text-[#252A27] focus:ring-2 focus:ring-[#245C45]/30 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[#252A27] mb-1">
                          Batch Identifier (Optional)
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. BATCH-THALI-01"
                          value={productionForm.batch_code}
                          onChange={(e) =>
                            setProductionForm((prev) => ({
                              ...prev,
                              batch_code: e.target.value,
                            }))
                          }
                          className="w-full text-sm border border-[#245C45]/20 rounded-xl px-3 py-2 bg-white text-[#252A27] focus:ring-2 focus:ring-[#245C45]/30 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#252A27] mb-1">
                        Optional Notes
                      </label>
                      <textarea
                        rows="2"
                        placeholder="e.g. Shift 1 preparation, extra rice included"
                        value={productionForm.notes}
                        onChange={(e) =>
                          setProductionForm((prev) => ({
                            ...prev,
                            notes: e.target.value,
                          }))
                        }
                        className="w-full text-sm border border-[#245C45]/20 rounded-xl px-3 py-2 bg-white text-[#252A27] focus:ring-2 focus:ring-[#245C45]/30 focus:outline-none"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#245C45]/10">
                      <button
                        type="button"
                        onClick={() => setShowProductionModal(false)}
                        className="px-4 py-2 rounded-xl text-xs font-semibold text-[#252A27]/70 hover:bg-[#F8F7F2] transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={productionSubmitting}
                        className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#245C45] text-white hover:bg-[#1D4A37] transition-all disabled:opacity-50 flex items-center gap-1.5"
                      >
                        {productionSubmitting ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Saving...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Save Batch</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* MODAL 2: PUBLISH SURPLUS DONATION */}
            {showPublishModal && selectedBatchForDonation && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
                <div className="bg-white rounded-2xl border border-[#245C45]/20 shadow-xl max-w-md w-full p-6 space-y-4 relative animate-in fade-in duration-150">
                  <div className="flex items-center justify-between border-b border-[#245C45]/10 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-xl bg-[#E6EFE7] text-[#245C45]">
                        <HeartHandshake className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-serif font-bold text-base text-[#252A27]">
                          Publish Surplus Food Offer
                        </h3>
                        <p className="text-xs text-[#252A27]/60">
                          Reserve calculated surplus plates for verified NGO collection
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowPublishModal(false)}
                      className="p-1 rounded-lg text-[#252A27]/60 hover:text-[#252A27] hover:bg-[#F8F7F2]"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {publishError && (
                    <div className="p-3 rounded-xl bg-[#B3402F]/10 border border-[#B3402F]/20 text-[#B3402F] text-xs flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{publishError}</span>
                    </div>
                  )}

                  {/* Highlight card with calculated available surplus */}
                  <div className="p-3.5 rounded-xl bg-[#F8F7F2] border border-[#245C45]/10 space-y-2">
                    <div className="flex items-center justify-between text-xs text-[#252A27]/70">
                      <span>Dish:</span>
                      <strong className="text-[#252A27] text-sm">
                        {selectedBatchForDonation.item_name}
                      </strong>
                    </div>
                    <div className="flex items-center justify-between text-xs text-[#252A27]/70">
                      <span>Batch:</span>
                      <span className="font-mono text-xs text-[#245C45]">
                        {selectedBatchForDonation.batch_code || `#${selectedBatchForDonation.food_batch_id}`}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs border-t border-[#245C45]/10 pt-2">
                      <span className="font-medium text-[#252A27]">
                        Calculated Available Surplus:
                      </span>
                      <span className="text-lg font-bold text-[#245C45]">
                        {selectedBatchForDonation.available_surplus} plates
                      </span>
                    </div>
                  </div>

                  <form onSubmit={handleSubmitPublishDonation} className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-[#252A27] mb-1">
                        Portions to Publish for NGO Claims * (Max: {selectedBatchForDonation.available_surplus})
                      </label>
                      <input
                        type="number"
                        min="1"
                        max={selectedBatchForDonation.available_surplus}
                        required
                        value={donationForm.quantity}
                        onChange={(e) =>
                          setDonationForm((prev) => ({
                            ...prev,
                            quantity: e.target.value,
                          }))
                        }
                        className="w-full text-sm border border-[#245C45]/20 rounded-xl px-3 py-2 bg-white text-[#252A27] focus:ring-2 focus:ring-[#245C45]/30 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#252A27] mb-1">
                        Collection Deadline (Optional, defaults to 18:30 IST)
                      </label>
                      <input
                        type="datetime-local"
                        value={donationForm.collection_deadline}
                        onChange={(e) =>
                          setDonationForm((prev) => ({
                            ...prev,
                            collection_deadline: e.target.value,
                          }))
                        }
                        className="w-full text-sm border border-[#245C45]/20 rounded-xl px-3 py-2 bg-white text-[#252A27] focus:ring-2 focus:ring-[#245C45]/30 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#252A27] mb-1">
                        Pickup Instructions / Notes
                      </label>
                      <textarea
                        rows="2"
                        placeholder="e.g. Please bring clean thermal insulated containers to Rear Loading Dock"
                        value={donationForm.notes}
                        onChange={(e) =>
                          setDonationForm((prev) => ({
                            ...prev,
                            notes: e.target.value,
                          }))
                        }
                        className="w-full text-sm border border-[#245C45]/20 rounded-xl px-3 py-2 bg-white text-[#252A27] focus:ring-2 focus:ring-[#245C45]/30 focus:outline-none"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#245C45]/10">
                      <button
                        type="button"
                        onClick={() => setShowPublishModal(false)}
                        className="px-4 py-2 rounded-xl text-xs font-semibold text-[#252A27]/70 hover:bg-[#F8F7F2] transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={
                          publishSubmitting ||
                          !donationForm.quantity ||
                          parseInt(donationForm.quantity, 10) <= 0 ||
                          parseInt(donationForm.quantity, 10) >
                            selectedBatchForDonation.available_surplus
                        }
                        className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#245C45] text-white hover:bg-[#1D4A37] transition-all disabled:opacity-50 flex items-center gap-1.5"
                      >
                        {publishSubmitting ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Publishing...</span>
                          </>
                        ) : (
                          <>
                            <Send className="w-3.5 h-3.5" />
                            <span>Publish Offer</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* MODAL 3: LOG FOOD WASTAGE */}
            {showWasteModal && selectedBatchForWaste && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
                <div className="bg-white rounded-2xl border border-[#245C45]/20 shadow-xl max-w-md w-full p-6 space-y-4 relative animate-in fade-in duration-150">
                  <div className="flex items-center justify-between border-b border-[#245C45]/10 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-xl bg-[#B3402F]/10 text-[#B3402F]">
                        <Trash2 className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-serif font-bold text-base text-[#252A27]">
                          Log Kitchen Food Wastage
                        </h3>
                        <p className="text-xs text-[#252A27]/60">
                          Accurately log discarded portions to update physical inventory
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowWasteModal(false)}
                      className="p-1 rounded-lg text-[#252A27]/60 hover:text-[#252A27] hover:bg-[#F8F7F2]"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {wasteError && (
                    <div className="p-3 rounded-xl bg-[#B3402F]/10 border border-[#B3402F]/20 text-[#B3402F] text-xs flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{wasteError}</span>
                    </div>
                  )}

                  <div className="p-3.5 rounded-xl bg-[#F8F7F2] border border-[#245C45]/10 space-y-2">
                    <div className="flex items-center justify-between text-xs text-[#252A27]/70">
                      <span>Dish:</span>
                      <strong className="text-[#252A27] text-sm">
                        {selectedBatchForWaste.item_name}
                      </strong>
                    </div>
                    <div className="flex items-center justify-between text-xs border-t border-[#245C45]/10 pt-2">
                      <span className="font-medium text-[#252A27]">
                        Physical Stock On-Hand:
                      </span>
                      <span className="text-base font-bold text-[#B3402F]">
                        {selectedBatchForWaste.physical_stock_remaining} portions
                      </span>
                    </div>
                  </div>

                  <form onSubmit={handleSubmitWaste} className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-[#252A27] mb-1">
                          Wasted Portions *
                        </label>
                        <input
                          type="number"
                          min="1"
                          max={selectedBatchForWaste.physical_stock_remaining}
                          required
                          value={wasteForm.quantity}
                          onChange={(e) =>
                            setWasteForm((prev) => ({
                              ...prev,
                              quantity: e.target.value,
                            }))
                          }
                          className="w-full text-sm border border-[#245C45]/20 rounded-xl px-3 py-2 bg-white text-[#252A27] focus:ring-2 focus:ring-[#245C45]/30 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[#252A27] mb-1">
                          Wastage Category *
                        </label>
                        <select
                          value={wasteForm.category}
                          onChange={(e) =>
                            setWasteForm((prev) => ({
                              ...prev,
                              category: e.target.value,
                            }))
                          }
                          className="w-full text-sm border border-[#245C45]/20 rounded-xl px-3 py-2 bg-white text-[#252A27] focus:ring-2 focus:ring-[#245C45]/30 focus:outline-none"
                        >
                          <option value="Preparation_Waste">Preparation / Spillage</option>
                          <option value="Contamination">Contamination / Spoiled</option>
                          <option value="Post_Service_Leftover">Post-Service Leftover</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#252A27] mb-1">
                        Reason for Waste *
                      </label>
                      <textarea
                        rows="2"
                        required
                        placeholder="e.g. Overcooked, dropped batch, or spoiled during prep"
                        value={wasteForm.reason}
                        onChange={(e) =>
                          setWasteForm((prev) => ({
                            ...prev,
                            reason: e.target.value,
                          }))
                        }
                        className="w-full text-sm border border-[#245C45]/20 rounded-xl px-3 py-2 bg-white text-[#252A27] focus:ring-2 focus:ring-[#245C45]/30 focus:outline-none"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#245C45]/10">
                      <button
                        type="button"
                        onClick={() => setShowWasteModal(false)}
                        className="px-4 py-2 rounded-xl text-xs font-semibold text-[#252A27]/70 hover:bg-[#F8F7F2] transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={
                          wasteSubmitting ||
                          !wasteForm.quantity ||
                          parseInt(wasteForm.quantity, 10) <= 0 ||
                          parseInt(wasteForm.quantity, 10) >
                            selectedBatchForWaste.physical_stock_remaining
                        }
                        className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#B3402F] text-white hover:bg-[#923325] transition-all disabled:opacity-50 flex items-center gap-1.5"
                      >
                        {wasteSubmitting ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Recording...</span>
                          </>
                        ) : (
                          <>
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Record Waste</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    );
  }
