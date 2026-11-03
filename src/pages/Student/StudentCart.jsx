import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShoppingBag,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  Zap,
  HeartHandshake,
} from 'lucide-react';
import { useCart } from '../../context/useCart';
import CartItem from '../../components/student/CartItem';
import EmptyState from '../../components/student/EmptyState';
import {
  placeStudentOrder,
  getPickupSlots,
  getAvailableCommunityCredits,
} from '../../services/studentApi';

export default function StudentCart() {
  const { items, cartSubtotal, clearCart } = useCart();
  const navigate = useNavigate();

  const [pickupDate, setPickupDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [pickupSlot, setPickupSlot] = useState('');
  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(true);
  const [slotError, setSlotError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [orderConfirmation, setOrderConfirmation] = useState(null);

  // Community Meal Credit Pool state
  const [availablePoolCredits, setAvailablePoolCredits] = useState(0);
  const [, setAvailablePoolBalance] = useState(0);
  const [mealUnitPrice, setMealUnitPrice] = useState(40);
  const [creditsLoading, setCreditsLoading] = useState(true);
  const [applyCredits, setApplyCredits] = useState(false);
  const [redeemCredits, setRedeemCredits] = useState(1);

  // Fetch live community meal credits
  useEffect(() => {
    let ignore = false;
    getAvailableCommunityCredits()
      .then((data) => {
        if (!ignore) {
          setAvailablePoolCredits(Number(data.meals_available || 0));
          setAvailablePoolBalance(Number(data.available_pool_balance || 0));
          setMealUnitPrice(Number(data.meal_unit_price || 40));
          setCreditsLoading(false);
        }
      })
      .catch((err) => {
        if (!ignore) {
          console.error('Failed to load community meal credits:', err);
          setCreditsLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, []);

  const fetchSlots = useCallback(async (date) => {
    setSlotsLoading(true);
    setSlotError('');
    try {
      const data = await getPickupSlots(date);
      const slotList = Array.isArray(data) ? data : data.slots || [];
      setSlots(slotList);

      setPickupSlot((current) => {
        const stillAvailable = slotList.find(
          (s) => s.slot === current && !s.is_full && !s.is_past
        );
        if (stillAvailable) return current;

        const firstAvailable = slotList.find((s) => !s.is_full && !s.is_past);
        return firstAvailable ? firstAvailable.slot : '';
      });
    } catch (err) {
      console.error('Failed to load pickup slots:', err);
      setSlotError(
        err.response?.data?.message || err.response?.data?.error || 'Failed to load real-time slot availability.'
      );
      setSlots([]);
      setPickupSlot('');
    } finally {
      setSlotsLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    getPickupSlots(pickupDate)
      .then((data) => {
        if (!ignore) {
          const slotList = Array.isArray(data) ? data : data.slots || [];
          setSlots(slotList);
          setSlotsLoading(false);
          setSlotError('');

          setPickupSlot((current) => {
            const stillAvailable = slotList.find(
              (s) => s.slot === current && !s.is_full && !s.is_past
            );
            if (stillAvailable) return current;
            const firstAvailable = slotList.find((s) => !s.is_full && !s.is_past);
            return firstAvailable ? firstAvailable.slot : '';
          });
        }
      })
      .catch((err) => {
        if (!ignore) {
          console.error('Failed to load pickup slots:', err);
          setSlotError(
            err.response?.data?.message || err.response?.data?.error || 'Failed to load real-time slot availability.'
          );
          setSlots([]);
          setPickupSlot('');
          setSlotsLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [pickupDate]);

  const selectedSlotData = slots.find((s) => s.slot === pickupSlot);
  const hasAvailableSlots = slots.some((s) => !s.is_full && !s.is_past);

  // Credit calculations
  const maxEligibleCredits = Math.floor(cartSubtotal / mealUnitPrice);
  const maxRedeemableCredits = Math.min(maxEligibleCredits, availablePoolCredits);

  const effectiveRedeemCredits =
    applyCredits && maxRedeemableCredits > 0
      ? Math.min(Math.max(1, redeemCredits), maxRedeemableCredits)
      : 0;

  const creditDiscount = parseFloat((effectiveRedeemCredits * mealUnitPrice).toFixed(2));
  const finalPayable = Math.max(0, parseFloat((cartSubtotal - creditDiscount).toFixed(2)));
  const isFullyCreditFunded = effectiveRedeemCredits > 0 && finalPayable === 0;

  const handleCheckout = async (e) => {
    e.preventDefault();
    if (items.length === 0) return;
    if (!pickupSlot) {
      setError('Please select an available pickup window before confirming your order.');
      return;
    }
    setError('');
    setIsSubmitting(true);

    // Client idempotency key to prevent double submissions
    const idempotencyKey = `order_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    try {
      const payload = {
        items: items.map((i) => ({
          menu_item_id: i.menu_item_id,
          quantity: i.quantity,
          is_surplus: Boolean(i.is_surplus),
          food_batch_id: i.food_batch_id || null,
        })),
        pickup_slot: pickupSlot,
        pickup_date: pickupDate,
        idempotency_key: idempotencyKey,
        redeem_credits: effectiveRedeemCredits,
        payment_method: isFullyCreditFunded ? 'credit_funded' : 'upi_simulated',
      };

      const res = await placeStudentOrder(payload);
      setOrderConfirmation(res.order || { order_id: res.order_id });
      clearCart();
    } catch (err) {
      console.error('Checkout error:', err);
      const errorCode = err.response?.data?.code;
      const errorMsg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        'Failed to complete order transaction. Please review your cart and retry.';

      setError(errorMsg);

      // Refresh slot or credit availability if conflict occurred
      if (errorCode === 'SLOT_FULL' || err.response?.status === 409) {
        fetchSlots(pickupDate);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // If order was just placed, display verified confirmation modal/screen
  if (orderConfirmation) {
    return (
      <div className="bg-white rounded-3xl p-8 border border-[#245C45]/20 max-w-lg mx-auto my-10 text-center shadow-lg animate-in zoom-in-95 duration-200">
        <div className="w-16 h-16 rounded-full bg-[#E6EFE7] text-[#245C45] flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-9 h-9" />
        </div>
        <span className="text-xs font-bold uppercase tracking-wider text-[#245C45] bg-[#E6EFE7] px-3 py-1 rounded-full">
          Order Verified & Placed
        </span>
        <h2 className="text-2xl font-serif font-bold text-[#252A27] mt-3">
          Order #{orderConfirmation.order_id} Confirmed!
        </h2>
        <p className="text-xs text-[#252A27]/70 mt-2 max-w-sm mx-auto leading-relaxed">
          Your order has been recorded into the canteen system. The kitchen will prepare it for your scheduled pickup slot.
        </p>

        {/* Prominent Pickup Token Display */}
        {orderConfirmation.pickup_token && (
          <div className="bg-[#E6EFE7]/60 rounded-2xl p-4 border border-[#245C45]/20 my-4 text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#245C45] block">
              PICKUP TOKEN
            </span>
            <span className="text-3xl sm:text-4xl font-serif font-black text-[#245C45] mt-0.5 block tracking-tight">
              {orderConfirmation.pickup_token}
            </span>
            <span className="text-[11px] text-[#252A27]/60 mt-1 block">
              Present this token at the counter during your pickup window
            </span>
          </div>
        )}

        <div className="bg-[#F8F7F2] rounded-2xl p-4 border border-[#245C45]/15 my-4 text-left text-xs space-y-2">
          <div className="flex justify-between">
            <span className="text-[#252A27]/60">Pickup Slot:</span>
            <span className="font-semibold text-[#252A27]">{orderConfirmation.pickup_slot || pickupSlot}</span>
          </div>
          {orderConfirmation.discount_amount > 0 && (
            <div className="flex justify-between text-[#245C45]">
              <span>Community Credits:</span>
              <span className="font-semibold">
                -{orderConfirmation.redeemed_credits || Math.round(orderConfirmation.discount_amount / 40)} credit(s) (-₹{Number(orderConfirmation.discount_amount).toFixed(2)})
              </span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-[#252A27]/60">Final Payable:</span>
            <span className="font-bold text-[#252A27]">
              {Number(orderConfirmation.final_amount) === 0 ? '₹0.00 (100% Funded)' : `₹${Number(orderConfirmation.final_amount).toFixed(2)}`}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#252A27]/60">Payment Mode:</span>
            <span className="font-semibold text-[#245C45]">
              {orderConfirmation.payment_method === 'credit_funded'
                ? 'Community Meal Credit Pool'
                : 'Demo / Manual Payment (Canteen Counter)'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#252A27]/60">Status:</span>
            <span className="font-semibold text-amber-700">{orderConfirmation.status || 'Pending'}</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            type="button"
            onClick={() => navigate('/student/orders')}
            className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-[#245C45] text-white hover:bg-[#1b4634] transition-colors cursor-pointer shadow-xs"
          >
            Track in My Orders →
          </button>
          <button
            type="button"
            onClick={() => {
              setOrderConfirmation(null);
              navigate('/student/menu');
            }}
            className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-stone-100 text-[#252A27] hover:bg-stone-200 transition-colors cursor-pointer"
          >
            Order More Food
          </button>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={ShoppingBag}
        title="Your Canteen Cart is Empty"
        description="Explore today's freshly prepared campus dishes and add nutritious items to your tray."
        actionText="Explore Daily Menu"
        actionLink="/student/menu"
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-serif font-bold text-[#252A27]">My Canteen Tray</h1>
        <p className="text-xs text-[#252A27]/70 mt-1">
          Review your selected meals, select your pickup slot, and confirm your order.
        </p>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-2xl flex items-center gap-3 text-xs">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <div>
            <p className="font-bold">Order Error</p>
            <p className="mt-0.5">{error}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cart items list (2 cols) */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-bold uppercase text-[#252A27]/60 tracking-wider">
              {items.length} Distinct Dish{items.length > 1 ? 'es' : ''}
            </span>
            <Link to="/student/menu" className="text-xs font-semibold text-[#245C45] hover:underline">
              + Add More Dishes
            </Link>
          </div>

          <div className="space-y-3">
            {items.map((item) => (
              <CartItem key={item.menu_item_id} item={item} />
            ))}
          </div>
        </div>

        {/* Order Summary & Checkout sidebar (1 col) */}
        <div className="bg-white rounded-3xl p-6 border border-[#245C45]/15 shadow-xs flex flex-col justify-between h-fit">
          <form onSubmit={handleCheckout} className="space-y-4">
            <h3 className="text-base font-serif font-bold text-[#252A27] pb-3 border-b border-[#245C45]/10">
              Order Summary
            </h3>

            {/* Pickup Date & Slot */}
            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[#252A27]/70 font-semibold mb-1 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#245C45]" />
                  Pickup Date
                </label>
                <input
                  type="date"
                  value={pickupDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setPickupDate(e.target.value)}
                  className="w-full bg-[#F8F7F2] border border-[#245C45]/20 rounded-xl px-3 py-2 text-xs text-[#252A27] focus:outline-none focus:ring-2 focus:ring-[#245C45]/30 font-medium"
                />
              </div>

              <div>
                <label className="text-[#252A27]/70 font-semibold mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#245C45]" />
                    Select Pickup Window
                  </span>
                  {slotsLoading && (
                    <span className="text-[10px] text-[#245C45] font-normal animate-pulse">
                      Checking capacity...
                    </span>
                  )}
                </label>

                {slotError && (
                  <p className="text-[11px] text-rose-600 mb-1.5">{slotError}</p>
                )}

                <select
                  value={pickupSlot}
                  disabled={slotsLoading || slots.length === 0}
                  onChange={(e) => setPickupSlot(e.target.value)}
                  className="w-full bg-[#F8F7F2] border border-[#245C45]/20 rounded-xl px-3 py-2 text-xs text-[#252A27] focus:outline-none focus:ring-2 focus:ring-[#245C45]/30 font-medium disabled:opacity-60"
                >
                  {slots.length === 0 && !slotsLoading && (
                    <option value="">No pickup windows configured</option>
                  )}
                  {slots.map((s) => {
                    const isDisabled = s.is_full || s.is_past;
                    let labelSuffix;
                    if (s.is_past) {
                      labelSuffix = '— Past Window';
                    } else if (s.is_full) {
                      labelSuffix = '— Full (0 spots)';
                    } else if (s.status === 'filling_fast') {
                      labelSuffix = `— Filling Fast (${s.available_capacity} spots left)`;
                    } else {
                      labelSuffix = `(${s.available_capacity} spots left)`;
                    }

                    return (
                      <option key={s.slot} value={s.slot} disabled={isDisabled}>
                        {s.slot} {labelSuffix}
                      </option>
                    );
                  })}
                </select>

                {/* Real-time slot status indicator */}
                {selectedSlotData && !selectedSlotData.is_past && !selectedSlotData.is_full && (
                  <div className="mt-1.5 flex items-center gap-1.5 text-[11px]">
                    {selectedSlotData.status === 'filling_fast' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 font-medium">
                        <Zap className="w-3 h-3 text-amber-600" />
                        Filling Fast: Only {selectedSlotData.available_capacity} spots left!
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 font-medium">
                        ✓ {selectedSlotData.available_capacity} spots available
                      </span>
                    )}
                  </div>
                )}

                {!hasAvailableSlots && !slotsLoading && (
                  <div className="mt-2 p-2.5 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-[11px] flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <span>All pickup windows for this date are full or past. Please select tomorrow or another future date.</span>
                  </div>
                )}
              </div>

              {/* Community Meal Credit Redemption Section */}
              <div className="p-3.5 bg-[#F8F7F2] rounded-2xl border border-[#245C45]/20 text-xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-[#E6EFE7] text-[#245C45] flex items-center justify-center">
                      <HeartHandshake className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="font-serif font-bold text-[#252A27] block text-[13px]">
                        Community Meal Credits
                      </span>
                      <span className="text-[10px] text-[#252A27]/60 block">
                        Open Pay-It-Forward pool (₹{mealUnitPrice} / meal)
                      </span>
                    </div>
                  </div>
                  {creditsLoading ? (
                    <span className="text-[10px] text-[#245C45] animate-pulse">Checking pool...</span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-[#E6EFE7] text-[#245C45] font-bold text-[10px]">
                      {availablePoolCredits} credit{availablePoolCredits !== 1 ? 's' : ''} available
                    </span>
                  )}
                </div>

                {availablePoolCredits > 0 && maxEligibleCredits > 0 ? (
                  <div className="space-y-2 pt-1 border-t border-[#245C45]/10">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={applyCredits}
                        onChange={(e) => {
                          setApplyCredits(e.target.checked);
                          if (e.target.checked && redeemCredits === 0) {
                            setRedeemCredits(1);
                          }
                        }}
                        className="w-4 h-4 text-[#245C45] rounded border-[#245C45]/30 focus:ring-[#245C45]/40"
                      />
                      <span className="text-xs font-semibold text-[#252A27]">
                        Redeem community meal credits for this order
                      </span>
                    </label>

                    {applyCredits && (
                      <div className="flex items-center justify-between bg-white rounded-xl p-2.5 border border-[#245C45]/15 mt-1.5">
                        <span className="text-[11px] text-[#252A27]/70">
                          Number of credits to apply:
                        </span>
                        <div className="flex items-center gap-2">
                          <select
                            value={effectiveRedeemCredits}
                            onChange={(e) => setRedeemCredits(parseInt(e.target.value, 10))}
                            className="bg-[#F8F7F2] border border-[#245C45]/25 rounded-lg px-2.5 py-1 text-xs font-bold text-[#245C45] focus:outline-none focus:ring-1 focus:ring-[#245C45]"
                          >
                            {Array.from({ length: maxRedeemableCredits }, (_, idx) => idx + 1).map((qty) => (
                              <option key={qty} value={qty}>
                                {qty} credit{qty > 1 ? 's' : ''} (-₹{qty * mealUnitPrice})
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                ) : availablePoolCredits === 0 ? (
                  <div className="text-[11px] text-[#252A27]/60 italic pt-1 border-t border-[#245C45]/10">
                    No community credits are currently available in the open pool.
                  </div>
                ) : (
                  <div className="text-[11px] text-amber-800 bg-amber-50 p-2 rounded-xl border border-amber-200 mt-1">
                    Add dishes worth at least ₹{mealUnitPrice} to qualify for meal credit redemption.
                  </div>
                )}
              </div>

              {/* Payment Mode */}
              <div>
                <label className="block text-[#252A27]/70 font-semibold mb-1">
                  Payment Mode
                </label>
                {isFullyCreditFunded ? (
                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-300 text-[11px] text-emerald-900 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                    <span>
                      <strong>100% Community Funded:</strong> No counter payment required. Order is fully covered by peer sponsorships!
                    </span>
                  </div>
                ) : (
                  <div className="p-3 bg-[#E6EFE7]/50 rounded-xl border border-[#245C45]/20 text-[11px] text-[#245C45] flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#245C45] shrink-0" />
                    <span>
                      <strong>Demo / Manual Payment:</strong> Settle remaining ₹{finalPayable.toFixed(2)} at canteen pickup counter.
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Pricing Details */}
            <div className="pt-3 border-t border-[#245C45]/10 space-y-2 text-xs">
              <div className="flex justify-between text-[#252A27]/70">
                <span>Subtotal</span>
                <span>₹{cartSubtotal.toFixed(2)}</span>
              </div>
              {effectiveRedeemCredits > 0 && (
                <div className="flex justify-between text-[#245C45] font-semibold">
                  <span className="flex items-center gap-1">
                    <HeartHandshake className="w-3.5 h-3.5" />
                    Community Credit Discount ({effectiveRedeemCredits} meal{effectiveRedeemCredits > 1 ? 's' : ''})
                  </span>
                  <span>-₹{creditDiscount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-[#252A27]/70">
                <span>Eco Packaging</span>
                <span className="text-emerald-700 font-medium">Free (Zero-Waste)</span>
              </div>
              <div className="flex justify-between text-base font-bold text-[#252A27] pt-2 border-t border-[#245C45]/10">
                <span>Payable Amount</span>
                <span className={isFullyCreditFunded ? 'text-emerald-700' : 'text-[#245C45]'}>
                  {isFullyCreditFunded ? '₹0.00 (100% Funded)' : `₹${finalPayable.toFixed(2)}`}
                </span>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || items.length === 0 || !pickupSlot || !hasAvailableSlots}
              className={`w-full mt-4 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-semibold text-white shadow-xs transition-all ${
                isSubmitting || items.length === 0 || !pickupSlot || !hasAvailableSlots
                  ? 'bg-[#245C45]/60 cursor-not-allowed'
                  : 'bg-[#245C45] hover:bg-[#1b4634] cursor-pointer'
              }`}
            >
              <span>{isSubmitting ? 'Verifying & Creating Order...' : 'Confirm Canteen Pre-order'}</span>
              {!isSubmitting && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
