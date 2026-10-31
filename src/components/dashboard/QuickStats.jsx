import { useNavigate } from 'react-router-dom';
import { Utensils, ShoppingBag, Recycle, Heart, ArrowUpRight } from 'lucide-react';

export default function QuickStats() {
  const navigate = useNavigate();

  const stats = [
    {
      id: 'credits',
      icon: Utensils,
      iconContainer: 'bg-[#E6EFE7] text-[#245C45]',
      value: '12',
      label: 'Meal Credits',
      sublabel: 'Available',
      path: '/student/credits',
    },
    {
      id: 'active-orders',
      icon: ShoppingBag,
      iconContainer: 'bg-[#E99A55]/15 text-[#E99A55]',
      value: '3',
      label: 'Active Orders',
      sublabel: 'This Week',
      path: '/student/orders',
    },
    {
      id: 'waste-saved',
      icon: Recycle,
      iconContainer: 'bg-[#E6EFE7] text-[#245C45]',
      value: '2.3 kg',
      label: 'Food Waste Saved',
      sublabel: 'This Month',
      path: '/student/impact',
    },
    {
      id: 'sponsored',
      icon: Heart,
      iconContainer: 'bg-[#E99A55]/15 text-[#E99A55]',
      value: '4',
      label: 'Meals Sponsored',
      sublabel: 'To Communities',
      path: '/student/impact',
    },
  ];

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {stats.map((stat) => {
          const IconComponent = stat.icon;
          return (
            <div
              key={stat.id}
              onClick={() => navigate(stat.path)}
              className="group bg-white rounded-2xl p-4 sm:p-5 border border-[#245C45]/15 shadow-2xs hover:shadow-xs hover:border-[#245C45]/35 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer flex flex-col justify-between"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  navigate(stat.path);
                }
              }}
              aria-label={`${stat.label}: ${stat.value} ${stat.sublabel}`}
            >
              {/* Top row: Icon and Arrow */}
              <div className="flex items-center justify-between mb-3">
                <div
                  className={`w-10 h-10 rounded-xl ${stat.iconContainer} flex items-center justify-center transition-transform group-hover:scale-105`}
                >
                  <IconComponent className="w-5 h-5" />
                </div>
                <div className="w-7 h-7 rounded-lg bg-[#F8F7F2] text-[#245C45]/50 group-hover:text-[#245C45] group-hover:bg-[#E6EFE7] flex items-center justify-center transition-colors">
                  <ArrowUpRight className="w-4 h-4" />
                </div>
              </div>

              {/* Bottom row: Value and Labels */}
              <div>
                <span className="font-serif text-2xl sm:text-3xl font-bold text-[#252A27] tracking-tight block">
                  {stat.value}
                </span>
                <span className="text-xs font-semibold text-[#252A27]/85 mt-0.5 block">
                  {stat.label}
                </span>
                <span className="text-[11px] text-[#6B8F71] block">
                  {stat.sublabel}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Prototype Simulated Data Disclaimer */}
      <div className="text-right">
        <span className="text-[10px] text-[#252A27]/50 italic">
          * Illustrative demo metrics: Will synchronize with campus DBMS backend upon Phase 2 rollout.
        </span>
      </div>
    </div>
  );
}
