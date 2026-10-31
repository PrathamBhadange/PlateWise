import { useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  UtensilsCrossed,
  ClipboardList,
  CreditCard,
  Sprout,
  User,
  HelpCircle,
  LogOut,
  X,
  Sparkles,
} from 'lucide-react';

const MENU_ITEMS = [
  {
    label: 'Dashboard',
    path: '/student/dashboard',
    icon: LayoutDashboard,
  },
  {
    label: 'Order Food',
    path: '/student/order',
    icon: UtensilsCrossed,
  },
  {
    label: 'My Orders',
    path: '/student/orders',
    icon: ClipboardList,
  },
  {
    label: 'Meal Credits',
    path: '/student/credits',
    icon: CreditCard,
  },
  {
    label: 'Impact',
    path: '/student/impact',
    icon: Sprout,
  },
  {
    label: 'Profile',
    path: '/student/profile',
    icon: User,
  },
  {
    label: 'Help & Support',
    path: '/student/help',
    icon: HelpCircle,
  },
];

export default function DashboardSidebar({ mobileOpen, onCloseMobile }) {
  const location = useLocation();
  const navigate = useNavigate();

  const handleNavigate = (path) => {
    navigate(path);
    if (onCloseMobile) onCloseMobile();
  };

  const handleLogout = () => {
    navigate('/login');
    if (onCloseMobile) onCloseMobile();
  };

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
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs lg:hidden transition-opacity"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed lg:sticky top-0 lg:top-[61px] left-0 z-40 lg:z-20 h-screen lg:h-[calc(100vh-61px)] bg-[#F8F7F2] lg:bg-transparent border-r border-[#245C45]/10 flex flex-col justify-between transition-transform duration-300 ease-in-out ${
          mobileOpen ? 'translate-x-0 w-68 shadow-2xl' : '-translate-x-full lg:translate-x-0'
        } w-68 md:w-20 lg:w-64 shrink-0 p-4`}
      >
        {/* Top: Mobile Close button + Navigation List */}
        <div className="flex flex-col space-y-2">
          {/* Mobile Header in Drawer */}
          <div className="flex items-center justify-between pb-3 lg:hidden border-b border-[#245C45]/10">
            <div className="flex items-center gap-2 text-xs font-bold text-[#245C45]">
              <Sparkles className="w-4 h-4 text-[#E99A55]" />
              <span>Student Portal</span>
            </div>
            <button
              type="button"
              onClick={onCloseMobile}
              className="p-1.5 rounded-lg text-[#252A27]/60 hover:text-[#252A27] hover:bg-[#E6EFE7]"
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5 pt-2">
            {MENU_ITEMS.map((item) => {
              const active = isItemActive(item.path);
              const IconComponent = item.icon;

              return (
                <button
                  key={item.path}
                  type="button"
                  onClick={() => handleNavigate(item.path)}
                  title={item.label}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm transition-all duration-200 cursor-pointer ${
                    active
                      ? 'bg-[#245C45] text-white font-semibold shadow-xs'
                      : 'text-[#252A27]/80 hover:bg-[#E6EFE7]/70 hover:text-[#245C45] font-medium'
                  } justify-start md:justify-center lg:justify-start group`}
                >
                  <IconComponent
                    className={`w-4.5 h-4.5 flex-shrink-0 transition-transform group-hover:scale-105 ${
                      active ? 'text-white' : 'text-[#6B8F71] group-hover:text-[#245C45]'
                    }`}
                  />
                  {/* Label visible on mobile drawer and desktop, hidden on tablet compact mode */}
                  <span className="inline-block md:hidden lg:inline-block truncate">
                    {item.label}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom: Logout Button */}
        <div className="pt-4 border-t border-[#245C45]/10">
          <button
            type="button"
            onClick={handleLogout}
            title="Log Out"
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors cursor-pointer justify-start md:justify-center lg:justify-start group"
          >
            <LogOut className="w-4.5 h-4.5 flex-shrink-0 text-red-500 group-hover:scale-105 transition-transform" />
            <span className="inline-block md:hidden lg:inline-block">Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}
