import { useState } from 'react';
import {
  Flame,
  CheckCircle2,
  Clock,
  Sparkles,
  AlertCircle,
  Search,
  RefreshCw,
  UtensilsCrossed,
} from 'lucide-react';

export default function KitchenOrderQueue({
  orders = [],
  onUpdateStatus,
  updatingOrderId = null,
  isLoading = false,
}) {
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFeedback, setActionFeedback] = useState(null);
  const [actionError, setActionError] = useState(null);

  // Filter out collected orders from active preparation queue
  const activeOrders = orders.filter((o) => o.status !== 'Collected' && o.status !== 'Cancelled');

  const filteredOrders = activeOrders.filter((o) => {
    const matchesStatus =
      selectedStatus === 'All' || o.status.toLowerCase() === selectedStatus.toLowerCase();
    const q = searchTerm.toLowerCase().trim();
    const matchesSearch =
      !q ||
      (o.token && o.token.toLowerCase().includes(q)) ||
      (o.student_name && o.student_name.toLowerCase().includes(q)) ||
      (o.items_summary && o.items_summary.toLowerCase().includes(q)) ||
      String(o.order_id).includes(q);
    return matchesStatus && matchesSearch;
  });

  const counts = {
    all: activeOrders.length,
    pending: activeOrders.filter((o) => o.status === 'Pending').length,
    preparing: activeOrders.filter((o) => o.status === 'Preparing').length,
    ready: activeOrders.filter((o) => o.status === 'Ready').length,
  };

  const handleAction = async (order, targetStatus) => {
    setActionFeedback(null);
    setActionError(null);

    try {
      await onUpdateStatus(order.order_id, targetStatus, order.status);
      setActionFeedback({
        message: `Order ${order.token} (${order.items_summary || 'Meal'}) is now ${targetStatus}!`,
      });
      setTimeout(() => setActionFeedback(null), 4000);
    } catch (err) {
      const errMsg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        'Failed to update order status';
      setActionError(errMsg);
      setTimeout(() => setActionError(null), 6000);
    }
  };

  return (
    <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-[#245C45]/15 shadow-2xs text-left">
      {/* Header & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#245C45]/10">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-serif text-lg sm:text-xl font-bold text-[#252A27]">
              Current Order Queue
            </h3>
            <span className="text-[10px] font-semibold text-[#245C45] bg-[#E6EFE7] px-2 py-0.5 rounded-full border border-[#245C45]/20">
              Live Preparation
            </span>
          </div>
          <p className="text-[11px] text-[#252A27]/60">
            Real-time preparation pipeline across kitchen bays (Pending &rarr; Preparing &rarr; Ready)
          </p>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-60">
          <Search className="w-3.5 h-3.5 text-[#245C45]/60 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search token, student, dish..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-[#F8F7F2] border border-[#245C45]/20 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#245C45]"
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto py-3">
        {[
          { label: 'All', count: counts.all },
          { label: 'Pending', count: counts.pending },
          { label: 'Preparing', count: counts.preparing },
          { label: 'Ready', count: counts.ready },
        ].map((tab) => (
          <button
            key={tab.label}
            type="button"
            onClick={() => setSelectedStatus(tab.label)}
            className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
              selectedStatus.toLowerCase() === tab.label.toLowerCase()
                ? 'bg-[#245C45] text-white shadow-xs'
                : 'bg-[#F8F7F2] border border-[#245C45]/15 text-[#252A27]/75 hover:bg-[#E6EFE7]'
            }`}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* Feedback & Error Notices */}
      {actionFeedback && (
        <div className="mb-3 p-3 rounded-xl bg-[#E6EFE7] border border-[#245C45]/30 text-xs text-[#245C45] font-semibold flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#E99A55] flex-shrink-0" />
          <span>{actionFeedback.message}</span>
        </div>
      )}

      {actionError && (
        <div className="mb-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Queue List */}
      <div className="space-y-3 mt-1">
        {isLoading ? (
          <div className="py-12 text-center text-xs text-[#252A27]/50 flex flex-col items-center justify-center">
            <RefreshCw className="w-6 h-6 animate-spin text-[#245C45] mb-2" />
            <span>Loading orders from MySQL database...</span>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-8 rounded-2xl bg-[#F8F7F2] border border-[#245C45]/10 text-center text-xs text-[#252A27]/60 flex flex-col items-center justify-center gap-1.5">
            <UtensilsCrossed className="w-6 h-6 text-[#245C45]/40" />
            <span className="font-semibold text-[#252A27]">No active orders in this queue filter.</span>
            <span>New student orders will appear here automatically.</span>
          </div>
        ) : (
          filteredOrders.map((order) => {
            const isUpdatingThis = updatingOrderId === order.order_id;
            const timeStr = order.order_date
              ? new Date(order.order_date).toLocaleTimeString('en-IN', {
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : 'Just now';

            return (
              <div
                key={order.order_id}
                className="p-3.5 sm:p-4 rounded-2xl bg-[#F8F7F2] border border-[#245C45]/15 hover:border-[#245C45]/30 hover:bg-white transition-all shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                {/* Order Information */}
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white border border-[#245C45]/15 flex items-center justify-center flex-shrink-0 text-[#245C45] font-mono text-xs font-bold shadow-2xs">
                    {order.token || `#${order.order_id}`}
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-bold text-[#245C45]">
                        {order.token}
                      </span>
                      <h4 className="text-sm font-bold text-[#252A27]">
                        {order.items_summary || 'Campus Meal'}
                      </h4>
                      <span className="text-[10px] text-[#252A27]/50 font-normal">
                        (Order #{order.order_id})
                      </span>
                    </div>

                    <p className="text-xs text-[#252A27]/75 mt-0.5">
                      Student: <strong className="text-[#252A27]">{order.student_name}</strong> ·{' '}
                      {order.total_quantity || 1} item(s) · Placed {timeStr}
                    </p>

                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#252A27]/60 mt-1">
                      <span>Pickup Slot: <strong className="text-[#245C45]">{order.pickup_slot}</strong></span>
                      <span>Payment: <strong>{order.payment_status}</strong></span>
                    </div>
                  </div>
                </div>

                {/* Status Badge & Dynamic Kitchen Action */}
                <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#245C45]/10 flex-shrink-0">
                  {/* Status Badge */}
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                      order.status === 'Pending'
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : order.status === 'Confirmed'
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : order.status === 'Preparing'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : order.status === 'Ready'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-[#E6EFE7] text-[#245C45] border-[#245C45]/20'
                    }`}
                  >
                    {order.status === 'Pending' && <Clock className="w-3 h-3" />}
                    {order.status === 'Preparing' && (
                      <Flame className="w-3 h-3 text-amber-600 animate-pulse" />
                    )}
                    {order.status === 'Ready' && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                    <span>{order.status}</span>
                  </span>

                  {/* Allowed Preparation Actions Only */}
                  {(order.status === 'Pending' || order.status === 'Confirmed') && (
                    <button
                      type="button"
                      disabled={isUpdatingThis}
                      onClick={() => handleAction(order, 'Preparing')}
                      className="px-3 py-1.5 bg-[#245C45] hover:bg-[#164B38] text-white text-xs font-semibold rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5 active:scale-[0.98] disabled:opacity-60"
                    >
                      {isUpdatingThis ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Flame className="w-3.5 h-3.5" />
                      )}
                      <span>Start Preparing</span>
                    </button>
                  )}

                  {order.status === 'Preparing' && (
                    <button
                      type="button"
                      disabled={isUpdatingThis}
                      onClick={() => handleAction(order, 'Ready')}
                      className="px-3 py-1.5 bg-[#164B38] hover:bg-[#245C45] text-white text-xs font-semibold rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5 active:scale-[0.98] disabled:opacity-60"
                    >
                      {isUpdatingThis ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#E99A55]" />
                      )}
                      <span>Mark Ready</span>
                    </button>
                  )}

                  {order.status === 'Ready' && (
                    <span className="text-xs font-semibold text-[#245C45] bg-[#E6EFE7] px-3 py-1.5 rounded-xl border border-[#245C45]/20 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#245C45]" />
                      <span>Staged at Heated Rack</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="pt-3 mt-4 border-t border-[#245C45]/10 text-center text-[10px] text-[#252A27]/60">
        * Kitchen actions transition orders from Pending &rarr; Preparing &rarr; Ready. Handover to Collected is strictly performed by Cashier at the counter.
      </div>
    </div>
  );
}
