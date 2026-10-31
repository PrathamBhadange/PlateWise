import { Mail, Building, MapPin, ShieldCheck } from 'lucide-react';
import studentAvatar from '../../assets/images/student-avatar.jpg';

export default function ProfileView() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#252A27]">
          Student Profile
        </h1>
        <p className="text-xs sm:text-sm text-[#252A27]/75 mt-0.5">
          View your academic credentials and campus dining preferences
        </p>
      </div>

      {/* Main Profile Details Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#245C45]/15 shadow-2xs">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 pb-6 border-b border-[#245C45]/10">
          <div className="relative w-24 h-24 rounded-3xl overflow-hidden ring-4 ring-[#245C45]/15 shadow-md flex-shrink-0">
            <img
              src={studentAvatar}
              alt="Rohan Deshmukh"
              className="w-full h-full object-cover"
            />
          </div>

          <div className="text-center sm:text-left flex-1">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="font-serif text-2xl font-bold text-[#252A27]">
                  Rohan Deshmukh
                </h2>
                <p className="text-xs text-[#245C45] font-semibold mt-0.5">
                  PRN: 72018492K · Computer Engineering (Final Year)
                </p>
              </div>

              <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-[#E6EFE7] text-[#245C45] border border-[#245C45]/20 self-center sm:self-auto">
                Verified Student
              </span>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-[#252A27]/70">
              <span className="flex items-center gap-1.5">
                <Building className="w-4 h-4 text-[#6B8F71]" />
                SPPU, Nashik Sub-Center
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-[#6B8F71]" />
                Hostel Block B, Room 304
              </span>
              <span className="flex items-center gap-1.5">
                <Mail className="w-4 h-4 text-[#6B8F71]" />
                rohan.deshmukh@sppu.ac.in
              </span>
            </div>
          </div>
        </div>

        {/* Profile Attributes Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
          <div className="p-4 rounded-2xl bg-[#F8F7F2] border border-[#245C45]/10">
            <span className="text-[11px] font-semibold text-[#252A27]/60 block uppercase">
              Dietary Preference
            </span>
            <span className="text-sm font-bold text-[#245C45] mt-1 block">
              100% Vegetarian (Pure Veg Campus Menu)
            </span>
            <span className="text-xs text-[#252A27]/70 mt-0.5 block">
              Includes Jain meal options on festival days
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-[#F8F7F2] border border-[#245C45]/10">
            <span className="text-[11px] font-semibold text-[#252A27]/60 block uppercase">
              Meal Plan Status
            </span>
            <span className="text-sm font-bold text-[#245C45] mt-1 block">
              Semester Saver (12 Credits Left)
            </span>
            <span className="text-xs text-[#252A27]/70 mt-0.5 block">
              Valid through 2026 Academic Term
            </span>
          </div>
        </div>

        {/* Prototype notice */}
        <div className="mt-6 pt-4 border-t border-[#245C45]/10 flex items-center gap-2 text-xs text-[#252A27]/70">
          <ShieldCheck className="w-4 h-4 text-[#245C45] flex-shrink-0" />
          <span>
            Prototype Demo Record: Profile edits and biometric RFID card pairing will connect in DBMS Phase 2.
          </span>
        </div>
      </div>
    </div>
  );
}
