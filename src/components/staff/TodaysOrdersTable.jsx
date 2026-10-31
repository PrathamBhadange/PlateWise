import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Eye, X } from 'lucide-react';
import { useStaffOrders } from '../../context/StaffOrderContext';

export default function TodaysOrdersTable() {
  const navigate = useNavigate();
  const { orders } = useStaffOrders();
  const [selectedOrder, setSelectedOrder] = useState(null);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Collected':
        return 'bg-[#E6EFE7] text-[#245C45] border-[#245C45]/20';
      case 'Ready':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Preparing':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Pending':
      default:
        return 'bg-rose-50 text-rose-700 border-rose-200';
    }
  };

  return (
    <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-[#245C45]/15 shadow-2xs flex flex-col justify-between text-left">
      <div>
        {/* Table Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#245C45]/10">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-serif text-lg sm:text-xl font-bold text-[#252A27]">
                Today's Orders
              </h3>
              <span className="text-[10px] font-semibold text-[#245C45] bg-[#E6EFE7] px-2 py-0.5 rounded-full border border-[#245C45]/20">
                Live Sync
              </span>
            </div>
            <p className="text-[11px] text-[#252A27]/60">
              Live token queue and counter pickups synchronized across staff stations
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate('/staff/orders')}
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#245C45] hover:text-[#164B38] hover:underline cursor-pointer"
          >
            <span>View All ({orders.length})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

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
              {orders.map((ord) => (
                <tr key={ord.token} className="hover:bg-[#F8F7F2]/80 transition-colors">
                  <td className="py-3 px-2 font-mono font-bold text-[#245C45]">
                    {ord.token}
                  </td>
                  <td className="py-3 px-2 font-medium text-[#252A27]">
                    {ord.student}
                  </td>
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg overflow-hidden border border-[#245C45]/15 flex-shrink-0">
                        <img
                          src={ord.image}
                          alt={ord.meal}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <span className="font-semibold text-[#252A27]">{ord.meal}</span>
                    </div>
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
                  <td className="py-3 px-2 text-right">
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
              ))}
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
            className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-[#245C45]/20 text-left animate-fade-in relative"
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

            <div className="flex items-center gap-3 pb-3 border-b border-[#245C45]/10">
              <div className="w-12 h-12 rounded-xl overflow-hidden border border-[#245C45]/15 flex-shrink-0">
                <img
                  src={selectedOrder.image}
                  alt={selectedOrder.meal}
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <span className="font-mono text-sm font-bold text-[#245C45]">
                  {selectedOrder.token}
                </span>
                <h4 className="font-serif text-base font-bold text-[#252A27]">
                  {selectedOrder.meal}
                </h4>
              </div>
            </div>

            <div className="space-y-2 mt-4 text-xs">
              <div className="flex justify-between">
                <span className="text-[#252A27]/60">Student:</span>
                <span className="font-semibold text-[#252A27]">
                  {selectedOrder.student} ({selectedOrder.studentId})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#252A27]/60">Pickup Counter:</span>
                <span className="font-semibold text-[#252A27]">{selectedOrder.counter}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#252A27]/60">Order Time:</span>
                <span className="text-[#252A27]">{selectedOrder.time}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#252A27]/60">Payment Method:</span>
                <span className="text-[#252A27] font-medium">{selectedOrder.payment}</span>
              </div>
              {selectedOrder.specialInstructions && (
                <div className="flex justify-between">
                  <span className="text-[#252A27]/60">Instructions:</span>
                  <span className="text-[#252A27] italic">{selectedOrder.specialInstructions}</span>
                </div>
              )}
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

            <button
              type="button"
              onClick={() => setSelectedOrder(null)}
              className="w-full mt-5 py-2.5 bg-[#245C45] hover:bg-[#164B38] text-white text-xs font-semibold rounded-xl transition-all cursor-pointer shadow-xs"
            >
              Close Details
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
