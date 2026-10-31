import { useLocation } from 'react-router-dom';
import { Mail, Building, MapPin, ShieldCheck, Clock } from 'lucide-react';
import cashierAvatar from '../../assets/images/cashier-avatar.jpg';
import kitchenAvatar from '../../assets/images/kitchen-avatar.jpg';

export default function StaffProfileView() {
  const location = useLocation();
  const isKitchen = location.pathname.startsWith('/staff/kitchen');

  const staff = isKitchen
    ? {
        name: 'Suresh Kale',
        role: 'Kitchen Staff (Head Cook)',
        id: 'STF-KTC-108',
        location: 'Main Kitchen, SPPU Nashik',
        shift: 'Morning Shift: 7:00 AM – 3:30 PM',
        email: 'suresh.kale@canteen.sppu.ac.in',
        avatar: kitchenAvatar,
      }
    : {
        name: 'Priya Patil',
        role: 'Cashier & Counter Supervisor',
        id: 'STF-CSH-402',
        location: 'Main Canteen Counter 2, SPPU Nashik',
        shift: 'Lunch Shift: 9:30 AM – 5:00 PM',
        email: 'priya.patil@canteen.sppu.ac.in',
        avatar: cashierAvatar,
      };

  return (
    <div className="space-y-6 text-left">
      <div>
        <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#252A27]">
          Staff Profile
        </h1>
        <p className="text-xs sm:text-sm text-[#252A27]/75 mt-0.5">
          View your staff employment credentials and shift assignment
        </p>
      </div>

      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#245C45]/15 shadow-2xs">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 pb-6 border-b border-[#245C45]/10">
          <div className="relative w-24 h-24 rounded-3xl overflow-hidden ring-4 ring-[#245C45]/15 shadow-md flex-shrink-0">
            <img src={staff.avatar} alt={staff.name} className="w-full h-full object-cover" />
          </div>

          <div className="text-center sm:text-left flex-1">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="font-serif text-2xl font-bold text-[#252A27]">
                  {staff.name}
                </h2>
                <p className="text-xs text-[#245C45] font-semibold mt-0.5">
                  ID: {staff.id} · {staff.role}
                </p>
              </div>

              <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-[#E6EFE7] text-[#245C45] border border-[#245C45]/20 self-center sm:self-auto">
                Authorized Staff
              </span>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-[#252A27]/70">
              <span className="flex items-center gap-1.5">
                <Building className="w-4 h-4 text-[#6B8F71]" />
                SPPU, Nashik Sub-Center
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-[#6B8F71]" />
                {staff.location}
              </span>
              <span className="flex items-center gap-1.5">
                <Mail className="w-4 h-4 text-[#6B8F71]" />
                {staff.email}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 text-xs">
          <div className="p-4 rounded-2xl bg-[#F8F7F2] border border-[#245C45]/10">
            <span className="text-[11px] font-semibold text-[#252A27]/60 uppercase block">
              Current Shift Assignment
            </span>
            <span className="text-sm font-bold text-[#245C45] mt-1 block flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              {staff.shift}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-[#F8F7F2] border border-[#245C45]/10">
            <span className="text-[11px] font-semibold text-[#252A27]/60 uppercase block">
              Authorization Clearance
            </span>
            <span className="text-sm font-bold text-[#245C45] mt-1 block flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" />
              Level 2 Staff POS & Kitchen Display
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
