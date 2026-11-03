import { Clock, MapPin, AlertCircle, QrCode } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import OrderStatusTracker from './OrderStatusTracker';

export default function ActiveOrderCard({ order, onCancelOrder, isCancelling }) {
  if (!order) return null;

  const isPending = order.status?.toLowerCase() === 'pending';

  return (
    <div className="bg-white rounded-2xl border border-[#245C45]/20 p-5 sm:p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#245C45]/10 gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#245C45] bg-[#E6EFE7] px-2.5 py-0.5 rounded-md">
              Active Order
            </span>
            <span className="text-xs text-[#252A27]/60">#{order.order_id}</span>
          </div>
          <h3 className="text-base sm:text-lg font-serif font-bold text-[#252A27] mt-1">
            Pickup Slot: {order.pickup_slot || 'Regular Canteen Hours'}
          </h3>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-[10px] text-[#252A27]/60 uppercase font-medium">Total</span>
            <p className="text-lg font-bold text-[#245C45]">₹{Number(order.total_amount || 0).toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Pickup Token & QR Verification Section */}
      {order.pickup_token && (
        <div className="my-5 p-5 bg-[#F8F7F2] rounded-2xl border border-[#245C45]/20 flex flex-col sm:flex-row items-center justify-between gap-5">
          <div className="flex flex-col items-center sm:items-start text-center sm:text-left">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#245C45] bg-[#E6EFE7] px-2.5 py-0.5 rounded-md">
              PICKUP TOKEN
            </span>
            <div className="text-3xl sm:text-4xl font-serif font-black tracking-tight text-[#245C45] mt-1.5">
              {order.pickup_token}
            </div>
            <p className="text-xs text-[#252A27]/70 mt-1.5 max-w-xs leading-relaxed">
              Show this token or scan the QR code at the canteen counter for immediate meal collection.
            </p>
            <div className="flex items-center gap-1.5 mt-3 text-[11px] text-[#245C45] font-semibold">
              <QrCode className="w-3.5 h-3.5" />
              <span>Scannable at Cashier Pickup Counter</span>
            </div>
          </div>

          <div className="flex flex-col items-center bg-white p-3 rounded-xl border border-[#245C45]/15 shadow-xs">
            <QRCodeSVG
              value={order.pickup_token}
              size={160}
              level="M"
              includeMargin={true}
              bgColor="#ffffff"
              fgColor="#1b4634"
              className="rounded-lg"
            />
            <span className="mt-2 text-xs font-bold text-[#245C45] tracking-wider font-mono">
              {order.pickup_token}
            </span>
          </div>
        </div>
      )}

      {/* Progress tracker */}
      <div className="my-5">
        <OrderStatusTracker status={order.status} />
      </div>

      {/* Items list */}
      <div className="bg-[#F8F7F2] rounded-xl p-3.5 border border-[#245C45]/10 mb-4">
        <span className="text-[11px] font-bold uppercase text-[#252A27]/60 tracking-wider block mb-2">
          Ordered Items
        </span>
        <div className="space-y-1.5 text-xs text-[#252A27]">
          {order.items && order.items.length > 0 ? (
            order.items.map((it, idx) => (
              <div key={idx} className="flex justify-between items-center py-0.5">
                <span>
                  <strong className="font-semibold text-[#245C45]">{it.quantity}x</strong> {it.name || it.item_name}
                </span>
                <span className="text-[#252A27]/70">₹{(Number(it.unit_price) * it.quantity).toFixed(2)}</span>
              </div>
            ))
          ) : (
            <p className="text-xs text-[#252A27]/60">{order.items_summary || 'Standard canteen package'}</p>
          )}
        </div>
      </div>

      {/* Footer details & cancel action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-[#252A27]/70 gap-3">
        <div className="flex items-center gap-4">
          <span className="inline-flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-[#245C45]" />
            {new Date(order.order_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          <span className="inline-flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-[#245C45]" />
            Main Canteen Counter
          </span>
        </div>

        {isPending && onCancelOrder && (
          <button
            type="button"
            disabled={isCancelling}
            onClick={() => onCancelOrder(order.order_id)}
            className="inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg border border-rose-300 text-rose-700 hover:bg-rose-50 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
          >
            <AlertCircle className="w-3.5 h-3.5" />
            <span>{isCancelling ? 'Cancelling...' : 'Cancel Order'}</span>
          </button>
        )}
      </div>
    </div>
  );
}
