import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  UtensilsCrossed,
  ShoppingCart,
  Clock,
  AlertCircle,
  HeartHandshake,
  Sparkles,
  Leaf,
  User,
} from 'lucide-react';
import BrandLogo from '../common/BrandLogo';
import { useCart } from '../../context/useCart';

export default function StudentSidebar({ onClose }) {
  const { cartCount } = useCart();

  const links = [
    { label: 'Dashboard', path: '/student', icon: LayoutDashboard, end: true },
    { label: 'Explore Menu', path: '/student/menu', icon: UtensilsCrossed },
    { label: 'My Cart', path: '/student/cart', icon: ShoppingCart, badge: cartCount },
    { label: 'My Orders', path: '/student/orders', icon: Clock },
    { label: 'Report Grievance', path: '/student/complaints', icon: AlertCircle },
    { label: 'Pay-It-Forward', path: '/student/pay-it-forward', icon: HeartHandshake },
    { label: 'Surplus Deals', path: '/student/surplus', icon: Sparkles },
    { label: 'My Eco-Impact', path: '/student/impact', icon: Leaf },
    { label: 'My Profile', path: '/student/profile', icon: User },
  ];

  return (
    <aside className="w-64 bg-white border-r border-[#245C45]/15 flex flex-col h-full select-none">
      {/* Brand logo header */}
      <div className="p-5 border-b border-[#245C45]/10 flex items-center justify-between">
        <BrandLogo />
      </div>

      {/* Nav items */}
      <nav className="flex-1 p-3.5 space-y-1 overflow-y-auto">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-[#252A27]/50 px-3 py-1.5">
          Student Portal
        </div>
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <NavLink
              key={link.path}
              to={link.path}
              end={link.end}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-[#245C45] text-white shadow-xs font-semibold'
                    : 'text-[#252A27]/80 hover:bg-[#E6EFE7]/60 hover:text-[#245C45]'
                }`
              }
            >
              <div className="flex items-center gap-3">
                <Icon className="w-4 h-4" />
                <span>{link.label}</span>
              </div>
              {link.badge > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E6EFE7] text-[#245C45]">
                  {link.badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer info card */}
      <div className="p-4 border-t border-[#245C45]/10">
        <div className="bg-[#F8F7F2] p-3 rounded-xl border border-[#245C45]/15 text-center">
          <p className="text-xs font-semibold text-[#245C45]">Smart Canteen Zero-Waste</p>
          <p className="text-[10px] text-[#252A27]/60 mt-0.5">Good Food. Less Waste.</p>
        </div>
      </div>
    </aside>
  );
}
