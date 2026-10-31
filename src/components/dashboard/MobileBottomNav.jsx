import { useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, UtensilsCrossed, ClipboardList, User } from 'lucide-react';

const BOTTOM_ITEMS = [
  { label: 'Dashboard', path: '/student/dashboard', icon: LayoutDashboard },
  { label: 'Order Food', path: '/student/order', icon: UtensilsCrossed },
  { label: 'My Orders', path: '/student/orders', icon: ClipboardList },
  { label: 'Profile', path: '/student/profile', icon: User },
];

export default function MobileBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  const isItemActive = (path) => {
    if (path === '/student/dashboard') {
      return (
        location.pathname === '/student/dashboard' ||
        location.pathname === '/student' ||
        location.pathname === '/student/'
      );
    }
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  return (
    <nav
      aria-label="Mobile navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-[#F8F7F2]/95 backdrop-blur-md border-t border-[#245C45]/15 py-2 px-3 flex items-center justify-around shadow-lg"
    >
      {BOTTOM_ITEMS.map((item) => {
        const isActive = isItemActive(item.path);
        const IconComponent = item.icon;

        return (
          <button
            key={item.path}
            type="button"
            onClick={() => navigate(item.path)}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all cursor-pointer ${
              isActive
                ? 'text-[#245C45] font-semibold'
                : 'text-[#252A27]/60 hover:text-[#245C45]'
            }`}
          >
            <div
              className={`p-1 rounded-lg ${
                isActive ? 'bg-[#245C45] text-white shadow-xs' : 'text-inherit'
              }`}
            >
              <IconComponent className="w-4.5 h-4.5" />
            </div>
            <span className="text-[10px] mt-1 leading-none">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
