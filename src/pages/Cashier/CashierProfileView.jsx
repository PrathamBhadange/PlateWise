import { Mail, MapPin, ShieldCheck, Clock } from 'lucide-react';
import { useAuth } from '../../context/useAuth';

export default function CashierProfileView() {
  const { user } = useAuth();

  return (
    <div className="space-y-6 text-left">
      <div>
        <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#252A27]">
          Cashier Staff Profile
        </h1>
        <p className="text-xs sm:text-sm text-[#252A27]/75 mt-0.5">
          View your verified staff credentials and active counter shift assignment
        </p>
      </div>

      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#245C45]/15 shadow-2xs">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 pb-6 border-b border-[#245C45]/10">
          <div className="w-20 h-20 rounded-3xl bg-[#E6EFE7] text-[#245C45] flex items-center justify-center font-bold text-2xl ring-4 ring-[#245C45]/15 shadow-xs flex-shrink-0">
            {user?.full_name ? user.full_name.slice(0, 2).toUpperCase() : 'CS'}
          </div>

          <div className="text-center sm:text-left flex-1">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="font-serif text-2xl font-bold text-[#252A27]">
                  {user?.full_name || 'Cashier Staff'}
                </h2>
                <p className="text-xs font-semibold text-[#245C45] mt-0.5">
                  Staff ID: STF-CSH-{String(user?.user_id || '004').padStart(3, '0')}
                </p>
              </div>

              <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-[#E6EFE7] text-[#245C45] border border-[#245C45]/20 w-fit mx-auto sm:mx-0">
                Active Staff
              </span>
            </div>

            <p className="text-xs text-[#252A27]/75 mt-2">
              Campus Canteen POS & Express Pickup Counter Supervisor
            </p>
          </div>
        </div>

        {/* Credentials Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
          <div className="p-4 rounded-2xl bg-[#F8F7F2] border border-[#245C45]/10 flex items-start gap-3">
            <Mail className="w-4 h-4 text-[#245C45] mt-0.5 flex-shrink-0" />
            <div>
              <span className="text-[10px] font-semibold text-[#252A27]/60 block uppercase">Email Address</span>
              <span className="text-xs font-medium text-[#252A27] mt-0.5 block">{user?.email || 'cashier@platewise.campus'}</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#F8F7F2] border border-[#245C45]/10 flex items-start gap-3">
            <MapPin className="w-4 h-4 text-[#245C45] mt-0.5 flex-shrink-0" />
            <div>
              <span className="text-[10px] font-semibold text-[#252A27]/60 block uppercase">Assigned Station</span>
              <span className="text-xs font-medium text-[#252A27] mt-0.5 block">Central Canteen · Express Counter 1</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#F8F7F2] border border-[#245C45]/10 flex items-start gap-3">
            <Clock className="w-4 h-4 text-[#245C45] mt-0.5 flex-shrink-0" />
            <div>
              <span className="text-[10px] font-semibold text-[#252A27]/60 block uppercase">Current Shift</span>
              <span className="text-xs font-medium text-[#252A27] mt-0.5 block">Lunch & Evening Shift (10:00 AM – 7:00 PM)</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#F8F7F2] border border-[#245C45]/10 flex items-start gap-3">
            <ShieldCheck className="w-4 h-4 text-[#245C45] mt-0.5 flex-shrink-0" />
            <div>
              <span className="text-[10px] font-semibold text-[#252A27]/60 block uppercase">Database Role</span>
              <span className="text-xs font-medium text-[#245C45] capitalize mt-0.5 block">{user?.role || 'cashier'} (Verified Active)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
