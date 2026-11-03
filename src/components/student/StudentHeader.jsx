import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, ShoppingCart, UserCheck, LogOut, Home } from 'lucide-react';
import { useAuth } from '../../context/useAuth';
import { useCart } from '../../context/useCart';

export default function StudentHeader({ onToggleSidebar, isSidebarOpen }) {
  const { user, logout } = useAuth();
  const { cartCount } = useCart();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/', { replace: true });
  };

  return (
    <header className="bg-white border-b border-[#245C45]/10 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Mobile hamburger button */}
          <button
            type="button"
            onClick={onToggleSidebar}
            className="md:hidden p-2 text-[#252A27]/70 hover:text-[#245C45] hover:bg-[#E6EFE7]/50 rounded-lg transition-colors cursor-pointer"
            aria-label="Toggle navigation"
          >
            {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <Link
            to="/"
            className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-[#245C45] bg-[#E6EFE7] hover:bg-[#245C45] hover:text-white px-3 py-1.5 rounded-lg transition-colors"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Public Home</span>
          </Link>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-3">
          {/* Cart shortcut */}
          <Link
            to="/student/cart"
            className="relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#245C45]/20 bg-[#F8F7F2] hover:bg-[#E6EFE7]/70 text-xs font-medium text-[#245C45] transition-colors"
          >
            <ShoppingCart className="w-4 h-4" />
            <span className="hidden sm:inline">Cart</span>
            {cartCount > 0 && (
              <span className="inline-flex items-center justify-center px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-[#245C45] text-white">
                {cartCount}
              </span>
            )}
          </Link>

          {/* Student Badge & Logout */}
          {user && (
            <div className="inline-flex items-center gap-2 bg-[#F8F7F2] border border-[#245C45]/20 rounded-xl px-2.5 py-1 text-xs">
              <UserCheck className="w-3.5 h-3.5 text-[#245C45]" />
              <span className="text-[#252A27]/80 font-medium max-w-[120px] sm:max-w-none truncate">
                {user.full_name || user.email}
              </span>
              <span className="px-1.5 py-0.5 rounded-md bg-[#245C45] text-white text-[10px] font-semibold uppercase">
                {user.role}
              </span>
              <button
                type="button"
                onClick={handleLogout}
                title="Logout"
                className="ml-1 p-1 text-[#252A27]/60 hover:text-red-600 rounded hover:bg-red-50 transition-colors cursor-pointer"
                aria-label="Logout"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
