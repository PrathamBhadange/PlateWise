import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Bell,
  ChevronDown,
  Menu,
  X,
  User,
  HelpCircle,
  LogOut,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ChefHat,
  Receipt,
} from 'lucide-react';
import BrandLogo from '../common/BrandLogo';
import cashierAvatar from '../../assets/images/cashier-avatar.jpg';
import kitchenAvatar from '../../assets/images/kitchen-avatar.jpg';

export default function StaffHeader({ onToggleMobileSidebar, mobileSidebarOpen, currentRole = 'cashier' }) {
  const navigate = useNavigate();
  const location = useLocation();

  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const profileRef = useRef(null);
  const notifRef = useRef(null);

  const isKitchen = currentRole === 'kitchen' || location.pathname.startsWith('/staff/kitchen');

  const staffUser = isKitchen
    ? {
        name: 'Suresh Kale',
        roleLabel: 'Kitchen Staff',
        location: 'Main Kitchen',
        id: 'STF-KTC-108',
        avatar: kitchenAvatar,
      }
    : {
        name: 'Priya Patil',
        roleLabel: 'Cashier',
        location: 'Main Canteen',
        id: 'STF-CSH-402',
        avatar: cashierAvatar,
      };

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileDropdownOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setNotificationsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const sampleNotifications = isKitchen
    ? [
        {
          id: 1,
          title: '3 New Orders in Queue',
          desc: 'Veg Thali (3 plates) & Masala Dosa placed via student pre-order.',
          time: '5m ago',
          unread: true,
          icon: ChefHat,
          color: 'text-[#245C45]',
        },
        {
          id: 2,
          title: 'Low Stock Alert',
          desc: 'Paneer inventory below threshold (approx 2 kg remaining).',
          time: '25m ago',
          unread: true,
          icon: Clock,
          color: 'text-[#E99A55]',
        },
        {
          id: 3,
          title: 'Sambar Batch Prepared',
          desc: 'Morning batch approved under hygiene check protocol.',
          time: '1h ago',
          unread: false,
          icon: CheckCircle2,
          color: 'text-[#6B8F71]',
        },
      ]
    : [
        {
          id: 1,
          title: 'Token #A-42 Ready',
          desc: 'Veg Thali prepared by kitchen, ready for student counter pickup.',
          time: '2m ago',
          unread: true,
          icon: CheckCircle2,
          color: 'text-[#245C45]',
        },
        {
          id: 2,
          title: 'Walk-in Cash Verified',
          desc: 'Counter cash balance synced for morning shift: ₹1,260.',
          time: '45m ago',
          unread: true,
          icon: Receipt,
          color: 'text-[#E99A55]',
        },
        {
          id: 3,
          title: 'Daily Meal Sponsorship Logged',
          desc: '4 student-sponsored meals scheduled for NGO collection.',
          time: '2h ago',
          unread: false,
          icon: Sparkles,
          color: 'text-[#6B8F71]',
        },
      ];

  return (
    <header className="sticky top-0 z-30 bg-[#F8F7F2]/95 backdrop-blur-md border-b border-[#245C45]/10 px-4 sm:px-6 lg:px-8 py-3 transition-all">
      <div className="flex items-center justify-between gap-4">
        {/* Left: Mobile Toggle & Brand Logo */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onToggleMobileSidebar}
            className="lg:hidden p-2 text-[#252A27] hover:text-[#245C45] hover:bg-[#E6EFE7] rounded-xl transition-colors cursor-pointer"
            aria-label="Toggle staff sidebar"
          >
            {mobileSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <BrandLogo href={isKitchen ? '/staff/kitchen' : '/staff/dashboard'} size="md" />

          {/* Quick Staff Role Switcher Pill */}
          <div className="hidden md:flex items-center bg-[#E6EFE7]/80 p-1 rounded-xl border border-[#245C45]/15 ml-3">
            <button
              type="button"
              onClick={() => navigate('/staff/dashboard')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                !isKitchen
                  ? 'bg-[#245C45] text-white shadow-xs'
                  : 'text-[#252A27]/70 hover:text-[#245C45]'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>Cashier</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/staff/kitchen')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                isKitchen
                  ? 'bg-[#245C45] text-white shadow-xs'
                  : 'text-[#252A27]/70 hover:text-[#245C45]'
              }`}
            >
              <ChefHat className="w-3.5 h-3.5" />
              <span>Kitchen</span>
            </button>
          </div>
        </div>

        {/* Right: Notifications & Staff Profile Pill */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Notifications Dropdown */}
          <div className="relative" ref={notifRef}>
            <button
              type="button"
              onClick={() => {
                setNotificationsOpen(!notificationsOpen);
                setProfileDropdownOpen(false);
              }}
              className="relative p-2.5 rounded-xl text-[#252A27] hover:text-[#245C45] hover:bg-[#E6EFE7] transition-colors cursor-pointer"
              aria-label="Staff notifications"
              aria-expanded={notificationsOpen}
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#E99A55] ring-2 ring-[#F8F7F2]" />
            </button>

            {notificationsOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-88 bg-white rounded-2xl shadow-xl border border-[#245C45]/15 p-4 z-50 animate-fade-in text-left">
                <div className="flex items-center justify-between pb-3 border-b border-[#245C45]/10">
                  <span className="font-serif font-bold text-sm text-[#252A27]">
                    {staffUser.roleLabel} Alerts
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#E6EFE7] text-[#245C45]">
                    2 New
                  </span>
                </div>

                <div className="divide-y divide-[#245C45]/5 my-1">
                  {sampleNotifications.map((notif) => {
                    const IconComponent = notif.icon;
                    return (
                      <div
                        key={notif.id}
                        className={`py-2.5 flex items-start gap-3 transition-colors ${
                          notif.unread ? 'bg-[#E6EFE7]/20 -mx-2 px-2 rounded-lg' : ''
                        }`}
                      >
                        <div className="w-7 h-7 rounded-lg bg-[#E6EFE7] flex items-center justify-center flex-shrink-0 mt-0.5">
                          <IconComponent className={`w-4 h-4 ${notif.color}`} />
                        </div>
                        <div className="flex-1">
                          <h4 className="text-xs font-semibold text-[#252A27] leading-tight">
                            {notif.title}
                          </h4>
                          <p className="text-[11px] text-[#252A27]/70 mt-0.5 leading-snug">
                            {notif.desc}
                          </p>
                          <span className="text-[10px] text-[#6B8F71] mt-1 block">
                            {notif.time}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-2 border-t border-[#245C45]/10 text-center">
                  <span className="text-[11px] font-medium text-[#245C45] hover:underline cursor-pointer">
                    Clear all alerts
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Staff Profile Dropdown */}
          <div className="relative" ref={profileRef}>
            <button
              type="button"
              onClick={() => {
                setProfileDropdownOpen(!profileDropdownOpen);
                setNotificationsOpen(false);
              }}
              className="flex items-center gap-2.5 p-1.5 sm:px-3 sm:py-1.5 rounded-2xl bg-white border border-[#245C45]/15 hover:border-[#245C45]/30 shadow-2xs hover:shadow-xs transition-all cursor-pointer"
              aria-expanded={profileDropdownOpen}
              aria-label="Staff profile menu"
            >
              <div className="relative w-8 h-8 rounded-full overflow-hidden ring-2 ring-[#245C45]/20 bg-[#E6EFE7] flex-shrink-0">
                <img
                  src={staffUser.avatar}
                  alt={staffUser.name}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="hidden sm:flex flex-col text-left">
                <span className="text-xs font-semibold text-[#252A27] leading-tight">
                  {staffUser.name}
                </span>
                <span className="text-[10px] text-[#252A27]/60 leading-tight">
                  {staffUser.roleLabel} · {staffUser.location}
                </span>
              </div>

              <ChevronDown className="w-3.5 h-3.5 text-[#252A27]/60" />
            </button>

            {profileDropdownOpen && (
              <div className="absolute right-0 mt-2 w-68 bg-white rounded-2xl shadow-xl border border-[#245C45]/15 p-3.5 z-50 animate-fade-in text-left">
                {/* Profile Card Header */}
                <div className="p-2.5 bg-[#F8F7F2] rounded-xl border border-[#245C45]/10 mb-2.5">
                  <div className="flex items-center gap-2.5">
                    <img
                      src={staffUser.avatar}
                      alt={staffUser.name}
                      className="w-10 h-10 rounded-full object-cover ring-2 ring-[#245C45]/20"
                    />
                    <div>
                      <h4 className="text-xs font-bold text-[#252A27]">
                        {staffUser.name}
                      </h4>
                      <p className="text-[10px] text-[#245C45] font-bold">
                        {staffUser.roleLabel} ({staffUser.id})
                      </p>
                      <p className="text-[10px] text-[#252A27]/60">
                        SPPU Canteen · {staffUser.location}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Role Switcher in Mobile/Dropdown */}
                <div className="mb-2 p-2 bg-[#E6EFE7]/50 rounded-xl border border-[#245C45]/15 md:hidden">
                  <span className="text-[10px] font-semibold text-[#245C45] uppercase tracking-wider block mb-1">
                    Switch Staff View
                  </span>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        navigate('/staff/dashboard');
                      }}
                      className={`py-1 text-xs font-semibold rounded-lg text-center ${
                        !isKitchen ? 'bg-[#245C45] text-white' : 'bg-white text-[#252A27]'
                      }`}
                    >
                      Cashier
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        navigate('/staff/kitchen');
                      }}
                      className={`py-1 text-xs font-semibold rounded-lg text-center ${
                        isKitchen ? 'bg-[#245C45] text-white' : 'bg-white text-[#252A27]'
                      }`}
                    >
                      Kitchen
                    </button>
                  </div>
                </div>

                {/* Navigation Links */}
                <div className="space-y-0.5 text-xs text-[#252A27]/85">
                  <button
                    type="button"
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      navigate(isKitchen ? '/staff/kitchen/profile' : '/staff/profile');
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-[#E6EFE7] hover:text-[#245C45] transition-colors cursor-pointer text-left"
                  >
                    <User className="w-4 h-4 text-[#6B8F71]" />
                    <span>Staff Profile & Shift</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      navigate(isKitchen ? '/staff/kitchen/help' : '/staff/help');
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-[#E6EFE7] hover:text-[#245C45] transition-colors cursor-pointer text-left"
                  >
                    <HelpCircle className="w-4 h-4 text-[#6B8F71]" />
                    <span>Staff Help & Support</span>
                  </button>
                </div>

                {/* Prototype Notice & Logout */}
                <div className="mt-2 pt-2 border-t border-[#245C45]/10">
                  <div className="px-2 py-1 mb-2 text-[10px] text-[#245C45] bg-[#E6EFE7] rounded-md flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#E99A55] flex-shrink-0" />
                    <span>Staff Portal Prototype (Demo Data)</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      navigate('/login');
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer text-left"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Log Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
