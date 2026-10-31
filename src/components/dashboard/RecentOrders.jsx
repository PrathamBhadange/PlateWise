import { useNavigate } from 'react-router-dom';
import { ArrowRight, ChevronRight, Clock, CheckCircle2, RotateCcw } from 'lucide-react';
import vegThaliImg from '../../assets/images/hero-meal.jpg';
import masalaDosaImg from '../../assets/images/masala-dosa.jpg';
import paneerBowlImg from '../../assets/images/paneer-bowl.jpg';

export default function RecentOrders() {
  const navigate = useNavigate();

  const orders = [
    {
      id: 'ORD-1082',
      name: 'Veg Thali',
      time: 'Today, 12:30 PM',
      token: '#A-42',
      status: 'Collected',
      statusStyle: 'bg-[#E6EFE7] text-[#245C45] border-[#245C45]/20',
      icon: CheckCircle2,
      image: vegThaliImg,
    },
    {
      id: 'ORD-1081',
      name: 'Masala Dosa',
      time: 'Yesterday, 8:45 AM',
      token: '#B-19',
      status: 'Preparing',
      statusStyle: 'bg-amber-50 text-amber-700 border-amber-200',
      icon: Clock,
      image: masalaDosaImg,
    },
    {
      id: 'ORD-1080',
      name: 'Paneer Bowl',
      time: '28 Oct 2026, 1:15 PM',
      token: '#C-08',
      status: 'Cancelled',
      statusStyle: 'bg-gray-100 text-gray-600 border-gray-200',
      icon: RotateCcw,
      image: paneerBowlImg,
    },
  ];

  return (
    <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-[#245C45]/15 shadow-2xs flex flex-col justify-between">
      <div>
        {/* Header with Title and "View All" */}
        <div className="flex items-center justify-between pb-4 border-b border-[#245C45]/10">
          <div>
            <h3 className="font-serif text-lg sm:text-xl font-bold text-[#252A27]">
              Recent Orders
            </h3>
            <p className="text-[11px] text-[#252A27]/60">
              Your latest campus cafeteria pickups
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate('/student/orders')}
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#245C45] hover:text-[#164B38] hover:underline transition-colors cursor-pointer"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Orders List */}
        <div className="divide-y divide-[#245C45]/5 mt-2">
          {orders.map((order) => {
            return (
              <div
                key={order.id}
                onClick={() => navigate('/student/orders')}
                className="py-3 flex items-center justify-between gap-3 group hover:bg-[#F8F7F2]/80 -mx-2 px-2 rounded-xl transition-colors cursor-pointer"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    navigate('/student/orders');
                  }
                }}
              >
                {/* Left: Thumbnail & Details */}
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl overflow-hidden border border-[#245C45]/15 bg-[#F8F7F2] flex-shrink-0 group-hover:scale-105 transition-transform">
                    <img
                      src={order.image}
                      alt={order.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-[#252A27] group-hover:text-[#245C45] transition-colors">
                      {order.name}
                    </h4>
                    <p className="text-[11px] text-[#252A27]/60 mt-0.5">
                      {order.time} · <span className="font-medium text-[#245C45]">{order.token}</span>
                    </p>
                  </div>
                </div>

                {/* Right: Status Badge & Chevron */}
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border ${order.statusStyle}`}
                  >
                    {order.status}
                  </span>
                  <ChevronRight className="w-4 h-4 text-[#252A27]/40 group-hover:text-[#245C45] group-hover:translate-x-0.5 transition-all" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer hint */}
      <div className="pt-3 mt-2 border-t border-[#245C45]/10 text-center text-[11px] text-[#252A27]/60">
        Flash token at counter to claim your meal
      </div>
    </div>
  );
}
