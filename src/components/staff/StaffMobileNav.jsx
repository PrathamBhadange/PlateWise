import { useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  QrCode,
  PlusCircle,
  ClipboardList,
  Flame,
  CheckCircle2,
} from 'lucide-react';

const CASHIER_BOTTOM = [
  { label: 'Dashboard', path: '/staff/dashboard', icon: LayoutDashboard },
  { label: 'Verify', path: '/staff/verify-token', icon: QrCode },
  { label: 'New Order', path: '/staff/new-order', icon: PlusCircle },
  { label: 'Orders', path: '/staff/orders', icon: ClipboardList },
];

const KITCHEN_BOTTOM = [
  { label: 'Dashboard', path: '/staff/kitchen', icon: LayoutDashboard },
  { label: 'Queue', path: '/staff/kitchen/queue', icon: ClipboardList },
  { label: 'Preparing', path: '/staff/kitchen/preparing', icon: Flame },
  { label: 'Ready', path: '/staff/kitchen/ready', icon: CheckCircle2 },
];

export default function StaffMobileNav({ isKitchen = false }) {
  const location = useLocation();
  const navigate = useNavigate();

  const items = isKitchen ? KITCHEN_BOTTOM : CASHIER_BOTTOM;

  const isItemActive = (path) => {
    if (path === '/staff/dashboard') {
      return (
        location.pathname === '/staff/dashboard' ||
        location.pathname === '/staff' ||
        location.pathname === '/staff/'
      );
    }
    if (path === '/staff/kitchen') {
      return location.pathname === '/staff/kitchen' || location.pathname === '/staff/kitchen/';
    }
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  return (
    <nav
      aria-label="Staff mobile navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-[#F8F7F2]/95 backdrop-blur-md border-t border-[#245C45]/15 py-2 px-3 flex items-center justify-around shadow-lg"
    >
      {items.map((item) => {
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
