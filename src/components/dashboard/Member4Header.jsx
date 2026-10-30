import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChefHat, ShieldCheck, AlertCircle, FilePlus, Home, UserCheck, Terminal } from 'lucide-react';

export default function Member4Header({ title, subtitle, onRoleChange }) {
  const location = useLocation();
  const [currentRole, setCurrentRole] = useState(
    localStorage.getItem('platewise_demo_role') || 'admin'
  );

  const handleRoleSelect = (e) => {
    const role = e.target.value;
    setCurrentRole(role);
    localStorage.setItem('platewise_demo_role', role);
    if (onRoleChange) onRoleChange(role);
  };

  const navLinks = [
    { label: 'Kitchen & Demand', path: '/kitchen', icon: ChefHat },
    { label: 'Admin Impact', path: '/admin', icon: ShieldCheck },
    { label: 'Complaints Portal', path: '/admin/complaints', icon: AlertCircle },
    { label: 'New Grievance', path: '/complaints/new', icon: FilePlus },
    { label: 'Dev Hub', path: '/dev', icon: Terminal },
  ];

  return (
    <header className="bg-white border-b border-[#245C45]/10 shadow-xs sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {/* Brand & Page Titles */}
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#245C45] bg-[#E6EFE7] hover:bg-[#245C45] hover:text-white px-3 py-1.5 rounded-lg transition-colors"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Landing</span>
            </Link>
            <div className="h-4 w-px bg-[#245C45]/20"></div>
            <div>
              <h1 className="text-lg sm:text-xl font-serif font-bold text-[#252A27]">{title}</h1>
              {subtitle && <p className="text-xs text-[#252A27]/60">{subtitle}</p>}
            </div>
          </div>

          {/* Controls: Role Switcher & Nav Pills */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Demo Role Switcher */}
            <div className="inline-flex items-center gap-1.5 bg-[#F8F7F2] border border-[#245C45]/20 rounded-xl px-2.5 py-1 text-xs">
              <UserCheck className="w-3.5 h-3.5 text-[#245C45]" />
              <span className="text-[#252A27]/60 font-medium">x-demo-role:</span>
              <select
                value={currentRole}
                onChange={handleRoleSelect}
                className="bg-transparent font-semibold text-[#245C45] focus:outline-none cursor-pointer"
              >
                <option value="admin">admin</option>
                <option value="kitchen">kitchen</option>
                <option value="student">student</option>
              </select>
            </div>

            {/* Quick Navigation Pills */}
            <div className="hidden lg:flex items-center gap-1 bg-[#E6EFE7]/50 p-1 rounded-xl border border-[#245C45]/10">
              {navLinks.map((link) => {
                const isActive = location.pathname === link.path;
                const Icon = link.icon;
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-[#245C45] text-white shadow-xs'
                        : 'text-[#252A27]/80 hover:text-[#245C45] hover:bg-white/60'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{link.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        {/* Mobile Navigation bar */}
        <div className="flex lg:hidden overflow-x-auto gap-1 pt-3 border-t border-[#245C45]/10 mt-3 pb-1">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.path;
            const Icon = link.icon;
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap ${
                  isActive
                    ? 'bg-[#245C45] text-white'
                    : 'text-[#252A27]/80 hover:bg-[#E6EFE7]'
                }`}
              >
                <Icon className="w-3 h-3" />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </header>
  );
}

