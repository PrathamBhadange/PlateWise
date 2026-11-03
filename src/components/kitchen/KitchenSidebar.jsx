import { useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ClipboardList,
  CheckCircle2,
  Sparkles,
  IndianRupee,
  BookOpen,
  Flame,
  User,
  HelpCircle,
  LogOut,
  X,
  ChefHat,
} from 'lucide-react';
import { useAuth } from '../../context/useAuth';

const KITCHEN_MENU_ITEMS = [
  { label: 'Dashboard', path: '/kitchen', icon: LayoutDashboard },
  { label: 'Order Queue', path: '/kitchen/queue', icon: ClipboardList },
  { label: 'Ready for Pickup', path: '/kitchen/ready', icon: CheckCircle2 },
  { label: 'Demand Planning', path: '/kitchen/demand', icon: Sparkles },
  { label: 'Daily Sales', path: '/kitchen/sales', icon: IndianRupee },
  { label: 'Menu Management', path: '/kitchen/menu', icon: BookOpen },
  { label: 'Inventory', path: '/kitchen/inventory', icon: Flame },
  { label: 'Profile', path: '/kitchen/profile', icon: User },
  { label: 'Help & Support', path: '/kitchen/help', icon: HelpCircle },
];

export default function KitchenSidebar({ mobileOpen, onCloseMobile }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleNavigate = (path) => {
    navigate(path);
    if (onCloseMobile) onCloseMobile();
  };

  const handleLogout = async () => {
    if (onCloseMobile) onCloseMobile();
    await logout();
    navigate('/', { replace: true });
  };

  const isItemActive = (path) => {
    if (path === '/kitchen') {
      return (
        location.pathname === '/kitchen' ||
        location.pathname === '/kitchen/'
      );
    }
    if (path === '/kitchen/queue') {
      return (
        location.pathname === '/kitchen/queue' ||
        location.pathname === '/kitchen/orders'
      );
    }
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs sm:hidden transition-opacity"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed sm:sticky top-0 sm:top-[65px] left-0 z-40 sm:z-20 h-screen sm:h-[calc(100vh-65px)] bg-[#F8F7F2] sm:bg-transparent border-r border-[#245C45]/10 flex flex-col justify-between transition-transform duration-300 ease-in-out ${
          mobileOpen ? 'translate-x-0 w-68 shadow-2xl' : '-translate-x-full sm:translate-x-0'
        } w-68 sm:w-20 lg:w-64 shrink-0 p-4`}
      >
        {/* Top: Mobile Header in Drawer + Navigation List */}
        <div className="flex flex-col space-y-2">
          {/* Mobile Header in Drawer */}
          <div className="flex items-center justify-between pb-3 sm:hidden border-b border-[#245C45]/10">
            <div className="flex items-center gap-2 text-xs font-bold text-[#245C45]">
              <Sparkles className="w-4 h-4 text-[#E99A55]" />
              <span>Kitchen Staff Portal</span>
            </div>
            <button
              type="button"
              onClick={onCloseMobile}
              className="p-1.5 rounded-lg text-[#252A27]/60 hover:text-[#252A27] hover:bg-[#E6EFE7] cursor-pointer"
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Current Role Banner in Sidebar (Desktop) */}
          <div className="hidden lg:flex items-center justify-between px-3 py-1.5 bg-[#E6EFE7]/60 rounded-xl border border-[#245C45]/10 text-xs">
            <span className="font-semibold text-[#245C45] flex items-center gap-1.5">
              <ChefHat className="w-4 h-4 text-[#245C45]" />
              <span>Kitchen & Production</span>
            </span>
            <span className="text-[10px] text-[#6B8F71] font-medium">Main</span>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1 pt-1 overflow-y-auto max-h-[calc(100vh-210px)]">
            {KITCHEN_MENU_ITEMS.map((item) => {
              const active = isItemActive(item.path);
              const IconComponent = item.icon;

              return (
                <button
                  key={item.path}
                  type="button"
                  onClick={() => handleNavigate(item.path)}
                  title={item.label}
                  className={`w-full flex items-center gap-3 px-3 py-2 sm:py-2.5 rounded-xl text-sm transition-all duration-200 cursor-pointer ${
                    active
                      ? 'bg-[#245C45] text-white font-semibold shadow-xs'
                      : 'text-[#252A27]/80 hover:bg-[#E6EFE7]/70 hover:text-[#245C45] font-medium'
                  } justify-start sm:justify-center lg:justify-start group`}
                >
                  <IconComponent
                    className={`w-4.5 h-4.5 flex-shrink-0 transition-transform group-hover:scale-105 ${
                      active ? 'text-white' : 'text-[#6B8F71] group-hover:text-[#245C45]'
                    }`}
                  />
                  <span className="inline-block sm:hidden lg:inline-block truncate">
                    {item.label}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom: Logout Button */}
        <div className="pt-3 border-t border-[#245C45]/10">
          <button
            type="button"
            onClick={handleLogout}
            title="Log Out"
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors cursor-pointer justify-start sm:justify-center lg:justify-start group"
          >
            <LogOut className="w-4.5 h-4.5 flex-shrink-0 text-red-500 group-hover:scale-105 transition-transform" />
            <span className="inline-block sm:hidden lg:inline-block">Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}
