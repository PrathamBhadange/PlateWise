import { Plus, Minus, Trash2 } from 'lucide-react';
import { useCart } from '../../context/useCart';

export default function CartItem({ item }) {
  const { updateQuantity, removeFromCart } = useCart();
  const lineTotal = Number(item.price) * item.quantity;
  const isMaxStockReached = item.stock !== null && item.stock !== undefined && item.quantity >= item.stock;

  return (
    <div className="bg-white rounded-2xl p-4 border border-[#245C45]/10 shadow-xs flex items-center justify-between gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase font-bold text-[#245C45] tracking-wider">
            {item.category}
          </span>
          {item.is_surplus && (
            <span className="text-[9px] uppercase font-bold bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded-md">
              40% Surplus Deal
            </span>
          )}
        </div>
        <h4 className="text-sm font-semibold text-[#252A27] truncate mt-0.5">{item.name}</h4>
        <div className="flex items-center gap-1.5 text-xs">
          <span className="font-semibold text-[#245C45]">₹{Number(item.price).toFixed(2)} each</span>
          {item.original_price && item.original_price > item.price && (
            <span className="text-[#252A27]/40 line-through text-[11px]">
              ₹{Number(item.original_price).toFixed(2)}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Quantity Controls */}
        <div className="flex items-center gap-2 bg-[#E6EFE7] rounded-xl px-2 py-1 border border-[#245C45]/20">
          <button
            type="button"
            onClick={() => updateQuantity(item.menu_item_id, -1, item.is_surplus)}
            className="p-1 rounded text-[#245C45] hover:bg-white transition-colors cursor-pointer"
            aria-label="Decrease quantity"
          >
            <Minus className="w-3 h-3" />
          </button>
          <span className="text-xs font-bold text-[#245C45] w-5 text-center">{item.quantity}</span>
          <button
            type="button"
            disabled={isMaxStockReached}
            onClick={() => updateQuantity(item.menu_item_id, 1, item.is_surplus)}
            className={`p-1 rounded text-[#245C45] transition-colors ${
              isMaxStockReached ? 'opacity-30 cursor-not-allowed' : 'hover:bg-white cursor-pointer'
            }`}
            aria-label="Increase quantity"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>

        {/* Line Total */}
        <div className="w-20 text-right">
          <span className="text-sm font-bold text-[#252A27]">₹{lineTotal.toFixed(2)}</span>
        </div>

        {/* Remove button */}
        <button
          type="button"
          onClick={() => removeFromCart(item.menu_item_id, item.is_surplus)}
          className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
          aria-label="Remove item"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
