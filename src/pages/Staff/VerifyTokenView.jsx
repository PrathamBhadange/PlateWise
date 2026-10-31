import TokenVerification from '../../components/staff/TokenVerification';
import { ShieldCheck, Info } from 'lucide-react';

export default function VerifyTokenView() {
  return (
    <div className="space-y-6 text-left">
      <div>
        <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#252A27]">
          Verify Student Pickup Token
        </h1>
        <p className="text-xs sm:text-sm text-[#252A27]/75 mt-0.5">
          Scan student mobile QR code or enter token code to authorize cafeteria plate pickup
        </p>
      </div>

      <TokenVerification />

      {/* Cashier Verification Guidelines */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-[#245C45]/15 shadow-2xs">
          <div className="flex items-center gap-2 font-bold text-xs text-[#245C45] mb-1">
            <ShieldCheck className="w-4 h-4 text-[#E99A55]" />
            <span>Anti-Duplicate Token Protocol</span>
          </div>
          <p className="text-[11px] text-[#252A27]/75 leading-relaxed">
            Every pickup token can only be claimed once. Once handed over, the system automatically invalidates the token across all counters.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-[#245C45]/15 shadow-2xs">
          <div className="flex items-center gap-2 font-bold text-xs text-[#245C45] mb-1">
            <Info className="w-4 h-4 text-[#6B8F71]" />
            <span>Special Diet & Allergen Check</span>
          </div>
          <p className="text-[11px] text-[#252A27]/75 leading-relaxed">
            Always confirm with the student if Jain or no-onion preparation was requested before handing over the plate.
          </p>
        </div>
      </div>
    </div>
  );
}
