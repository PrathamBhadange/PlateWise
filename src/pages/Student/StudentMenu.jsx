import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, ShoppingBag, X, RotateCcw, AlertCircle } from 'lucide-react';
import { getStudentMenu } from '../../services/studentApi';
import MenuItemCard from '../../components/student/MenuItemCard';
import LoadingSpinner from '../../components/dashboard/LoadingSpinner';
import { useCart } from '../../context/useCart';

export default function StudentMenu() {
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [selectedItemDetail, setSelectedItemDetail] = useState(null);

  const { cartCount, cartSubtotal } = useCart();

  const reloadMenu = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getStudentMenu();
      setMenuItems(Array.isArray(data) ? data : data.items || []);
    } catch (err) {
      console.error('Failed to load menu items:', err);
      setError(
        err.response?.data?.message || err.response?.data?.error || 'Failed to load canteen menu from database.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    getStudentMenu()
      .then((data) => {
        if (!ignore) {
          setMenuItems(Array.isArray(data) ? data : data.items || []);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!ignore) {
          console.error('Failed to load menu items:', err);
          setError(
            err.response?.data?.message || err.response?.data?.error || 'Failed to load canteen menu from database.'
          );
          setLoading(false);
        }
      });
    return () => {
      ignore = true;
    };
  }, []);

  const categories = useMemo(() => {
    const set = new Set(menuItems.map((i) => i.category).filter(Boolean));
    return ['All', ...Array.from(set)];
  }, [menuItems]);

  const filteredItems = useMemo(() => {
    return menuItems.filter((item) => {
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase().trim());
      const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
      const isAvailable = item.is_available !== false && (item.stock === undefined || item.stock > 0);
      const matchesStock = !inStockOnly || isAvailable;
      return matchesSearch && matchesCategory && matchesStock;
    });
  }, [menuItems, searchTerm, selectedCategory, inStockOnly]);

  if (loading) {
    return (
      <div className="py-24 flex justify-center">
        <LoadingSpinner text="Loading freshly prepared dishes from database..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl p-8 border border-rose-200 text-center max-w-md mx-auto my-12">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
        <h3 className="text-base font-bold text-[#252A27]">Menu Load Error</h3>
        <p className="text-xs text-rose-600 mt-1">{error}</p>
        <button
          onClick={reloadMenu}
          className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-[#245C45] text-white hover:bg-[#1b4634] transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Try Again</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-[#252A27]">Canteen Daily Menu</h1>
          <p className="text-xs text-[#252A27]/70 mt-1">
            Browse today&apos;s verified meals, filter by meal type, and order directly.
          </p>
        </div>

        {/* Search bar */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search dishes (e.g. Thali, Poha)..."
            className="w-full bg-white border border-[#245C45]/20 rounded-xl pl-9 pr-4 py-2 text-xs text-[#252A27] focus:outline-none focus:ring-2 focus:ring-[#245C45]/30"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Filter Pills & Toggles */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <div className="flex flex-wrap items-center gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-[#245C45] text-white shadow-xs'
                  : 'bg-white text-[#252A27]/70 hover:bg-[#E6EFE7]/50 border border-[#245C45]/10'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <label className="inline-flex items-center gap-2 text-xs font-medium text-[#252A27]/80 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={inStockOnly}
            onChange={(e) => setInStockOnly(e.target.checked)}
            className="rounded border-[#245C45]/30 text-[#245C45] focus:ring-[#245C45]/30 w-3.5 h-3.5"
          />
          <Filter className="w-3 h-3 text-[#245C45]" />
          <span>In-Stock Only</span>
        </label>
      </div>

      {/* Menu Cards Grid */}
      {filteredItems.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredItems.map((item) => (
            <MenuItemCard
              key={item.menu_item_id}
              item={item}
              onSelectDetail={(it) => setSelectedItemDetail(it)}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-10 border border-[#245C45]/10 text-center my-6">
          <p className="text-sm font-semibold text-[#252A27]">No dishes found</p>
          <p className="text-xs text-[#252A27]/60 mt-1">
            Try adjusting your search keyword or selected category filter.
          </p>
          <button
            onClick={() => {
              setSearchTerm('');
              setSelectedCategory('All');
              setInStockOnly(false);
            }}
            className="mt-3 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#E6EFE7] text-[#245C45] hover:bg-[#245C45] hover:text-white transition-colors cursor-pointer"
          >
            Clear Filters
          </button>
        </div>
      )}

      {/* Floating Cart Banner */}
      {cartCount > 0 && (
        <div className="fixed bottom-6 right-6 z-40 bg-[#245C45] text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-4 animate-in slide-in-from-bottom duration-200">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5" />
            <div>
              <p className="text-xs font-bold">{cartCount} Item(s) in Cart</p>
              <p className="text-[10px] text-white/80">Subtotal: ₹{cartSubtotal.toFixed(2)}</p>
            </div>
          </div>
          <Link
            to="/student/cart"
            className="px-3.5 py-1.5 rounded-xl bg-white text-[#245C45] text-xs font-bold hover:bg-[#E6EFE7] transition-colors"
          >
            Review & Checkout →
          </Link>
        </div>
      )}

      {/* Detail Modal */}
      {selectedItemDetail && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-[#245C45]/20 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setSelectedItemDetail(null)}
              className="absolute top-4 right-4 p-1.5 text-stone-400 hover:text-stone-700 rounded-full hover:bg-stone-100 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-[#E6EFE7] text-[#245C45]">
              {selectedItemDetail.category}
            </span>
            <h3 className="text-xl font-serif font-bold text-[#252A27] mt-2">
              {selectedItemDetail.name}
            </h3>
            <p className="text-sm font-bold text-[#245C45] mt-1">
              ₹{Number(selectedItemDetail.price).toFixed(2)}
            </p>

            <p className="text-xs text-[#252A27]/70 mt-3 leading-relaxed">
              {selectedItemDetail.description ||
                'Prepared fresh daily under standard canteen quality benchmarks. Nutritious, hot, and hygienic.'}
            </p>

            <div className="bg-[#F8F7F2] rounded-xl p-3 border border-[#245C45]/10 mt-4 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-[#252A27]/60">Item ID:</span>
                <span className="font-semibold text-[#252A27]">#{selectedItemDetail.menu_item_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#252A27]/60">Status:</span>
                <span className="font-semibold text-emerald-700">Available for Canteen Pre-order</span>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedItemDetail(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#245C45] text-white hover:bg-[#1b4634] transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
