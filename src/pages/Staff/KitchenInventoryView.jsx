import { Package, AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function KitchenInventoryView() {
  const stock = [
    { item: 'Basmati Rice', qty: '35 kg', status: 'Healthy', note: 'Sufficient for 120 thalis' },
    { item: 'Toor Dal & Moong Dal', qty: '18 kg', status: 'Healthy', note: 'Morning stock verified' },
    { item: 'Fresh Paneer', qty: '2.5 kg', status: 'Low Stock', note: 'Restock scheduled at 3 PM' },
    { item: 'Atta (Whole Wheat Flour)', qty: '22 kg', status: 'Healthy', note: 'Chapati station stocked' },
    { item: 'Cooking Oil', qty: '14 L', status: 'Healthy', note: 'FSSAI compliant sealed' },
  ];

  return (
    <div className="space-y-6 text-left">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-[#E6EFE7] flex items-center justify-center text-[#245C45]">
          <Package className="w-5 h-5" />
        </div>
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#252A27]">
            Kitchen Ingredient Inventory
          </h1>
          <p className="text-xs sm:text-sm text-[#252A27]/75 mt-0.5">
            Raw material levels synced with campus supplier orders
          </p>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-6 border border-[#245C45]/15 shadow-2xs">
        <div className="divide-y divide-[#245C45]/5 text-xs">
          {stock.map((s, idx) => (
            <div key={idx} className="py-3.5 flex items-center justify-between gap-3">
              <div>
                <h4 className="font-bold text-sm text-[#252A27]">{s.item}</h4>
                <p className="text-[11px] text-[#252A27]/60 mt-0.5">{s.note}</p>
              </div>

              <div className="text-right">
                <span className="font-mono text-sm font-bold text-[#245C45] block">{s.qty}</span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 mt-0.5 ${
                    s.status === 'Low Stock'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-[#E6EFE7] text-[#245C45]'
                  }`}
                >
                  {s.status === 'Low Stock' ? (
                    <AlertTriangle className="w-3 h-3 text-amber-600" />
                  ) : (
                    <CheckCircle2 className="w-3 h-3 text-[#245C45]" />
                  )}
                  <span>{s.status}</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
