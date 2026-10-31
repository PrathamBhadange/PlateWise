import { Clock, CheckCircle2 } from 'lucide-react';
import { useStaffOrders } from '../../context/StaffOrderContext';

export default function KitchenReadyView() {
  const { orders } = useStaffOrders();
  const readyOrders = orders.filter((o) => o.status === 'Ready');

  return (
    <div className="space-y-6 text-left">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#252A27]">
            Ready for Counter Pickup ({readyOrders.length})
          </h1>
          <span className="text-[10px] font-semibold text-[#245C45] bg-[#E6EFE7] px-2 py-0.5 rounded-full border border-[#245C45]/20">
            Hot Racks
          </span>
        </div>
        <p className="text-xs sm:text-sm text-[#252A27]/75 mt-0.5">
          Freshly plated meals staged in heated pickup racks awaiting cashier scan
        </p>
      </div>

      <div className="space-y-3">
        {readyOrders.map((ord) => {
          const mealName = ord.meal || ord.name;
          return (
            <div
              key={ord.token}
              className="p-4 rounded-2xl bg-white border border-[#245C45]/15 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl overflow-hidden border border-[#245C45]/15 flex-shrink-0">
                  <img src={ord.image} alt={mealName} className="w-full h-full object-cover" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-[#245C45]">{ord.token}</span>
                    <h4 className="text-sm font-bold text-[#252A27]">{mealName}</h4>
                  </div>
                  <p className="text-xs text-[#245C45] font-semibold mt-0.5">
                    {ord.counter} · {ord.station || 'Station Ready'}
                  </p>
                  {ord.specialInstructions && (
                    <span className="text-[10px] text-[#E99A55] font-semibold block mt-0.5">
                      Note: {ord.specialInstructions}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-[#252A27]/70 bg-[#F8F7F2] px-3 py-1.5 rounded-xl border border-[#245C45]/10">
                <Clock className="w-3.5 h-3.5 text-[#6B8F71]" />
                <span>Ready since {ord.time}</span>
              </div>
            </div>
          );
        })}

        {readyOrders.length === 0 && (
          <div className="p-8 rounded-3xl bg-white border border-[#245C45]/15 text-center text-xs text-[#245C45] font-semibold flex flex-col items-center justify-center gap-2">
            <CheckCircle2 className="w-6 h-6 text-[#245C45]" />
            <span>All ready meals have been picked up by students from the counter!</span>
          </div>
        )}
      </div>
    </div>
  );
}
