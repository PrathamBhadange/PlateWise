import { Plus, Minus, Check, AlertTriangle } from 'lucide-react';
import { useCart } from '../../context/useCart';

export default function MenuItemCard({ item, onSelectDetail }) {
  const { items, addToCart, updateQuantity } = useCart();
  const cartItem = items.find((i) => i.menu_item_id === item.menu_item_id);
  const inCartQty = cartItem ? cartItem.quantity : 0;
  const isAvailable = item.is_available !== false && (item.stock === undefined || item.stock > 0);
  const isMaxStockReached = item.stock !== undefined && inCartQty >= item.stock;

  const categoryBadgeColors = {
    Breakfast: 'bg-amber-100 text-amber-800 border-amber-200',
    Lunch: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    Snacks: 'bg-orange-100 text-orange-800 border-orange-200',
    Beverages: 'bg-sky-100 text-sky-800 border-sky-200',
  };

  return (
    <div className="bg-white rounded-2xl border border-[#245C45]/10 p-5 flex flex-col justify-between shadow-xs hover:shadow-md transition-all group">
      <div>
        <div className="flex items-start justify-between gap-2 mb-2">
          <span
            className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md border ${
              categoryBadgeColors[item.category] || 'bg-stone-100 text-stone-800 border-stone-200'
            }`}
          >
            {item.category}
          </span>
          {isAvailable ? (
            <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1">
              <Check className="w-3 h-3" /> In Stock {item.stock ? `(${item.stock})` : ''}
            </span>
          ) : (
            <span className="text-[10px] font-medium text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> Sold Out
            </span>
          )}
        </div>

        <h3
          onClick={() => onSelectDetail && onSelectDetail(item)}
          className="text-base font-serif font-bold text-[#252A27] group-hover:text-[#245C45] transition-colors cursor-pointer"
        >
          {item.name}
        </h3>
        <p className="text-xs text-[#252A27]/60 mt-1 line-clamp-2">
          {item.description || `Freshly prepared canteen delicacy under hygienic campus standards.`}
        </p>
      </div>

      <div className="mt-4 pt-3 border-t border-[#245C45]/10 flex items-center justify-between">
        <div>
          <span className="text-[10px] text-[#252A27]/50 uppercase font-medium">Price</span>
          <p className="text-base font-bold text-[#245C45]">₹{Number(item.price).toFixed(2)}</p>
        </div>

        <div>
          {!isAvailable ? (
            <button
              disabled
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-gray-100 text-gray-400 cursor-not-allowed"
            >
              Unavailable
            </button>
          ) : inCartQty > 0 ? (
            <div className="flex items-center gap-2 bg-[#E6EFE7] rounded-xl px-2 py-1 border border-[#245C45]/20">
              <button
                type="button"
                onClick={() => updateQuantity(item.menu_item_id, -1)}
                className="p-1 rounded-md text-[#245C45] hover:bg-white transition-colors cursor-pointer"
                aria-label="Decrease quantity"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs font-bold text-[#245C45] w-5 text-center">{inCartQty}</span>
              <button
                type="button"
                disabled={isMaxStockReached}
                onClick={() => updateQuantity(item.menu_item_id, 1)}
                className={`p-1 rounded-md text-[#245C45] transition-colors ${
                  isMaxStockReached ? 'opacity-40 cursor-not-allowed' : 'hover:bg-white cursor-pointer'
                }`}
                aria-label="Increase quantity"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => addToCart(item, 1)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-[#245C45] text-white hover:bg-[#1b4634] shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
