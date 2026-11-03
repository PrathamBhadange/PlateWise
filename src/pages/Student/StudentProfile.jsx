import { useNavigate } from 'react-router-dom';
import { User, Mail, Shield, Calendar, LogOut, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/useAuth';

export default function StudentProfile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/', { replace: true });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-serif font-bold text-[#252A27]">Student Profile</h1>
        <p className="text-xs text-[#252A27]/70 mt-1">
          Your authenticated student identity and system credentials.
        </p>
      </div>

      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#245C45]/15 shadow-xs space-y-6">
        {/* User Avatar & Title */}
        <div className="flex items-center gap-4 pb-6 border-b border-[#245C45]/10">
          <div className="w-16 h-16 rounded-2xl bg-[#E6EFE7] text-[#245C45] flex items-center justify-center font-serif text-2xl font-bold">
            {user?.full_name?.charAt(0) || 'S'}
          </div>
          <div>
            <h2 className="text-xl font-serif font-bold text-[#252A27]">
              {user?.full_name || 'Campus Student'}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="px-2.5 py-0.5 rounded-md bg-[#245C45] text-white text-[10px] font-bold uppercase tracking-wider">
                {user?.role || 'student'}
              </span>
              <span className="text-xs text-[#252A27]/60">Student ID: #{user?.user_id}</span>
            </div>
          </div>
        </div>

        {/* Credentials Grid (Read-only as per specification) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="bg-[#F8F7F2] p-4 rounded-2xl border border-[#245C45]/10 space-y-1">
            <span className="text-[#252A27]/60 flex items-center gap-1.5 font-medium">
              <User className="w-3.5 h-3.5 text-[#245C45]" />
              Full Name
            </span>
            <p className="text-sm font-semibold text-[#252A27]">{user?.full_name || 'N/A'}</p>
          </div>

          <div className="bg-[#F8F7F2] p-4 rounded-2xl border border-[#245C45]/10 space-y-1">
            <span className="text-[#252A27]/60 flex items-center gap-1.5 font-medium">
              <Mail className="w-3.5 h-3.5 text-[#245C45]" />
              Campus Email Address
            </span>
            <p className="text-sm font-semibold text-[#252A27] truncate">{user?.email || 'N/A'}</p>
          </div>

          <div className="bg-[#F8F7F2] p-4 rounded-2xl border border-[#245C45]/10 space-y-1">
            <span className="text-[#252A27]/60 flex items-center gap-1.5 font-medium">
              <Shield className="w-3.5 h-3.5 text-[#245C45]" />
              Access Role
            </span>
            <p className="text-sm font-semibold capitalize text-[#252A27]">{user?.role || 'student'}</p>
          </div>

          <div className="bg-[#F8F7F2] p-4 rounded-2xl border border-[#245C45]/10 space-y-1">
            <span className="text-[#252A27]/60 flex items-center gap-1.5 font-medium">
              <Calendar className="w-3.5 h-3.5 text-[#245C45]" />
              Account Created
            </span>
            <p className="text-sm font-semibold text-[#252A27]">
              {user?.created_at
                ? new Date(user.created_at).toLocaleDateString([], {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : 'Active Member'}
            </p>
          </div>
        </div>

        {/* Security / Verification Badge */}
        <div className="bg-[#E6EFE7]/50 rounded-2xl p-4 border border-[#245C45]/20 flex items-center gap-3 text-xs text-[#245C45]">
          <CheckCircle2 className="w-5 h-5 text-[#245C45] shrink-0" />
          <p className="leading-relaxed">
            Your session is cryptographically secured with HttpOnly JWT, server-side bcrypt password hashing, and anti-tamper CSRF protection.
          </p>
        </div>

        {/* Logout Action */}
        <div className="pt-4 border-t border-[#245C45]/10 flex justify-end">
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out of PlateWise</span>
          </button>
        </div>
      </div>
    </div>
  );
}
