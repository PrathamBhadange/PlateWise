import { useState, useMemo } from 'react';
import { Eye, X, CheckCircle2, Search, RefreshCw } from 'lucide-react';
import api from '../../services/api';

export default function TodaysOrdersTable({ orders = [], onOrderUpdated, isLoading = false }) {
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Collected':
      case 'picked_up':
        return 'bg-[#E6EFE7] text-[#245C45] border-[#245C45]/20';
      case 'Ready':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Preparing':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Pending':
      case 'Confirmed':
      default:
        return 'bg-rose-50 text-rose-700 border-rose-200';
    }
  };

  const filteredOrders = useMemo(() => {
    return orders.filter((ord) => {
      const matchesStatus =
        statusFilter === 'All' ||
        (statusFilter === 'Collected' && (ord.status === 'Collected' || ord.status === 'picked_up')) ||
        ord.status === statusFilter;

      const matchesSearch =
        !searchTerm.trim() ||
        ord.token?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ord.student?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ord.meal?.toLowerCase().includes(searchTerm.toLowerCase());

      return matchesStatus && matchesSearch;
    });
  }, [orders, statusFilter, searchTerm]);

  const handleHandoverFromTable = async (orderId) => {
    setIsUpdating(true);
    setActionMessage('');
    try {
      await api.patch(`/cashier/orders/${orderId}/handover`);
      setActionMessage(`Order #${orderId} marked as Collected.`);
      if (selectedOrder && selectedOrder.order_id === orderId) {
        setSelectedOrder((prev) => ({ ...prev, status: 'Collected' }));
      }
      if (onOrderUpdated) {
        onOrderUpdated();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Handover failed.');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-[#245C45]/15 shadow-2xs flex flex-col justify-between text-left">
      <div>
        {/* Table Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#245C45]/10">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-serif text-lg sm:text-xl font-bold text-[#252A27]">
                Today's Orders
              </h3>
              <span className="text-[10px] font-semibold text-[#245C45] bg-[#E6EFE7] px-2 py-0.5 rounded-full border border-[#245C45]/20">
                Live Database
              </span>
            </div>
            <p className="text-[11px] text-[#252A27]/60">
              Live token queue and counter pickups backed by MySQL order records
            </p>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-56">
            <Search className="w-3.5 h-3.5 text-[#245C45]/60 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search token or student..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-2.5 py-1 text-xs bg-[#F8F7F2] border border-[#245C45]/20 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#245C45]"
            />
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 mt-3 pt-1">
          {['All', 'Ready', 'Preparing', 'Pending', 'Collected'].map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setStatusFilter(tab)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
                statusFilter === tab
                  ? 'bg-[#245C45] text-white shadow-2xs font-semibold'
                  : 'bg-[#F8F7F2] text-[#252A27]/70 hover:bg-[#E6EFE7]'
              }`}
            >
              {tab}
            </button>
          ))}
          <span className="text-[10px] text-[#252A27]/50 ml-auto">
            Showing {filteredOrders.length} of {orders.length} orders
          </span>
        </div>

        {actionMessage && (
          <div className="mt-3 p-2 rounded-xl bg-[#E6EFE7] border border-[#245C45]/20 text-[11px] text-[#245C45] font-semibold flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#245C45]" />
            <span>{actionMessage}</span>
          </div>
        )}

        {/* Responsive Orders Table */}
        <div className="overflow-x-auto mt-3">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#245C45]/10 text-[11px] font-semibold text-[#252A27]/60 uppercase tracking-wider">
                <th className="py-2.5 px-2">Token</th>
                <th className="py-2.5 px-2">Student</th>
                <th className="py-2.5 px-2">Meal</th>
                <th className="py-2.5 px-2">Status</th>
                <th className="py-2.5 px-2">Time</th>
                <th className="py-2.5 px-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#245C45]/5">
              {isLoading ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-xs text-[#252A27]/50">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-1 text-[#245C45]" />
                    <span>Loading today's orders from database...</span>
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-xs text-[#252A27]/50">
                    No orders matching the selected filter or search.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((ord) => (
                  <tr key={ord.order_id} className="hover:bg-[#F8F7F2]/80 transition-colors">
                    <td className="py-3 px-2 font-mono font-bold text-[#245C45]">
                      {ord.token}
                    </td>
                    <td className="py-3 px-2 font-medium text-[#252A27]">
                      {ord.student}
                    </td>
                    <td className="py-3 px-2 max-w-[180px] truncate" title={ord.meal}>
                      <span className="font-semibold text-[#252A27]">{ord.meal}</span>
                    </td>
                    <td className="py-3 px-2">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadge(
                          ord.status
                        )}`}
                      >
                        {ord.status}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-[#252A27]/70 whitespace-nowrap">
                      {ord.time}
                    </td>
                    <td className="py-3 px-2 text-right space-x-1.5 whitespace-nowrap">
                      {ord.status === 'Ready' && (
                        <button
                          type="button"
                          onClick={() => handleHandoverFromTable(ord.order_id)}
                          disabled={isUpdating}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-all cursor-pointer"
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Hand Over</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setSelectedOrder(ord)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-[#245C45] bg-[#E6EFE7] hover:bg-[#245C45] hover:text-white transition-all cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Details Modal */}
      {selectedOrder && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
          onClick={() => setSelectedOrder(null)}
        >
          <div
            className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-[#245C45]/20 text-left relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setSelectedOrder(null)}
              className="absolute top-4 right-4 p-1 rounded-full text-[#252A27]/60 hover:text-[#252A27] hover:bg-gray-100 cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="pb-3 border-b border-[#245C45]/10">
              <span className="font-mono text-sm font-bold text-[#245C45]">
                {selectedOrder.token} (Order #{selectedOrder.order_id})
              </span>
              <h4 className="font-serif text-base font-bold text-[#252A27] mt-0.5">
                {selectedOrder.meal}
              </h4>
            </div>

            <div className="space-y-2 mt-4 text-xs">
              <div className="flex justify-between">
                <span className="text-[#252A27]/60">Student:</span>
                <span className="font-semibold text-[#252A27]">
                  {selectedOrder.student} ({selectedOrder.student_id})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#252A27]/60">Email:</span>
                <span className="text-[#252A27]">{selectedOrder.student_email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#252A27]/60">Pickup Slot:</span>
                <span className="text-[#252A27]">{selectedOrder.pickup_slot}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#252A27]/60">Order Time:</span>
                <span className="text-[#252A27]">{selectedOrder.time}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#252A27]/60">Total Amount:</span>
                <span className="font-bold text-[#245C45]">₹{selectedOrder.total_amount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#252A27]/60">Payment:</span>
                <span className="text-[#252A27] font-medium">{selectedOrder.payment}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-[#245C45]/10">
                <span className="text-[#252A27]/60">Current Status:</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadge(
                    selectedOrder.status
                  )}`}
                >
                  {selectedOrder.status}
                </span>
              </div>
            </div>

            {selectedOrder.status === 'Ready' && (
              <button
                type="button"
                onClick={() => handleHandoverFromTable(selectedOrder.order_id)}
                disabled={isUpdating}
                className="w-full mt-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition-all cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirm Handover (Mark Collected)</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setSelectedOrder(null)}
              className="w-full mt-3 py-2 bg-[#F8F7F2] hover:bg-[#E6EFE7] text-[#252A27] text-xs font-semibold rounded-xl transition-all cursor-pointer border border-[#245C45]/10"
            >
              Close Details
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
