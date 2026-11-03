import { Mail, MapPin, ShieldCheck, Clock, ChefHat } from 'lucide-react';
import { useAuth } from '../../context/useAuth';

export default function KitchenProfileView() {
  const { user } = useAuth();

  return (
    <div className="space-y-6 text-left">
      <div>
        <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#252A27]">
          Kitchen Staff Profile
        </h1>
        <p className="text-xs sm:text-sm text-[#252A27]/75 mt-0.5">
          View your verified staff credentials and active production kitchen assignment
        </p>
      </div>

      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#245C45]/15 shadow-2xs">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 pb-6 border-b border-[#245C45]/10">
          <div className="w-20 h-20 rounded-3xl bg-[#E6EFE7] text-[#245C45] flex items-center justify-center font-bold text-2xl ring-4 ring-[#245C45]/15 shadow-xs flex-shrink-0">
            {user?.full_name ? user.full_name.slice(0, 2).toUpperCase() : 'KS'}
          </div>

          <div className="text-center sm:text-left flex-1">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="font-serif text-2xl font-bold text-[#252A27]">
                  {user?.full_name || 'Kitchen Staff'}
                </h2>
                <p className="text-xs font-semibold text-[#245C45] mt-0.5 flex items-center gap-1.5 justify-center sm:justify-start">
                  <ChefHat className="w-3.5 h-3.5 text-[#245C45]" />
                  <span>Staff ID: STF-KIT-{String(user?.user_id || '002').padStart(3, '0')}</span>
                </p>
              </div>

              <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-[#E6EFE7] text-[#245C45] border border-[#245C45]/20 w-fit mx-auto sm:mx-0">
                Active Staff
              </span>
            </div>

            <p className="text-xs text-[#252A27]/75 mt-2">
              Campus Central Kitchen · Food Production & Demand Planning Supervisor
            </p>
          </div>
        </div>

        {/* Credentials Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
          <div className="p-4 rounded-2xl bg-[#F8F7F2] border border-[#245C45]/10 flex items-start gap-3">
            <Mail className="w-4 h-4 text-[#245C45] mt-0.5 flex-shrink-0" />
            <div>
              <span className="text-[10px] font-semibold text-[#252A27]/60 block uppercase">Email Address</span>
              <span className="text-xs font-medium text-[#252A27] mt-0.5 block">{user?.email || 'kitchen@platewise.campus'}</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#F8F7F2] border border-[#245C45]/10 flex items-start gap-3">
            <MapPin className="w-4 h-4 text-[#245C45] mt-0.5 flex-shrink-0" />
            <div>
              <span className="text-[10px] font-semibold text-[#252A27]/60 block uppercase">Assigned Station</span>
              <span className="text-xs font-medium text-[#252A27] mt-0.5 block">Central Canteen · Main Kitchen & Batch Cooking Line</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#F8F7F2] border border-[#245C45]/10 flex items-start gap-3">
            <Clock className="w-4 h-4 text-[#245C45] mt-0.5 flex-shrink-0" />
            <div>
              <span className="text-[10px] font-semibold text-[#252A27]/60 block uppercase">Current Shift</span>
              <span className="text-xs font-medium text-[#252A27] mt-0.5 block">Morning & Lunch Prep (07:00 AM – 04:00 PM)</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#F8F7F2] border border-[#245C45]/10 flex items-start gap-3">
            <ShieldCheck className="w-4 h-4 text-[#245C45] mt-0.5 flex-shrink-0" />
            <div>
              <span className="text-[10px] font-semibold text-[#252A27]/60 block uppercase">Database Role</span>
              <span className="text-xs font-medium text-[#245C45] capitalize mt-0.5 block">{user?.role || 'kitchen'} (Verified Active)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
