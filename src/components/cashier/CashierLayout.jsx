import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Menu, Receipt, ChefHat, LogOut } from 'lucide-react';
import BrandLogo from '../common/BrandLogo';
import CashierSidebar from './CashierSidebar';
import { useAuth } from '../../context/useAuth';

export default function CashierLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/', { replace: true });
  };

  const isCashier = location.pathname.startsWith('/cashier');

  return (
    <div className="min-h-screen bg-[#F8F7F2] text-[#252A27] flex flex-col antialiased w-full overflow-x-hidden">
      {/* Top Bar Header */}
      <header className="sticky top-0 z-30 bg-[#F8F7F2]/95 backdrop-blur-md border-b border-[#245C45]/15 px-4 sm:px-6 lg:px-8 py-3 transition-all w-full">
        <div className="flex items-center justify-between gap-4 w-full">
          {/* Left: Mobile Sidebar Hamburger Toggle & Brand Logo */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden p-2 text-[#252A27] hover:text-[#245C45] hover:bg-[#E6EFE7] rounded-xl transition-colors cursor-pointer"
              aria-label="Toggle cashier navigation sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>

            <BrandLogo href="/cashier" size="md" />

            {/* Quick Staff Role Switcher Pill */}
            <div className="hidden md:flex items-center bg-[#E6EFE7]/80 p-1 rounded-xl border border-[#245C45]/15 ml-3">
              <button
                type="button"
                onClick={() => navigate('/cashier')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  isCashier ? 'bg-[#245C45] text-white shadow-xs' : 'text-[#252A27]/70 hover:text-[#245C45]'
                }`}
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>Cashier</span>
              </button>
              <button
                type="button"
                onClick={() => navigate('/kitchen')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  !isCashier ? 'bg-[#245C45] text-white shadow-xs' : 'text-[#252A27]/70 hover:text-[#245C45]'
                }`}
              >
                <ChefHat className="w-3.5 h-3.5" />
                <span>Kitchen</span>
              </button>
            </div>
          </div>

          {/* Right: Authenticated Staff Info & Actions */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-bold text-[#252A27]">
                {user?.full_name || 'Cashier Staff'}
              </span>
              <span className="text-[10px] text-[#245C45] font-semibold uppercase tracking-wider">
                {user?.role || 'cashier'} · Counter 1
              </span>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              title="Log Out"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-all cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Body with Sidebar */}
      <div className="flex-1 flex w-full min-w-0 relative">
        <CashierSidebar
          mobileOpen={mobileOpen}
          onCloseMobile={() => setMobileOpen(false)}
        />

        <main className="flex-1 w-full min-w-0 px-4 sm:px-6 lg:px-8 py-5 sm:py-7 pb-20 md:pb-8 overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
