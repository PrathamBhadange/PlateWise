import { useState } from 'react';

export default function KitchenMenuView() {
  const [items, setItems] = useState([
    { id: 1, name: 'Special Veg Thali', maxPortions: 50, prepared: 38, available: true },
    { id: 2, name: 'Mysore Masala Dosa', maxPortions: 30, prepared: 22, available: true },
    { id: 3, name: 'Paneer Tikka Rice Bowl', maxPortions: 25, prepared: 20, available: true },
    { id: 4, name: 'Idli Sambar (Breakfast)', maxPortions: 40, prepared: 40, available: false },
  ]);

  const toggleAvailability = (id) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, available: !i.available } : i))
    );
  };

  return (
    <div className="space-y-6 text-left">
      <div>
        <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#252A27]">
          Kitchen Menu Availability
        </h1>
        <p className="text-xs sm:text-sm text-[#252A27]/75 mt-0.5">
          Toggle live portion capacity to prevent over-ordering when batches finish
        </p>
      </div>

      <div className="bg-white rounded-3xl p-6 border border-[#245C45]/15 shadow-2xs space-y-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="p-4 rounded-2xl bg-[#F8F7F2] border border-[#245C45]/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          >
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-[#252A27]">{item.name}</h3>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    item.available
                      ? 'bg-[#E6EFE7] text-[#245C45] border-[#245C45]/20'
                      : 'bg-rose-50 text-rose-700 border-rose-200'
                  }`}
                >
                  {item.available ? 'Live on Student App' : 'Sold Out / Batch Closed'}
                </span>
              </div>
              <p className="text-xs text-[#252A27]/60 mt-0.5">
                {item.prepared}/{item.maxPortions} portions prepared today
              </p>
            </div>

            <button
              type="button"
              onClick={() => toggleAvailability(item.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                item.available
                  ? 'bg-rose-100 text-rose-800 hover:bg-rose-200'
                  : 'bg-[#245C45] text-white hover:bg-[#164B38]'
              }`}
            >
              {item.available ? 'Mark Sold Out' : 'Restore Menu Item'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
