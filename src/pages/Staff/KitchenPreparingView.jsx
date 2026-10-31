import { CheckCircle2, Flame } from 'lucide-react';
import { useStaffOrders } from '../../context/StaffOrderContext';

export default function KitchenPreparingView() {
  const { orders, updateOrderStatus } = useStaffOrders();
  const preparingOrders = orders.filter((o) => o.status === 'Preparing');

  const handleMarkReady = (id) => {
    updateOrderStatus(id, 'Ready');
  };

  return (
    <div className="space-y-6 text-left">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#252A27]">
            Now Preparing ({preparingOrders.length})
          </h1>
          <span className="text-[10px] font-semibold text-[#245C45] bg-[#E6EFE7] px-2 py-0.5 rounded-full border border-[#245C45]/20">
            Active Bays
          </span>
        </div>
        <p className="text-xs sm:text-sm text-[#252A27]/75 mt-0.5">
          Live cooking stations currently finishing plates
        </p>
      </div>

      <div className="space-y-3">
        {preparingOrders.map((ord) => {
          const mealName = ord.meal || ord.name;
          return (
            <div
              key={ord.id}
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
                  <p className="text-xs text-[#252A27]/60 mt-0.5">
                    {ord.qty} · {ord.station || 'Main Station'}
                  </p>
                  {ord.specialInstructions && (
                    <span className="text-[10px] text-[#E99A55] font-semibold block mt-0.5">
                      Note: {ord.specialInstructions}
                    </span>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleMarkReady(ord.id)}
                className="px-4 py-2 bg-[#164B38] hover:bg-[#245C45] text-white text-xs font-semibold rounded-xl transition-all shadow-xs cursor-pointer flex items-center gap-1.5 self-start sm:self-auto active:scale-[0.98]"
              >
                <CheckCircle2 className="w-4 h-4 text-[#E99A55]" />
                <span>Mark Ready for Pickup</span>
              </button>
            </div>
          );
        })}

        {preparingOrders.length === 0 && (
          <div className="p-8 rounded-3xl bg-white border border-[#245C45]/15 text-center text-xs text-[#245C45] font-semibold flex flex-col items-center justify-center gap-2">
            <Flame className="w-6 h-6 text-amber-500" />
            <span>All active station orders are cleared and ready for pickup!</span>
          </div>
        )}
      </div>
    </div>
  );
}
