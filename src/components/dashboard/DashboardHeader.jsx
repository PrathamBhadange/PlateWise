import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  ChevronDown,
  Menu,
  X,
  User,
  CreditCard,
  HelpCircle,
  LogOut,
  Sparkles,
  CheckCircle2,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import BrandLogo from '../common/BrandLogo';
import studentAvatar from '../../assets/images/student-avatar.jpg';

export default function DashboardHeader({ onToggleMobileSidebar, mobileSidebarOpen }) {
  const navigate = useNavigate();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const profileRef = useRef(null);
  const notifRef = useRef(null);

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

  const sampleNotifications = [
    {
      id: 1,
      title: 'Order Ready for Pickup!',
      desc: 'Veg Thali (Token #A-42) is ready at Cafeteria Counter 2.',
      time: '10m ago',
      unread: true,
      icon: CheckCircle2,
      color: 'text-[#245C45]',
    },
    {
      id: 2,
      title: 'Zero Waste Contribution',
      desc: 'Your pre-order helped save 450g food waste today.',
      time: '2h ago',
      unread: true,
      icon: Sparkles,
      color: 'text-[#E99A55]',
    },
    {
      id: 3,
      title: 'Credits Auto-Renewed',
      desc: '12 Semester Meal Credits refreshed successfully.',
      time: '1d ago',
      unread: false,
      icon: Clock,
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
            aria-label="Toggle navigation sidebar"
          >
            {mobileSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <BrandLogo href="/student/dashboard" size="md" />
        </div>

        {/* Right: Notifications & Profile Pill */}
        <div className="flex items-center gap-2 sm:gap-3">
          
          {/* Notification Bell Dropdown */}
          <div className="relative" ref={notifRef}>
            <button
              type="button"
              onClick={() => {
                setNotificationsOpen(!notificationsOpen);
                setProfileDropdownOpen(false);
              }}
              className="relative p-2.5 rounded-xl text-[#252A27] hover:text-[#245C45] hover:bg-[#E6EFE7] transition-colors cursor-pointer"
              aria-label="View notifications"
              aria-expanded={notificationsOpen}
            >
              <Bell className="w-5 h-5" />
              {/* Red unread notification dot */}
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#E99A55] ring-2 ring-[#F8F7F2]" />
            </button>

            {notificationsOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-88 bg-white rounded-2xl shadow-xl border border-[#245C45]/15 p-4 z-50 animate-fade-in">
                <div className="flex items-center justify-between pb-3 border-b border-[#245C45]/10">
                  <span className="font-serif font-bold text-sm text-[#252A27]">
                    Notifications
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
                    Mark all as read
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Student Profile Pill & Dropdown */}
          <div className="relative" ref={profileRef}>
            <button
              type="button"
              onClick={() => {
                setProfileDropdownOpen(!profileDropdownOpen);
                setNotificationsOpen(false);
              }}
              className="flex items-center gap-2.5 p-1.5 sm:px-3 sm:py-1.5 rounded-2xl bg-white border border-[#245C45]/15 hover:border-[#245C45]/30 shadow-2xs hover:shadow-xs transition-all cursor-pointer"
              aria-expanded={profileDropdownOpen}
              aria-label="Student profile menu"
            >
              <div className="relative w-8 h-8 rounded-full overflow-hidden ring-2 ring-[#245C45]/20 bg-[#E6EFE7] flex-shrink-0">
                <img
                  src={studentAvatar}
                  alt="Rohan Deshmukh"
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="hidden sm:flex flex-col text-left">
                <span className="text-xs font-semibold text-[#252A27] leading-tight">
                  Rohan Deshmukh
                </span>
                <span className="text-[10px] text-[#252A27]/60 leading-tight">
                  Student · SPPU, Nashik
                </span>
              </div>

              <ChevronDown className="w-3.5 h-3.5 text-[#252A27]/60" />
            </button>

            {/* Profile Dropdown Menu */}
            {profileDropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-[#245C45]/15 p-3 z-50 animate-fade-in text-left">
                {/* Profile Card Header */}
                <div className="p-2 bg-[#F8F7F2] rounded-xl border border-[#245C45]/10 mb-2">
                  <div className="flex items-center gap-2.5">
                    <img
                      src={studentAvatar}
                      alt="Rohan Deshmukh"
                      className="w-9 h-9 rounded-full object-cover ring-2 ring-[#245C45]/20"
                    />
                    <div>
                      <h4 className="text-xs font-bold text-[#252A27]">
                        Rohan Deshmukh
                      </h4>
                      <p className="text-[10px] text-[#245C45] font-semibold">
                        ID: PW-2026-ST894
                      </p>
                      <p className="text-[10px] text-[#252A27]/60">
                        SPPU Nashik Sub-Center
                      </p>
                    </div>
                  </div>
                </div>

                {/* Dropdown Navigation Links */}
                <div className="space-y-0.5 text-xs text-[#252A27]/85">
                  <button
                    type="button"
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      navigate('/student/profile');
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-[#E6EFE7] hover:text-[#245C45] transition-colors cursor-pointer text-left"
                  >
                    <User className="w-4 h-4 text-[#6B8F71]" />
                    <span>My Profile</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      navigate('/student/credits');
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-[#E6EFE7] hover:text-[#245C45] transition-colors cursor-pointer text-left"
                  >
                    <CreditCard className="w-4 h-4 text-[#6B8F71]" />
                    <span>Meal Credits Ledger</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      navigate('/student/help');
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-[#E6EFE7] hover:text-[#245C45] transition-colors cursor-pointer text-left"
                  >
                    <HelpCircle className="w-4 h-4 text-[#6B8F71]" />
                    <span>Help & Support</span>
                  </button>
                </div>

                {/* Prototype Notice & Logout */}
                <div className="mt-2 pt-2 border-t border-[#245C45]/10">
                  <div className="px-2 py-1 mb-2 text-[10px] text-[#245C45] bg-[#E6EFE7] rounded-md flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#E99A55] flex-shrink-0" />
                    <span>Prototype Profile (Demo Data)</span>
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
