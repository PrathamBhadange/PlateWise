import { useState, useEffect, useCallback } from 'react';
import {
  CheckCircle2,
  RefreshCw,
  Sparkles,
  Search,
} from 'lucide-react';
import { getKitchenOrders } from '../../services/member4Api';

export default function KitchenReadyView() {
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchReadyOrders = useCallback(async () => {
    try {
      const res = await getKitchenOrders({ status: 'Ready', date: 'all' });
      setOrders(res?.orders || []);
    } catch (err) {
      console.error('[KitchenReadyView] Failed to load ready orders:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const res = await getKitchenOrders({ status: 'Ready', date: 'all' });
        if (active) {
          setOrders(res?.orders || []);
          setIsLoading(false);
        }
      } catch (err) {
        if (active) {
          console.error('[KitchenReadyView] Error loading ready orders:', err);
          setIsLoading(false);
        }
      }
    }

    load();

    // Poll every 8 seconds so collected orders leave the list immediately when Cashier hands over
    const interval = setInterval(fetchReadyOrders, 8000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [fetchReadyOrders]);

  // Filter strictly for Ready status and search
  const readyOrders = orders.filter((o) => {
    const isReady = o.status === 'Ready';
    const q = searchTerm.toLowerCase().trim();
    const matchesSearch =
      !q ||
      (o.token && o.token.toLowerCase().includes(q)) ||
      (o.student_name && o.student_name.toLowerCase().includes(q)) ||
      (o.items_summary && o.items_summary.toLowerCase().includes(q)) ||
      String(o.order_id).includes(q);
    return isReady && matchesSearch;
  });

  return (
    <div className="space-y-6 text-left">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#252A27]">
              Ready for Counter Pickup ({readyOrders.length})
            </h1>
            <span className="text-[10px] font-semibold text-[#245C45] bg-[#E6EFE7] px-2.5 py-0.5 rounded-full border border-[#245C45]/20">
              Heated Pickup Racks
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#252A27]/75 mt-0.5">
            Freshly prepared meals staged at counter bays awaiting student pickup and cashier verification
          </p>
        </div>

        {/* Search & Manual Refresh */}
        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-56">
            <Search className="w-3.5 h-3.5 text-[#245C45]/60 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search ready token or dish..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-white border border-[#245C45]/20 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#245C45]"
            />
          </div>

          <button
            type="button"
            onClick={fetchReadyOrders}
            className="p-2 rounded-xl bg-white border border-[#245C45]/15 text-[#245C45] hover:bg-[#E6EFE7] transition-all cursor-pointer shadow-2xs"
            title="Refresh Ready Queue"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Info Pill */}
      <div className="p-3 bg-[#E6EFE7]/80 border border-[#245C45]/20 rounded-2xl flex items-center justify-between gap-3 text-xs text-[#245C45]">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#E99A55] flex-shrink-0" />
          <span>
            <strong>Counter Synchronization:</strong> Orders staged here are visible to the cashier. Once verified and handed over at the counter, they automatically leave this rack.
          </span>
        </div>
      </div>

      {/* Orders List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="py-12 text-center text-xs text-[#252A27]/50 flex flex-col items-center justify-center">
            <RefreshCw className="w-6 h-6 animate-spin text-[#245C45] mb-2" />
            <span>Loading ready orders from heated racks...</span>
          </div>
        ) : readyOrders.length === 0 ? (
          <div className="p-10 rounded-3xl bg-white border border-[#245C45]/15 text-center text-xs text-[#245C45] font-semibold flex flex-col items-center justify-center gap-2 shadow-2xs">
            <CheckCircle2 className="w-8 h-8 text-[#245C45]" />
            <span className="text-sm font-bold text-[#252A27]">All Ready Meals Collected!</span>
            <span className="text-[#252A27]/60 font-normal max-w-sm">
              All prepared orders have been verified by the cashier and collected by students. New meals will appear here as soon as kitchen staff marks them Ready.
            </span>
          </div>
        ) : (
          readyOrders.map((ord) => {
            const timeStr = ord.order_date
              ? new Date(ord.order_date).toLocaleTimeString('en-IN', {
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : '12:30 PM';

            return (
              <div
                key={ord.order_id}
                className="p-4 sm:p-5 rounded-2xl bg-white border border-[#245C45]/15 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left"
              >
                {/* Left: Token & Meal Details */}
                <div className="flex items-start gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-[#E6EFE7] border border-[#245C45]/20 flex flex-col items-center justify-center flex-shrink-0 text-[#245C45] shadow-xs">
                    <span className="text-[10px] uppercase font-bold text-[#245C45]/70">Rack</span>
                    <span className="font-mono text-xs font-bold leading-none mt-0.5">
                      {ord.token}
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-base font-bold text-[#245C45]">
                        {ord.token}
                      </span>
                      <h4 className="text-sm sm:text-base font-bold text-[#252A27]">
                        {ord.items_summary || 'Campus Meal'}
                      </h4>
                      <span className="text-[10px] text-[#252A27]/50">
                        (Order #{ord.order_id})
                      </span>
                    </div>

                    <p className="text-xs text-[#252A27]/75 mt-0.5">
                      Student: <strong className="text-[#252A27]">{ord.student_name}</strong> ·{' '}
                      {ord.total_quantity || 1} plate(s) · {ord.payment_status}
                    </p>

                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#252A27]/60 mt-1">
                      <span>Pickup Slot: <strong className="text-[#245C45]">{ord.pickup_slot}</strong></span>
                      <span>Ready since: <strong>{timeStr}</strong></span>
                    </div>
                  </div>
                </div>

                {/* Right: Counter Handover Status Info (No Handover Button for Kitchen!) */}
                <div className="flex items-center gap-2 self-start sm:self-center">
                  <div className="flex items-center gap-1.5 text-xs text-[#245C45] bg-[#E6EFE7] px-3.5 py-2 rounded-xl border border-[#245C45]/20 font-semibold shadow-2xs">
                    <CheckCircle2 className="w-4 h-4 text-[#245C45]" />
                    <span>Awaiting Student Pickup</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="pt-3 border-t border-[#245C45]/10 text-center text-[10px] text-[#252A27]/60">
        * As per cafeteria operational separation, meal handover and token invalidation are strictly executed at the counter by Cashier staff.
      </div>
    </div>
  );
}
