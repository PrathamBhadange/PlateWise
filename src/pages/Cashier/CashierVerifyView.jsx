import { useState, useEffect, useCallback } from 'react';
import TokenVerification from '../../components/cashier/TokenVerification';
import { ShieldCheck, Info } from 'lucide-react';
import api from '../../services/api';

export default function CashierVerifyView() {
  const [sampleTokens, setSampleTokens] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleOrderUpdated = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  useEffect(() => {
    let active = true;

    async function fetchTokens() {
      try {
        const res = await api.get('/cashier/orders?date=all');
        if (active) {
          const orders = res.data;
          const tokens = [
            ...orders.filter((o) => o.status === 'Ready').map((o) => o.token),
            ...orders.filter((o) => ['Preparing', 'Pending', 'Confirmed'].includes(o.status)).map((o) => o.token),
            ...orders.filter((o) => o.status === 'Collected' || o.status === 'picked_up').map((o) => o.token),
            ...orders.map((o) => o.token),
          ].filter(Boolean).filter((val, idx, self) => self.indexOf(val) === idx);
          setSampleTokens(tokens);
        }
      } catch (err) {
        console.error('[CashierVerifyView] Failed to load orders for tokens:', err);
      }
    }

    fetchTokens();
    return () => {
      active = false;
    };
  }, [refreshKey]);

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

      <TokenVerification
        sampleTokens={sampleTokens}
        onOrderUpdated={handleOrderUpdated}
      />

      {/* Cashier Verification Guidelines */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-[#245C45]/15 shadow-2xs">
          <div className="flex items-center gap-2 font-bold text-xs text-[#245C45] mb-1">
            <ShieldCheck className="w-4 h-4 text-[#E99A55]" />
            <span>Anti-Duplicate Token Protocol</span>
          </div>
          <p className="text-[11px] text-[#252A27]/75 leading-relaxed">
            Every pickup token can only be claimed once. The system strictly transitions status from Ready to Collected, invalidating the token for any subsequent pickup.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-[#245C45]/15 shadow-2xs">
          <div className="flex items-center gap-2 font-bold text-xs text-[#245C45] mb-1">
            <Info className="w-4 h-4 text-[#6B8F71]" />
            <span>Special Diet & Allergen Check</span>
          </div>
          <p className="text-[11px] text-[#252A27]/75 leading-relaxed">
            Always verify the student name and meal description on the counter terminal before handing over the plate to prevent food mix-ups.
          </p>
        </div>
      </div>
    </div>
  );
}
