import KitchenOrderQueue from '../../components/staff/KitchenOrderQueue';
import { useStaffOrders } from '../../context/StaffOrderContext';

export default function KitchenQueueView() {
  const { orders, updateOrderStatus } = useStaffOrders();

  return (
    <div className="space-y-6 text-left">
      <div>
        <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#252A27]">
          Kitchen Order Queue
        </h1>
        <p className="text-xs sm:text-sm text-[#252A27]/75 mt-0.5">
          Full preparation queue for hot meals, dosas, and rice bowls
        </p>
      </div>

      <KitchenOrderQueue orders={orders} onUpdateStatus={updateOrderStatus} />
    </div>
  );
}
