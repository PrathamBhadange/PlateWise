import { useState, useEffect, useCallback } from 'react';
import {
  BookOpen,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Search,
  Sparkles,
  Utensils,
} from 'lucide-react';
import { getKitchenMenu, updateMenuItemAvailability } from '../../services/member4Api';

export default function KitchenMenuView() {
  const [menuItems, setMenuItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [errorNotice, setErrorNotice] = useState(null);

  const fetchMenu = useCallback(async () => {
    try {
      const items = await getKitchenMenu();
      setMenuItems(items || []);
    } catch (err) {
      console.error('[KitchenMenuView] Error fetching menu items:', err);
      setErrorNotice(err.response?.data?.message || err.message || 'Failed to load canteen menu items.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const items = await getKitchenMenu();
        if (active) {
          setMenuItems(items || []);
          setIsLoading(false);
        }
      } catch (err) {
        if (active) {
          console.error('[KitchenMenuView] Error fetching menu items:', err);
          setErrorNotice(err.response?.data?.message || err.message || 'Failed to load canteen menu items.');
          setIsLoading(false);
        }
      }
    }

    load();

    return () => {
      active = false;
    };
  }, []);

  // Extract unique categories
  const categories = ['All', ...Array.from(new Set(menuItems.map((i) => i.category).filter(Boolean)))];

  const filteredItems = menuItems.filter((item) => {
    const matchesCat = selectedCategory === 'All' || item.category === selectedCategory;
    const q = searchTerm.toLowerCase().trim();
    const matchesSearch = !q || item.name.toLowerCase().includes(q) || item.category.toLowerCase().includes(q);
    return matchesCat && matchesSearch;
  });

  const handleToggle = async (item) => {
    const targetAvail = !item.is_available;
    setUpdatingId(item.menu_item_id);
    setFeedback(null);
    setErrorNotice(null);

    // Optimistic UI update
    const previous = [...menuItems];
    setMenuItems((prev) =>
      prev.map((i) =>
        i.menu_item_id === item.menu_item_id
          ? { ...i, is_available: targetAvail, available: targetAvail }
          : i
      )
    );

    try {
      const res = await updateMenuItemAvailability(item.menu_item_id, targetAvail);
      setFeedback({
        message: res.message || `Menu item "${item.name}" availability updated successfully.`,
      });
      setTimeout(() => setFeedback(null), 4000);
    } catch (err) {
      // Revert optimistic update
      setMenuItems(previous);
      const errMsg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        'Failed to update menu item availability.';
      setErrorNotice(errMsg);
      setTimeout(() => setErrorNotice(null), 6000);
    } finally {
      setUpdatingId(null);
    }
  };

  const activeCount = menuItems.filter((i) => i.is_available).length;
  const soldOutCount = menuItems.length - activeCount;

  return (
    <div className="space-y-6 text-left">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#252A27]">
              Kitchen Menu Management
            </h1>
            <span className="text-[10px] font-semibold text-[#245C45] bg-[#E6EFE7] px-2.5 py-0.5 rounded-full border border-[#245C45]/20">
              Live Canteen Availability
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#252A27]/75 mt-0.5">
            Toggle live dish availability in MySQL. Unavailable dishes are instantly blocked from student checkout.
          </p>
        </div>

        {/* Search & Actions */}
        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-56">
            <Search className="w-3.5 h-3.5 text-[#245C45]/60 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search dishes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-white border border-[#245C45]/20 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#245C45]"
            />
          </div>

          <button
            type="button"
            onClick={fetchMenu}
            className="p-2 rounded-xl bg-white border border-[#245C45]/15 text-[#245C45] hover:bg-[#E6EFE7] transition-all cursor-pointer shadow-2xs"
            title="Refresh Menu"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Sync & Inventory Overview Pills */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3.5 rounded-2xl bg-white border border-[#245C45]/15 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-[#252A27]/60 block">Total Menu Items</span>
            <span className="text-xl font-bold font-serif text-[#252A27]">{menuItems.length}</span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-[#E6EFE7] text-[#245C45] flex items-center justify-center">
            <BookOpen className="w-4.5 h-4.5" />
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-[#245C45]/15 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-[#252A27]/60 block">Live on Student App</span>
            <span className="text-xl font-bold font-serif text-[#245C45]">{activeCount}</span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <CheckCircle2 className="w-4.5 h-4.5" />
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-[#245C45]/15 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-[#252A27]/60 block">Sold Out / Batch Closed</span>
            <span className="text-xl font-bold font-serif text-rose-700">{soldOutCount}</span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center">
            <AlertCircle className="w-4.5 h-4.5" />
          </div>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto py-1">
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
              selectedCategory === cat
                ? 'bg-[#245C45] text-white shadow-xs'
                : 'bg-white border border-[#245C45]/15 text-[#252A27]/75 hover:bg-[#E6EFE7]'
            }`}
          >
            {cat} {cat === 'All' ? `(${menuItems.length})` : `(${menuItems.filter((i) => i.category === cat).length})`}
          </button>
        ))}
      </div>

      {/* Feedback & Error Notices */}
      {feedback && (
        <div className="p-3 rounded-xl bg-[#E6EFE7] border border-[#245C45]/30 text-xs text-[#245C45] font-semibold flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#E99A55] flex-shrink-0" />
          <span>{feedback.message}</span>
        </div>
      )}

      {errorNotice && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          <span>{errorNotice}</span>
        </div>
      )}

      {/* Menu Cards */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#245C45]/15 shadow-2xs space-y-3">
        {isLoading ? (
          <div className="py-12 text-center text-xs text-[#252A27]/50 flex flex-col items-center justify-center">
            <RefreshCw className="w-6 h-6 animate-spin text-[#245C45] mb-2" />
            <span>Loading dishes from MySQL menu database...</span>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="py-8 text-center text-xs text-[#252A27]/60">
            No dishes match the selected filter.
          </div>
        ) : (
          filteredItems.map((item) => {
            const isUpdating = updatingId === item.menu_item_id;

            return (
              <div
                key={item.menu_item_id}
                className="p-4 rounded-2xl bg-[#F8F7F2] border border-[#245C45]/10 hover:border-[#245C45]/25 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3.5"
              >
                {/* Left: Dish Information */}
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white border border-[#245C45]/15 flex items-center justify-center text-[#245C45] flex-shrink-0 shadow-2xs">
                    <Utensils className="w-4.5 h-4.5" />
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-sm text-[#252A27]">{item.name}</h3>
                      <span className="text-xs font-semibold text-[#245C45]">
                        ₹{item.price}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                          item.is_available
                            ? 'bg-[#E6EFE7] text-[#245C45] border-[#245C45]/20'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}
                      >
                        {item.is_available ? 'Live on Student App' : 'Sold Out / Unavailable'}
                      </span>
                    </div>

                    <p className="text-xs text-[#252A27]/65 mt-0.5">
                      Category: <span className="font-semibold text-[#252A27]">{item.category}</span> ·{' '}
                      Prep Capacity: {item.prepared}/{item.maxPortions} portions
                    </p>
                  </div>
                </div>

                {/* Right: Availability Toggle Button */}
                <div className="flex items-center gap-2.5 self-start sm:self-center flex-shrink-0">
                  <button
                    type="button"
                    disabled={isUpdating}
                    onClick={() => handleToggle(item)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs active:scale-[0.98] disabled:opacity-60 ${
                      item.is_available
                        ? 'bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200'
                        : 'bg-[#245C45] text-white hover:bg-[#164B38] border border-[#245C45]'
                    }`}
                  >
                    {isUpdating ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : item.is_available ? (
                      <AlertCircle className="w-3.5 h-3.5 text-rose-700" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#E99A55]" />
                    )}
                    <span>{item.is_available ? 'Mark as Sold Out' : 'Restore to Student Menu'}</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="pt-2 text-center text-[10px] text-[#252A27]/60">
        * Menu availability status is persisted directly in MySQL table <code>menu_items.is_available</code>. Toggling does not delete items or modify past order receipts.
      </div>
    </div>
  );
}
