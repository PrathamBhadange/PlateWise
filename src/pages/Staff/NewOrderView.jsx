import { useState } from 'react';
import { Plus, CheckCircle2, ShoppingBag, IndianRupee } from 'lucide-react';
import vegThaliImg from '../../assets/images/hero-meal.jpg';
import masalaDosaImg from '../../assets/images/masala-dosa.jpg';
import paneerBowlImg from '../../assets/images/paneer-bowl.jpg';

export default function NewOrderView() {
  const [selectedMeal, setSelectedMeal] = useState(1);
  const [qty, setQty] = useState(1);
  const [paymentMode, setPaymentMode] = useState('cash');
  const [generatedToken, setGeneratedToken] = useState(null);

  const menu = [
    { id: 1, name: 'Special Veg Thali', price: 90, image: vegThaliImg },
    { id: 2, name: 'Mysore Masala Dosa', price: 65, image: masalaDosaImg },
    { id: 3, name: 'Paneer Tikka Rice Bowl', price: 110, image: paneerBowlImg },
  ];

  const chosenItem = menu.find((m) => m.id === selectedMeal) || menu[0];
  const totalAmount = chosenItem.price * qty;

  const handlePlaceOrder = (e) => {
    e.preventDefault();
    setGeneratedToken({
      token: `#W-${Math.floor(100 + Math.random() * 899)}`,
      meal: chosenItem.name,
      qty,
      total: totalAmount,
      mode: paymentMode,
      time: 'Just now',
    });
  };

  return (
    <div className="space-y-6 text-left">
      <div>
        <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#252A27]">
          New Walk-in Order
        </h1>
        <p className="text-xs sm:text-sm text-[#252A27]/75 mt-0.5">
          Generate cafeteria tokens for students purchasing meals directly at the cashier desk
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Order Builder (7 cols) */}
        <form onSubmit={handlePlaceOrder} className="lg:col-span-7 bg-white rounded-3xl p-6 border border-[#245C45]/15 shadow-2xs space-y-4">
          <h3 className="font-serif text-lg font-bold text-[#252A27] pb-2 border-b border-[#245C45]/10">
            1. Select Meal
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {menu.map((item) => (
              <div
                key={item.id}
                onClick={() => setSelectedMeal(item.id)}
                className={`p-3 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                  selectedMeal === item.id
                    ? 'border-[#245C45] bg-[#E6EFE7]/40 ring-2 ring-[#245C45]/20'
                    : 'border-[#245C45]/15 bg-white hover:border-[#245C45]/40'
                }`}
              >
                <div className="w-full h-24 rounded-xl overflow-hidden mb-2 bg-[#F8F7F2]">
                  <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#252A27]">{item.name}</h4>
                  <span className="font-mono text-sm font-bold text-[#245C45]">₹{item.price}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-[#245C45]/10 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#252A27] mb-1">
                Quantity (Plates)
              </label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setQty(n)}
                    className={`w-9 h-9 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      qty === n
                        ? 'bg-[#245C45] text-white shadow-xs'
                        : 'bg-[#F8F7F2] text-[#252A27] border border-[#245C45]/15 hover:bg-[#E6EFE7]'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#252A27] mb-1">
                Payment Method
              </label>
              <div className="flex items-center gap-2">
                {[
                  { id: 'cash', label: 'Cash' },
                  { id: 'upi', label: 'UPI QR' },
                  { id: 'credits', label: 'Credit' },
                ].map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setPaymentMode(mode.id)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      paymentMode === mode.id
                        ? 'bg-[#245C45] text-white'
                        : 'bg-[#F8F7F2] border border-[#245C45]/15 text-[#252A27]'
                    }`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-[#245C45] hover:bg-[#164B38] text-white font-semibold text-sm rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer mt-3"
          >
            <Plus className="w-4 h-4" />
            <span>Confirm Order & Generate Token (₹{totalAmount})</span>
          </button>
        </form>

        {/* Order Token Receipt Preview (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-6 border border-[#245C45]/15 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#245C45] block mb-1">
            Token Generation Slip
          </span>
          <h3 className="font-serif text-lg font-bold text-[#252A27]">
            {generatedToken ? 'Token Created' : 'Ready to Print'}
          </h3>

          {generatedToken ? (
            <div className="my-4 p-5 rounded-2xl bg-[#E6EFE7]/50 border border-[#245C45]/20 space-y-3 text-center animate-fade-in">
              <span className="text-[11px] text-[#252A27]/60 block uppercase tracking-wider">
                Counter Token
              </span>
              <span className="font-mono text-3xl font-bold text-[#245C45] block">
                {generatedToken.token}
              </span>

              <div className="text-xs text-[#252A27] border-t border-[#245C45]/10 pt-2 space-y-1">
                <p><strong>Item:</strong> {generatedToken.qty}x {generatedToken.meal}</p>
                <p><strong>Amount Paid:</strong> ₹{generatedToken.total} ({generatedToken.mode.toUpperCase()})</p>
                <p className="text-[#6B8F71]">Dispatched to Main Kitchen queue</p>
              </div>

              <div className="pt-2">
                <span className="inline-flex items-center gap-1 text-[11px] text-[#245C45] font-semibold bg-white px-2.5 py-1 rounded-full border border-[#245C45]/20">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Printed to Thermal POS #2</span>
                </span>
              </div>
            </div>
          ) : (
            <div className="my-8 p-6 rounded-2xl bg-[#F8F7F2] border border-dashed border-[#245C45]/20 text-center text-xs text-[#252A27]/50">
              <ShoppingBag className="w-10 h-10 mx-auto mb-2 text-[#245C45]/40" />
              <span>Select item and click generate order to print token for the student.</span>
            </div>
          )}

          <div className="text-[10px] text-[#252A27]/60 pt-2 border-t border-[#245C45]/10 flex items-center gap-1">
            <IndianRupee className="w-3.5 h-3.5 text-[#245C45]" />
            <span>Walk-in orders synchronize with kitchen preparation display instantly.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
