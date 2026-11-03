import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShoppingBag,
  Clock,
  Zap,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Sparkles,
  TrendingDown,
  ShieldCheck,
  Search,
  X,
  Flame,
  ArrowRight,
  Plus,
  Minus,
} from 'lucide-react';
import {
  getStudentSurplusDeals,
  getPickupSlots,
  placeStudentOrder,
} from '../../services/studentApi';
import LoadingSpinner from '../../components/dashboard/LoadingSpinner';
import { useCart } from '../../context/useCart';

export default function StudentSurplus() {
  const navigate = useNavigate();
  const { addToCart, cartCount } = useCart();

  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [toastMessage, setToastMessage] = useState('');

  // Instant Claim Modal State
  const [claimingDeal, setClaimingDeal] = useState(null);
  const [claimQty, setClaimQty] = useState(1);
  const [claimSlot, setClaimSlot] = useState('');
  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [isSubmittingClaim, setIsSubmittingClaim] = useState(false);
  const [claimError, setClaimError] = useState('');
  const [claimSuccess, setClaimSuccess] = useState(null);

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  const loadDeals = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getStudentSurplusDeals();
      setDeals(Array.isArray(data.deals) ? data.deals : []);
    } catch (err) {
      console.error('Failed to load surplus deals:', err);
      setError(
        err.response?.data?.message ||
          err.response?.data?.error ||
          'Failed to load active surplus deals from cafeteria database.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDeals();
  }, [loadDeals]);

  // Toast auto-dismiss
  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(''), 3000);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  const categories = useMemo(() => {
    const set = new Set(deals.map((d) => d.category).filter(Boolean));
    return ['All', ...Array.from(set)];
  }, [deals]);

  const filteredDeals = useMemo(() => {
    return deals.filter((deal) => {
      const matchesSearch = deal.name.toLowerCase().includes(searchTerm.toLowerCase().trim());
      const matchesCategory = selectedCategory === 'All' || deal.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [deals, searchTerm, selectedCategory]);

  const totalSavingsPossible = useMemo(() => {
    return deals.reduce((acc, d) => acc + (d.savings || 0) * (d.available_portions || 0), 0);
  }, [deals]);

  // Handle Add To Cart
  const handleAddToCart = (deal) => {
    addToCart(
      {
        menu_item_id: deal.menu_item_id,
        name: deal.name,
        category: deal.category,
        price: deal.surplus_price,
        original_price: deal.original_price,
        is_surplus: true,
        food_batch_id: deal.food_batch_id,
        stock: deal.available_portions,
      },
      1
    );
    setToastMessage(`Added 1x ${deal.name} to tray at ₹${deal.surplus_price.toFixed(2)} (40% OFF)!`);
  };

  // Open Instant Claim Modal
  const handleOpenClaim = async (deal) => {
    setClaimingDeal(deal);
    setClaimQty(1);
    setClaimError('');
    setClaimSuccess(null);
    setSlotsLoading(true);

    try {
      const data = await getPickupSlots(todayStr);
      const slotList = Array.isArray(data) ? data : data.slots || [];
      setSlots(slotList);

      const firstAvail = slotList.find((s) => !s.is_full && !s.is_past);
      setClaimSlot(firstAvail ? firstAvail.slot : '12:30 PM - 01:00 PM');
    } catch (err) {
      console.error('Failed to load pickup slots:', err);
      setClaimSlot('12:30 PM - 01:00 PM');
    } finally {
      setSlotsLoading(false);
    }
  };

  // Submit Instant Claim
  const handleConfirmClaim = async (e) => {
    e.preventDefault();
    if (!claimingDeal) return;
    if (!claimSlot) {
      setClaimError('Please select a valid pickup window.');
      return;
    }

    setIsSubmittingClaim(true);
    setClaimError('');

    const idempotencyKey = `surplus_${claimingDeal.food_batch_id}_${Date.now()}`;
    try {
      const payload = {
        items: [
          {
            menu_item_id: claimingDeal.menu_item_id,
            quantity: claimQty,
            is_surplus: true,
            food_batch_id: claimingDeal.food_batch_id,
          },
        ],
        pickup_slot: claimSlot,
        pickup_date: todayStr,
        idempotency_key: idempotencyKey,
        payment_method: 'upi_simulated',
      };

      const res = await placeStudentOrder(payload);
      setClaimSuccess(res.order || { order_id: res.order_id, pickup_token: res.pickup_token });
      loadDeals(); // Reload live remaining portions
    } catch (err) {
      console.error('Instant claim error:', err);
      setClaimError(
        err.response?.data?.message ||
          err.response?.data?.error ||
          'Failed to complete surplus claim transaction.'
      );
    } finally {
      setIsSubmittingClaim(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 flex justify-center">
        <LoadingSpinner text="Scanning cafeteria kitchen for live surplus batches..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl p-8 border border-rose-200 text-center max-w-md mx-auto my-12">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
        <h3 className="text-base font-bold text-[#252A27]">Surplus Deals Unavailable</h3>
        <p className="text-xs text-rose-600 mt-1">{error}</p>
        <button
          onClick={loadDeals}
          className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-[#245C45] text-white hover:bg-[#1b4634] transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Try Again</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#245C45] text-white text-xs font-semibold px-4 py-3 rounded-2xl shadow-lg border border-white/20 flex items-center gap-2.5 animate-bounce-short">
          <CheckCircle2 className="w-4 h-4 text-emerald-300" />
          <span>{toastMessage}</span>
          <Link
            to="/student/cart"
            className="underline text-emerald-200 hover:text-white ml-2 text-[11px]"
          >
            Go to Tray ({cartCount}) →
          </Link>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-serif font-bold text-[#252A27]">Flash Surplus Deals</h1>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full">
              <Flame className="w-3 h-3 text-amber-600" /> 40% Flat Discount
            </span>
          </div>
          <p className="text-xs text-[#252A27]/70 mt-1">
            Pre-order discounted end-of-service cafeteria portions to prevent freshly cooked food from being discarded.
          </p>
        </div>

        {/* Quick Cart Pill Link */}
        {cartCount > 0 && (
          <Link
            to="/student/cart"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#245C45] hover:bg-[#1b4634] text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer w-fit"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>View Tray ({cartCount} item{cartCount > 1 ? 's' : ''})</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        )}
      </div>

      {/* Quick Metrics Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-[#245C45]/15 shadow-xs flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-50 text-amber-700">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-[#252A27]/50 block">Live Deals</span>
            <span className="text-lg font-bold font-serif text-[#252A27]">
              {deals.length} Dishes Available
            </span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#245C45]/15 shadow-xs flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700">
            <TrendingDown className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-[#252A27]/50 block">Student Subsidy</span>
            <span className="text-lg font-bold font-serif text-[#245C45]">
              40% Off Catalog Price
            </span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#245C45]/15 shadow-xs flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[#E6EFE7] text-[#245C45]">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-[#252A27]/50 block">Zero Waste Mission</span>
            <span className="text-lg font-bold font-serif text-[#252A27]">
              ₹{totalSavingsPossible.toFixed(0)} Community Value
            </span>
          </div>
        </div>
      </div>

      {/* Search & Category Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
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

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search surplus deals..."
            className="w-full bg-white border border-[#245C45]/20 rounded-xl pl-9 pr-8 py-2 text-xs text-[#252A27] focus:outline-none focus:ring-2 focus:ring-[#245C45]/30"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Deals Grid */}
      {filteredDeals.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDeals.map((deal) => {
            return (
              <div
                key={deal.deal_id}
                className="bg-white rounded-3xl p-5 border border-[#245C45]/15 shadow-xs flex flex-col justify-between hover:shadow-md transition-all duration-200 group"
              >
                <div className="space-y-3">
                  {/* Top Badges */}
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-[#245C45] bg-[#E6EFE7] px-2 py-0.5 rounded-md">
                      {deal.category}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-md">
                      <Flame className="w-3 h-3 text-rose-600" />
                      Save ₹{deal.savings.toFixed(2)}
                    </span>
                  </div>

                  {/* Title & Batch Info */}
                  <div>
                    <h3 className="text-base font-serif font-bold text-[#252A27] group-hover:text-[#245C45] transition-colors">
                      {deal.name}
                    </h3>
                    <p className="text-[11px] text-[#252A27]/60 mt-0.5 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-stone-400" />
                      <span>{deal.pickup_window}</span>
                    </p>
                  </div>

                  {/* Price Section */}
                  <div className="bg-[#F8F7F2] p-3 rounded-2xl border border-[#245C45]/10 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-[#252A27]/50 block uppercase font-semibold">
                        Surplus Price
                      </span>
                      <div className="flex items-baseline gap-2">
                        <span className="text-lg font-bold text-[#245C45]">
                          ₹{deal.surplus_price.toFixed(2)}
                        </span>
                        <span className="text-xs text-[#252A27]/40 line-through">
                          ₹{deal.original_price.toFixed(2)}
                        </span>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-amber-800 bg-amber-100/80 px-2.5 py-1 rounded-xl">
                      -40% OFF
                    </span>
                  </div>

                  {/* Remaining Portions Counter */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-[#252A27]/60 font-medium">Available to rescue:</span>
                      <span className="font-bold text-[#252A27]">
                        {deal.available_portions} portions left
                      </span>
                    </div>
                    <div className="w-full bg-stone-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-[#245C45] h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min(100, Math.max(15, (deal.available_portions / 50) * 100))}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="grid grid-cols-2 gap-2 pt-4 border-t border-stone-100 mt-4">
                  <button
                    type="button"
                    onClick={() => handleAddToCart(deal)}
                    className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold border border-[#245C45]/30 text-[#245C45] hover:bg-[#E6EFE7]/50 transition-colors cursor-pointer"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>Add to Tray</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenClaim(deal)}
                    className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold bg-[#245C45] hover:bg-[#1b4634] text-white transition-colors cursor-pointer shadow-xs"
                  >
                    <Zap className="w-3.5 h-3.5 text-amber-300" />
                    <span>Claim Deal</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-3xl p-12 border border-[#245C45]/15 text-center space-y-4 max-w-lg mx-auto">
          <div className="w-12 h-12 rounded-full bg-[#E6EFE7] text-[#245C45] flex items-center justify-center mx-auto">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-serif font-bold text-base text-[#252A27]">
              No Active Surplus Deals At This Moment
            </h3>
            <p className="text-xs text-[#252A27]/60 mt-1 max-w-sm mx-auto leading-relaxed">
              Cafeteria kitchen staff post flash surplus batches near the conclusion of meal windows (around 2:00 PM and 8:00 PM). Please check back soon or browse the regular menu.
            </p>
          </div>
          <Link
            to="/student/menu"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-[#245C45] text-white hover:bg-[#1b4634] transition-colors"
          >
            <span>Browse Full Canteen Menu</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* Explanatory Policy Card (Maintains Knowledge Integrity) */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#245C45]/15 shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-[#245C45]/10">
          <Sparkles className="w-4 h-4 text-[#245C45]" />
          <h3 className="font-serif font-bold text-sm text-[#252A27]">
            How PlateWise Zero-Waste Flash Deals Work
          </h3>
        </div>
        <p className="text-xs text-[#252A27]/70 leading-relaxed">
          At the conclusion of each dining service window, the canteen kitchen inventories unsold prepared dishes. In alignment with our campus zero-waste policy, remaining high-quality portions are made available at a standard <strong>40% discount</strong> directly to students.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
          <div className="bg-[#F8F7F2] p-3.5 rounded-2xl border border-[#245C45]/10 flex items-start gap-2.5">
            <Clock className="w-4 h-4 text-[#245C45] shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-[#252A27] block">Fixed Pickup Deadlines</span>
              <span className="text-[11px] text-[#252A27]/60 leading-tight block mt-0.5">
                Surplus orders must be collected during the designated afternoon or evening service window.
              </span>
            </div>
          </div>
          <div className="bg-[#F8F7F2] p-3.5 rounded-2xl border border-[#245C45]/10 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-[#245C45] shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-[#252A27] block">Quality Guaranteed</span>
              <span className="text-[11px] text-[#252A27]/60 leading-tight block mt-0.5">
                Cooked the same day under strict cafeteria hygiene standards and warm storage conditions.
              </span>
            </div>
          </div>
          <div className="bg-[#F8F7F2] p-3.5 rounded-2xl border border-[#245C45]/10 flex items-start gap-2.5">
            <ShoppingBag className="w-4 h-4 text-[#245C45] shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-[#252A27] block">Priority Pickup Token</span>
              <span className="text-[11px] text-[#252A27]/60 leading-tight block mt-0.5">
                Present your digital token at Counter 2 for fast handoff without waiting in standard lunch queues.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Instant Claim Dialog Modal */}
      {claimingDeal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full border border-[#245C45]/20 shadow-2xl overflow-hidden animate-fade-in">
            {/* Modal Header */}
            <div className="p-5 bg-[#F8F7F2] border-b border-[#245C45]/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-[#E6EFE7] text-[#245C45]">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-sm text-[#252A27]">
                    {claimSuccess ? 'Deal Claimed Successfully' : 'Instant Surplus Claim'}
                  </h3>
                  <span className="text-[11px] text-[#252A27]/60">
                    {claimingDeal.name}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setClaimingDeal(null)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-200 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            {claimSuccess ? (
              <div className="p-6 space-y-5 text-center">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-7 h-7" />
                </div>

                <div>
                  <h4 className="font-serif font-bold text-base text-[#252A27]">
                    Surplus Order Confirmed!
                  </h4>
                  <p className="text-xs text-[#252A27]/70 mt-1">
                    Your portion has been reserved at the cafeteria counter.
                  </p>
                </div>

                {/* Pickup Token Card */}
                <div className="bg-[#F8F7F2] p-4 rounded-2xl border border-[#245C45]/15 space-y-2">
                  <span className="text-[10px] uppercase font-bold text-[#245C45] tracking-wider block">
                    Your Pickup Token
                  </span>
                  <div className="text-2xl font-mono font-bold text-[#245C45]">
                    {claimSuccess.pickup_token || `#B-${claimSuccess.order_id}`}
                  </div>
                  <div className="text-xs text-[#252A27]/70 pt-1 border-t border-[#245C45]/10">
                    Slot: <strong className="text-[#252A27]">{claimSuccess.pickup_slot || claimSlot}</strong>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setClaimingDeal(null);
                      navigate('/student/orders');
                    }}
                    className="flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold bg-[#245C45] hover:bg-[#1b4634] text-white transition-colors cursor-pointer"
                  >
                    View in My Orders →
                  </button>
                  <button
                    type="button"
                    onClick={() => setClaimingDeal(null)}
                    className="py-2.5 px-4 rounded-xl text-xs font-semibold bg-stone-100 hover:bg-stone-200 text-[#252A27] transition-colors cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleConfirmClaim} className="p-5 space-y-4 text-xs">
                {claimError && (
                  <div className="bg-rose-50 border border-rose-200 text-rose-800 p-2.5 rounded-xl text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                    <span>{claimError}</span>
                  </div>
                )}

                {/* Deal Price Summary */}
                <div className="bg-[#F8F7F2] p-3.5 rounded-2xl border border-[#245C45]/10 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-[#252A27]/50 block">Per Portion Price</span>
                    <span className="text-base font-bold text-[#245C45]">
                      ₹{claimingDeal.surplus_price.toFixed(2)}
                    </span>
                    <span className="text-[11px] text-[#252A27]/40 line-through ml-1.5">
                      ₹{claimingDeal.original_price.toFixed(2)}
                    </span>
                  </div>
                  <span className="text-[11px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-lg">
                    40% Discount Applied
                  </span>
                </div>

                {/* Quantity Stepper */}
                <div>
                  <label className="block text-[#252A27]/70 font-semibold mb-1">
                    Select Portions:
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-[#F8F7F2] rounded-xl px-2.5 py-1.5 border border-[#245C45]/20">
                      <button
                        type="button"
                        onClick={() => setClaimQty((q) => Math.max(1, q - 1))}
                        disabled={claimQty <= 1}
                        className="p-1 rounded text-[#245C45] hover:bg-white transition-colors cursor-pointer disabled:opacity-30"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-xs font-bold text-[#252A27] w-6 text-center">{claimQty}</span>
                      <button
                        type="button"
                        onClick={() => setClaimQty((q) => Math.min(claimingDeal.available_portions, q + 1))}
                        disabled={claimQty >= claimingDeal.available_portions}
                        className="p-1 rounded text-[#245C45] hover:bg-white transition-colors cursor-pointer disabled:opacity-30"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <span className="text-[11px] text-[#252A27]/50">
                      Max {claimingDeal.available_portions} available
                    </span>
                  </div>
                </div>

                {/* Pickup Window Selection */}
                <div>
                  <label className="block text-[#252A27]/70 font-semibold mb-1">
                    Pickup Window (Today):
                  </label>
                  {slotsLoading ? (
                    <div className="text-xs text-[#252A27]/50 py-1">Loading real-time slots...</div>
                  ) : (
                    <select
                      value={claimSlot}
                      onChange={(e) => setClaimSlot(e.target.value)}
                      className="w-full bg-[#F8F7F2] border border-[#245C45]/20 rounded-xl px-3 py-2 text-xs text-[#252A27] focus:outline-none focus:ring-2 focus:ring-[#245C45]/30"
                      required
                    >
                      {slots.length > 0 ? (
                        slots.map((s) => (
                          <option
                            key={s.slot_id || s.slot}
                            value={s.slot}
                            disabled={s.is_full || s.is_past}
                          >
                            {s.slot} {s.is_full ? '(Full)' : s.is_past ? '(Passed)' : `(${s.available_capacity ?? s.remaining_capacity ?? 'Available'})`}
                          </option>
                        ))
                      ) : (
                        <option value="12:30 PM - 01:00 PM">12:30 PM - 01:00 PM</option>
                      )}
                    </select>
                  )}
                </div>

                {/* Total & Action */}
                <div className="pt-2 border-t border-stone-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-[#252A27]/50 block">Total Payable</span>
                    <span className="text-base font-bold text-[#245C45]">
                      ₹{(claimingDeal.surplus_price * claimQty).toFixed(2)}
                    </span>
                    <span className="text-[10px] text-emerald-700 block">
                      You save ₹{(claimingDeal.savings * claimQty).toFixed(2)}!
                    </span>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingClaim}
                    className="py-2.5 px-4 rounded-xl text-xs font-semibold bg-[#245C45] hover:bg-[#1b4634] text-white transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Zap className="w-3.5 h-3.5 text-amber-300" />
                    <span>{isSubmittingClaim ? 'Reserving...' : 'Confirm Claim'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
