import { useState } from 'react';
import { ClipboardList, QrCode } from 'lucide-react';
import vegThaliImg from '../../assets/images/hero-meal.jpg';
import masalaDosaImg from '../../assets/images/masala-dosa.jpg';
import paneerBowlImg from '../../assets/images/paneer-bowl.jpg';

const SAMPLE_ORDERS = [
  {
    id: 'ORD-1082',
    name: 'Special Veg Thali',
    date: '31 Oct 2026, 12:30 PM',
    token: '#A-42',
    counter: 'Express Counter 2',
    credits: 1,
    status: 'Collected',
    statusClass: 'bg-[#E6EFE7] text-[#245C45] border-[#245C45]/20',
    image: vegThaliImg,
  },
  {
    id: 'ORD-1081',
    name: 'Mysore Masala Dosa',
    date: '30 Oct 2026, 8:45 AM',
    token: '#B-19',
    counter: 'Counter 1 (Breakfast)',
    credits: 1,
    status: 'Preparing',
    statusClass: 'bg-amber-50 text-amber-700 border-amber-200',
    image: masalaDosaImg,
  },
  {
    id: 'ORD-1080',
    name: 'Paneer Tikka Rice Bowl',
    date: '28 Oct 2026, 1:15 PM',
    token: '#C-08',
    counter: 'Counter 3',
    credits: 1,
    status: 'Cancelled',
    statusClass: 'bg-gray-100 text-gray-600 border-gray-200',
    image: paneerBowlImg,
  },
];

export default function MyOrdersView() {
  const [filter, setFilter] = useState('All');

  const filteredOrders =
    filter === 'All'
      ? SAMPLE_ORDERS
      : SAMPLE_ORDERS.filter((o) => o.status.toLowerCase() === filter.toLowerCase());

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#252A27]">
            My Orders
          </h1>
          <p className="text-xs sm:text-sm text-[#252A27]/75 mt-0.5">
            Track token status and campus cafeteria pickup history
          </p>
        </div>

        {/* Filter buttons */}
        <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-[#245C45]/15 w-fit">
          {['All', 'Preparing', 'Collected', 'Cancelled'].map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setFilter(status)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                filter === status
                  ? 'bg-[#245C45] text-white shadow-xs'
                  : 'text-[#252A27]/70 hover:text-[#245C45]'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Orders List */}
      <div className="space-y-3.5">
        {filteredOrders.map((order) => (
          <div
            key={order.id}
            className="bg-white rounded-2xl p-4 sm:p-5 border border-[#245C45]/15 shadow-2xs hover:shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-14 h-14 rounded-xl overflow-hidden border border-[#245C45]/15 flex-shrink-0 bg-[#F8F7F2]">
                <img
                  src={order.image}
                  alt={order.name}
                  className="w-full h-full object-cover"
                />
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-serif text-base font-bold text-[#252A27]">
                    {order.name}
                  </h3>
                  <span
                    className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${order.statusClass}`}
                  >
                    {order.status}
                  </span>
                </div>

                <p className="text-xs text-[#252A27]/60 mt-0.5">
                  Order ID: {order.id} · {order.date}
                </p>
                <p className="text-xs text-[#245C45] font-semibold mt-0.5">
                  {order.counter} · 1 Meal Credit
                </p>
              </div>
            </div>

            {/* Token Card */}
            <div className="flex items-center justify-between sm:justify-end gap-3 pt-3 sm:pt-0 border-t sm:border-t-0 border-[#245C45]/10">
              <div className="text-left sm:text-right">
                <span className="text-[10px] uppercase font-bold text-[#252A27]/50 block">
                  Pickup Token
                </span>
                <span className="font-mono text-xl font-bold text-[#245C45]">
                  {order.token}
                </span>
              </div>

              <div className="w-10 h-10 rounded-xl bg-[#E6EFE7] text-[#245C45] flex items-center justify-center flex-shrink-0">
                <QrCode className="w-5 h-5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Info Notice */}
      <div className="p-4 rounded-2xl bg-[#E6EFE7]/50 border border-[#245C45]/15 flex items-center gap-3 text-xs text-[#245C45]">
        <ClipboardList className="w-5 h-5 flex-shrink-0 text-[#E99A55]" />
        <span>
          Present your digital token code or QR token at the cafeteria counter to claim freshly prepared meals without queue delay.
        </span>
      </div>
    </div>
  );
}
