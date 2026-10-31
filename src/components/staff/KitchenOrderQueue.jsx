import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Flame,
  CheckCircle2,
  Clock,
  Sparkles,
} from 'lucide-react';

export default function KitchenOrderQueue({ orders, onUpdateStatus }) {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [actionFeedback, setActionFeedback] = useState(null);

  // Filter out collected meals from the kitchen working queue
  const kitchenOrders = orders.filter((o) => o.status !== 'Collected');

  const categories = [
    { label: 'All', count: kitchenOrders.length },
    { label: 'Thali', count: kitchenOrders.filter((o) => o.category === 'Thali').length },
    { label: 'South Indian', count: kitchenOrders.filter((o) => o.category === 'South Indian').length },
    { label: 'Bowls', count: kitchenOrders.filter((o) => o.category === 'Bowls').length },
  ];

  const filteredOrders =
    selectedCategory === 'All'
      ? kitchenOrders
      : kitchenOrders.filter((o) => o.category === selectedCategory);

  const handleActionClick = (order) => {
    let newStatus = '';
    let msg = '';
    const mealName = order.meal || order.name;

    if (order.status === 'Pending') {
      newStatus = 'Preparing';
      msg = `Order ${order.token} (${mealName}) is now in preparation!`;
    } else if (order.status === 'Preparing') {
      newStatus = 'Ready';
      msg = `Order ${order.token} (${mealName}) marked Ready for Pickup!`;
    }

    if (newStatus && onUpdateStatus) {
      onUpdateStatus(order.id, newStatus);
      setActionFeedback(msg);
      setTimeout(() => setActionFeedback(null), 3500);
    }
  };

  return (
    <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-[#245C45]/15 shadow-2xs text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#245C45]/10">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-serif text-lg sm:text-xl font-bold text-[#252A27]">
              Current Order Queue
            </h3>
            <span className="text-[10px] font-semibold text-[#245C45] bg-[#E6EFE7] px-2 py-0.5 rounded-full border border-[#245C45]/20">
              Interactive
            </span>
          </div>
          <p className="text-[11px] text-[#252A27]/60">
            Real-time preparation pipeline & chef dispatch across cook stations
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate('/staff/kitchen/queue')}
          className="inline-flex items-center gap-1 text-xs font-semibold text-[#245C45] hover:text-[#164B38] hover:underline cursor-pointer"
        >
          <span>View All ({kitchenOrders.length})</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Filter Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto py-3">
        {categories.map((cat) => (
          <button
            key={cat.label}
            type="button"
            onClick={() => setSelectedCategory(cat.label)}
            className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
              selectedCategory === cat.label
                ? 'bg-[#245C45] text-white shadow-xs'
                : 'bg-[#F8F7F2] border border-[#245C45]/15 text-[#252A27]/75 hover:bg-[#E6EFE7]'
            }`}
          >
            {cat.label} ({cat.count})
          </button>
        ))}
      </div>

      {/* Action Confirmation Banner */}
      {actionFeedback && (
        <div className="mb-3 p-3 rounded-xl bg-[#E6EFE7] border border-[#245C45]/30 text-xs text-[#245C45] font-semibold flex items-center gap-2 animate-fade-in">
          <Sparkles className="w-4 h-4 text-[#E99A55] flex-shrink-0" />
          <span>{actionFeedback}</span>
        </div>
      )}

      {/* Card-Based Order Queue List */}
      <div className="space-y-3 mt-1">
        {filteredOrders.map((order) => {
          const mealName = order.meal || order.name;
          return (
            <div
              key={order.id}
              className="p-3.5 sm:p-4 rounded-2xl bg-[#F8F7F2] border border-[#245C45]/15 hover:border-[#245C45]/30 hover:bg-white transition-all shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              {/* Order Info & Thumbnail */}
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl overflow-hidden border border-[#245C45]/15 bg-white flex-shrink-0">
                  <img
                    src={order.image}
                    alt={mealName}
                    className="w-full h-full object-cover"
                  />
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-[#245C45]">
                      {order.token}
                    </span>
                    <h4 className="text-sm font-bold text-[#252A27]">
                      {mealName}
                    </h4>
                  </div>
                  <p className="text-xs text-[#252A27]/65 mt-0.5">
                    {order.qty} · Placed at {order.time}
                  </p>
                  {order.specialInstructions && (
                    <span className="text-[10px] text-[#E99A55] font-semibold block mt-0.5">
                      Note: {order.specialInstructions}
                    </span>
                  )}
                </div>
              </div>

              {/* Status Badge & Dynamic Action Button */}
              <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#245C45]/10">
                {/* Status Badge */}
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                    order.status === 'Pending'
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : order.status === 'Preparing'
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-[#E6EFE7] text-[#245C45] border-[#245C45]/20'
                  }`}
                >
                  {order.status === 'Pending' && <Clock className="w-3 h-3" />}
                  {order.status === 'Preparing' && (
                    <Flame className="w-3 h-3 text-amber-600 animate-pulse" />
                  )}
                  {order.status === 'Ready' && <CheckCircle2 className="w-3 h-3" />}
                  <span>{order.status}</span>
                </span>

                {/* Status Action Button */}
                {order.status === 'Pending' && (
                  <button
                    type="button"
                    onClick={() => handleActionClick(order)}
                    className="px-3.5 py-1.5 bg-[#245C45] hover:bg-[#164B38] text-white text-xs font-semibold rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5 active:scale-[0.98]"
                  >
                    <Flame className="w-3.5 h-3.5" />
                    <span>Start Preparing</span>
                  </button>
                )}

                {order.status === 'Preparing' && (
                  <button
                    type="button"
                    onClick={() => handleActionClick(order)}
                    className="px-3.5 py-1.5 bg-[#164B38] hover:bg-[#245C45] text-white text-xs font-semibold rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5 active:scale-[0.98]"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#E99A55]" />
                    <span>Mark Ready</span>
                  </button>
                )}

                {order.status === 'Ready' && (
                  <span className="text-xs font-semibold text-[#245C45] bg-[#E6EFE7] px-3 py-1.5 rounded-xl border border-[#245C45]/20 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#245C45]" />
                    <span>Ready for Pickup</span>
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="pt-3 mt-3 border-t border-[#245C45]/10 text-center text-[10px] text-[#252A27]/60 italic">
        * Status transitions update React session state. Backend database synchronization connects in Phase 2.
      </div>
    </div>
  );
}
