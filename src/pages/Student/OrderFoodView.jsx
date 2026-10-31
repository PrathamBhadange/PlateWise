import { useState } from 'react';
import { Sparkles, Clock, CheckCircle2, ShoppingBag } from 'lucide-react';
import vegThaliImg from '../../assets/images/hero-meal.jpg';
import masalaDosaImg from '../../assets/images/masala-dosa.jpg';
import paneerBowlImg from '../../assets/images/paneer-bowl.jpg';

const MENU_ITEMS = [
  {
    id: 1,
    name: 'Special Veg Thali',
    category: 'Thali',
    desc: 'Wholesome platter with dal tadka, seasonal sabzi, 3 phulkas, steamed basmati rice, curd & salad.',
    credits: 1,
    time: '5–10 mins pickup',
    calories: '580 kcal',
    image: vegThaliImg,
    badge: "Chef's Special",
  },
  {
    id: 2,
    name: 'Mysore Masala Dosa',
    category: 'South Indian',
    desc: 'Crisp golden crepe with spiced potato filling, served with coconut chutney & piping hot sambar.',
    credits: 1,
    time: '8 mins pickup',
    calories: '420 kcal',
    image: masalaDosaImg,
    badge: 'Popular',
  },
  {
    id: 3,
    name: 'Paneer Tikka Rice Bowl',
    category: 'Bowls',
    desc: 'Char-grilled cottage cheese cubes on a bed of herb rice with mint chutney and spiced gravy.',
    credits: 1,
    time: '12 mins pickup',
    calories: '610 kcal',
    image: paneerBowlImg,
    badge: 'High Protein',
  },
];

export default function OrderFoodView() {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [orderedModal, setOrderedModal] = useState(null);

  const categories = ['All', 'Thali', 'South Indian', 'Bowls'];

  const filteredItems =
    selectedCategory === 'All'
      ? MENU_ITEMS
      : MENU_ITEMS.filter((item) => item.category === selectedCategory);

  const handleOrder = (item) => {
    setOrderedModal({
      item,
      token: `#T-${400 + item.id * 19}`,
    });
  };

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#252A27]">
            Order Campus Meals
          </h1>
          <p className="text-xs sm:text-sm text-[#252A27]/75 mt-0.5">
            Pre-book your freshly prepared vegetarian meals to reduce cafeteria waste
          </p>
        </div>

        {/* Prototype Indicator */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E6EFE7] border border-[#245C45]/15 text-[#245C45] text-xs font-semibold w-fit">
          <Sparkles className="w-3.5 h-3.5 text-[#E99A55]" />
          <span>Live Menu (Prototype)</span>
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              selectedCategory === cat
                ? 'bg-[#245C45] text-white shadow-xs'
                : 'bg-white border border-[#245C45]/15 text-[#252A27]/75 hover:bg-[#E6EFE7]'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Menu Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
        {filteredItems.map((item) => (
          <div
            key={item.id}
            className="group bg-white rounded-2xl sm:rounded-3xl border border-[#245C45]/15 shadow-2xs hover:shadow-md transition-all duration-300 overflow-hidden flex flex-col justify-between"
          >
            <div>
              {/* Image & Badge */}
              <div className="relative h-44 sm:h-48 overflow-hidden bg-[#F8F7F2]">
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
                <div className="absolute top-3 left-3 bg-[#164B38]/90 backdrop-blur-xs text-white text-[10px] font-bold px-2.5 py-1 rounded-lg">
                  {item.badge}
                </div>
                <div className="absolute top-3 right-3 bg-white/95 text-[#245C45] text-xs font-bold px-2.5 py-1 rounded-lg border border-[#245C45]/20 shadow-xs">
                  {item.credits} Meal Credit
                </div>
              </div>

              {/* Body */}
              <div className="p-4 sm:p-5">
                <h3 className="font-serif text-lg font-bold text-[#252A27] group-hover:text-[#245C45] transition-colors">
                  {item.name}
                </h3>
                <p className="mt-1.5 text-xs text-[#252A27]/75 leading-relaxed line-clamp-2">
                  {item.desc}
                </p>

                <div className="mt-4 pt-3 border-t border-[#245C45]/10 flex items-center justify-between text-[11px] text-[#252A27]/70">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-[#6B8F71]" />
                    {item.time}
                  </span>
                  <span>{item.calories}</span>
                </div>
              </div>
            </div>

            {/* Bottom Button */}
            <div className="p-4 sm:p-5 pt-0">
              <button
                type="button"
                onClick={() => handleOrder(item)}
                className="w-full py-2.5 bg-[#245C45] hover:bg-[#164B38] text-white text-xs sm:text-sm font-semibold rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Pre-Order for Today</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Simulated Order Confirmation Modal */}
      {orderedModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
          onClick={() => setOrderedModal(null)}
        >
          <div
            className="w-full max-w-sm bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-[#245C45]/20 text-center animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-[#E6EFE7] text-[#245C45] flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-7 h-7" />
            </div>

            <h3 className="font-serif text-xl font-bold text-[#252A27]">
              Pre-Order Confirmed!
            </h3>
            <p className="text-xs text-[#252A27]/70 mt-1">
              {orderedModal.item.name} has been pre-booked.
            </p>

            <div className="my-5 p-4 rounded-2xl bg-[#F8F7F2] border border-[#245C45]/15">
              <span className="text-[11px] font-medium text-[#252A27]/60 block uppercase tracking-wider">
                Pickup Token
              </span>
              <span className="font-mono text-2xl font-bold text-[#245C45] mt-0.5 block">
                {orderedModal.token}
              </span>
              <span className="text-[11px] text-[#6B8F71] mt-1 block">
                Cafeteria Express Counter 2 · Pickup: 12:30 PM
              </span>
            </div>

            <p className="text-[10px] text-[#252A27]/60 italic mb-5">
              * Frontend prototype token: Real order persistence will connect to DBMS in Phase 2.
            </p>

            <button
              type="button"
              onClick={() => setOrderedModal(null)}
              className="w-full py-2.5 bg-[#245C45] hover:bg-[#164B38] text-white text-xs font-semibold rounded-xl cursor-pointer"
            >
              Done & Return
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
