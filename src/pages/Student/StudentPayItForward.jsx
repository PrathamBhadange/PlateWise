import { useState, useEffect, useCallback } from 'react';
import {
  HeartHandshake,
  Users,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  Heart,
  Clock,
  Send,
  RotateCcw,
} from 'lucide-react';
import {
  getAvailableCommunityCredits,
  createStudentSponsorship,
  getMySponsorships,
} from '../../services/studentApi';
import LoadingSpinner from '../../components/dashboard/LoadingSpinner';

export default function StudentPayItForward() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Live pool stats
  const [poolStats, setPoolStats] = useState({
    meals_available: 0,
    available_pool_balance: 0,
    meal_unit_price: 40,
    active_credit_lots_count: 0,
  });

  // Student's own sponsorships
  const [mySponsorships, setMySponsorships] = useState([]);

  // Form state
  const [selectedMealCount, setSelectedMealCount] = useState(1);
  const [customAmount, setCustomAmount] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [message, setMessage] = useState('');

  const unitPrice = Number(poolStats.meal_unit_price || 40);
  const computedAmount = customAmount
    ? parseFloat(customAmount) || 0
    : selectedMealCount * unitPrice;

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [poolRes, myRes] = await Promise.all([
        getAvailableCommunityCredits().catch(() => ({ meals_available: 0, available_pool_balance: 0 })),
        getMySponsorships().catch(() => []),
      ]);
      setPoolStats(poolRes);
      setMySponsorships(Array.isArray(myRes) ? myRes : []);
    } catch (err) {
      console.error('Failed to load Pay-It-Forward data:', err);
      setError('Failed to load community credit pool data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSponsorSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (computedAmount <= 0) {
      setError('Please choose or enter a valid sponsorship amount.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        amount: computedAmount,
        meals_funded: Math.max(1, Math.floor(computedAmount / unitPrice)),
        is_anonymous: isAnonymous,
        message: message.trim() || undefined,
        payment_method: 'upi_simulated',
        simulate_payment: true,
      };

      const res = await createStudentSponsorship(payload);
      setSuccessMsg(
        res.message ||
          `Thank you! ₹${computedAmount.toFixed(2)} sponsored successfully (${Math.floor(
            computedAmount / unitPrice
          )} meal credits added to Open Community Pool).`
      );

      // Reset form
      setMessage('');
      setCustomAmount('');
      setSelectedMealCount(1);

      // Refresh data
      await loadData();
    } catch (err) {
      console.error('Sponsorship error:', err);
      setError(
        err.response?.data?.message ||
          err.response?.data?.error ||
          'Failed to complete sponsorship. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 flex justify-center">
        <LoadingSpinner text="Connecting to Community Meal Credit Pool..." />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-serif font-bold text-[#252A27]">Pay-It-Forward Meals</h1>
        <p className="text-xs text-[#252A27]/70 mt-1">
          Support campus peers in need by contributing to the anonymous Open Community Meal Pool.
        </p>
      </div>

      {/* Live Pool Banner */}
      <div className="bg-gradient-to-r from-[#245C45] to-[#1b4634] rounded-3xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-48 h-48 rounded-full bg-white/5 pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-200 bg-white/10 px-2.5 py-1 rounded-full">
              Live Open Community Pool
            </span>
            <h2 className="text-3xl sm:text-4xl font-serif font-black mt-2">
              {poolStats.meals_available || 0}{' '}
              <span className="text-lg sm:text-xl font-normal text-emerald-100 font-sans">
                Meals Available
              </span>
            </h2>
            <p className="text-xs text-emerald-100/80 max-w-md pt-1">
              Active pool balance of ₹{Number(poolStats.available_pool_balance || 0).toFixed(2)} funded by
              students and supporters. Any verified campus student can redeem during checkout with zero stigma.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-xs p-4 rounded-2xl border border-white/15 text-center min-w-[140px]">
            <span className="text-[10px] uppercase tracking-wider text-emerald-200 block">
              Subsidized Rate
            </span>
            <span className="text-2xl font-serif font-bold block mt-0.5">
              ₹{unitPrice.toFixed(2)}
            </span>
            <span className="text-[10px] text-emerald-200/80 block mt-0.5">per thali / credit</span>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-2xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-2xl text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Main Grid: Sponsorship Form + My Contributions */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        {/* Form Column (3/5) */}
        <div className="md:col-span-3 bg-white rounded-3xl p-6 sm:p-7 border border-[#245C45]/15 shadow-xs space-y-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-[#245C45]/10">
            <div className="w-8 h-8 rounded-xl bg-[#E6EFE7] text-[#245C45] flex items-center justify-center">
              <Heart className="w-4 h-4 fill-[#245C45]" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-base text-[#252A27]">
                Sponsor Community Meals
              </h3>
              <p className="text-[11px] text-[#252A27]/60">
                100% of your contribution directly funds subsidized meals for students.
              </p>
            </div>
          </div>

          <form onSubmit={handleSponsorSubmit} className="space-y-4">
            {/* Quick meal selection buttons */}
            <div>
              <label className="block text-xs font-semibold text-[#252A27] mb-2">
                Select Number of Meals to Sponsor
              </label>
              <div className="grid grid-cols-3 gap-2.5">
                {[
                  { count: 1, label: '1 Meal', cost: 40 },
                  { count: 2, label: '2 Meals', cost: 80 },
                  { count: 5, label: '5 Meals', cost: 200 },
                ].map((preset) => {
                  const isSelected = !customAmount && selectedMealCount === preset.count;
                  return (
                    <button
                      key={preset.count}
                      type="button"
                      onClick={() => {
                        setSelectedMealCount(preset.count);
                        setCustomAmount('');
                      }}
                      className={`p-3 rounded-2xl text-center border transition-all cursor-pointer ${
                        isSelected
                          ? 'border-[#245C45] bg-[#E6EFE7] text-[#245C45] font-bold shadow-xs'
                          : 'border-stone-200 bg-[#F8F7F2] text-[#252A27]/80 hover:border-[#245C45]/30'
                      }`}
                    >
                      <span className="block text-xs font-semibold">{preset.label}</span>
                      <span className="block text-sm font-serif font-bold mt-0.5">
                        ₹{preset.cost}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Amount option */}
            <div>
              <label className="block text-xs font-semibold text-[#252A27] mb-1">
                Or Enter Custom Contribution (₹)
              </label>
              <input
                type="number"
                min="10"
                step="5"
                placeholder="e.g. 150"
                value={customAmount}
                onChange={(e) => {
                  setCustomAmount(e.target.value);
                  setSelectedMealCount(0);
                }}
                className="w-full bg-[#F8F7F2] border border-[#245C45]/20 rounded-xl px-3.5 py-2.5 text-xs text-[#252A27] focus:outline-none focus:ring-2 focus:ring-[#245C45]/30 font-medium"
              />
              {customAmount && (
                <span className="text-[11px] text-[#245C45] font-medium block mt-1">
                  Funds approximately {Math.floor(computedAmount / unitPrice)} full meal credit(s).
                </span>
              )}
            </div>

            {/* Optional message */}
            <div>
              <label className="block text-xs font-semibold text-[#252A27] mb-1">
                Warm Message for Peers (Optional)
              </label>
              <textarea
                rows={2}
                maxLength={200}
                placeholder="e.g. Best of luck with semester exams! Have a nourishing meal."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full bg-[#F8F7F2] border border-[#245C45]/20 rounded-xl px-3.5 py-2 text-xs text-[#252A27] focus:outline-none focus:ring-2 focus:ring-[#245C45]/30 resize-none font-sans"
              />
            </div>

            {/* Anonymous checkbox */}
            <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-[#252A27]/80">
              <input
                type="checkbox"
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
                className="rounded border-stone-300 text-[#245C45] focus:ring-[#245C45]"
              />
              <span>Sponsor anonymously (hide my name from public peer logs)</span>
            </label>

            {/* Submit button */}
            <button
              type="submit"
              disabled={submitting || computedAmount <= 0}
              className="w-full bg-[#245C45] hover:bg-[#1b4634] text-white py-3 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Processing Sponsorship...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Sponsor ₹{computedAmount.toFixed(2)} Now</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* History Column (2/5) */}
        <div className="md:col-span-2 bg-white rounded-3xl p-6 border border-[#245C45]/15 shadow-xs flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#245C45]/10">
              <div className="flex items-center gap-2">
                <HeartHandshake className="w-4 h-4 text-[#245C45]" />
                <h3 className="font-serif font-bold text-sm text-[#252A27]">My Contributions</h3>
              </div>
              <button
                type="button"
                onClick={loadData}
                title="Refresh"
                className="text-[#245C45] hover:text-[#1b4634] p-1 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>

            {mySponsorships.length === 0 ? (
              <div className="py-8 text-center text-[#252A27]/60 space-y-1">
                <Users className="w-8 h-8 text-[#245C45]/40 mx-auto" />
                <p className="text-xs font-semibold">No sponsorships yet</p>
                <p className="text-[11px]">Your completed meal sponsorships will appear here.</p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {mySponsorships.map((s) => (
                  <div
                    key={s.sponsorship_id}
                    className="p-3 bg-[#F8F7F2] rounded-xl border border-[#245C45]/10 text-xs space-y-1"
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-serif font-bold text-[#245C45]">
                        ₹{Number(s.total_amount).toFixed(2)}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                        {s.payment_status}
                      </span>
                    </div>
                    <div className="flex justify-between text-[11px] text-[#252A27]/60">
                      <span>{s.meals_funded} meal(s) funded</span>
                      <span>
                        {s.created_at ? new Date(s.created_at).toLocaleDateString() : 'Recent'}
                      </span>
                    </div>
                    {s.message && (
                      <p className="text-[11px] text-[#252A27]/80 italic pt-0.5 border-t border-[#245C45]/5">
                        "{s.message}"
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-[#245C45]/10 text-[11px] text-[#252A27]/60 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#245C45] shrink-0" />
            <span>Audited & immutable double-entry ledger bookkeeping.</span>
          </div>
        </div>
      </div>

      {/* Educational Concept Preview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
        <div className="bg-white rounded-2xl p-5 border border-[#245C45]/15 shadow-xs space-y-2">
          <div className="w-10 h-10 rounded-xl bg-[#E6EFE7] text-[#245C45] flex items-center justify-center">
            <HeartHandshake className="w-5 h-5" />
          </div>
          <h3 className="font-serif font-bold text-sm text-[#252A27]">1. Sponsor a Meal</h3>
          <p className="text-xs text-[#252A27]/60">
            Contribute micro-credits (₹40 per thali) to fund nourishing cafeteria meals for campus peers.
          </p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-[#245C45]/15 shadow-xs space-y-2">
          <div className="w-10 h-10 rounded-xl bg-[#E6EFE7] text-[#245C45] flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
          <h3 className="font-serif font-bold text-sm text-[#252A27]">2. Anonymous Credit Pool</h3>
          <p className="text-xs text-[#252A27]/60">
            Contributions pool into an audited, append-only FIFO ledger transparent to all campus members.
          </p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-[#245C45]/15 shadow-xs space-y-2">
          <div className="w-10 h-10 rounded-xl bg-[#E6EFE7] text-[#245C45] flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
          <h3 className="font-serif font-bold text-sm text-[#252A27]">3. Dignified Redemption</h3>
          <p className="text-xs text-[#252A27]/60">
            Students apply community credits seamlessly during checkout with 100% privacy and zero stigma.
          </p>
        </div>
      </div>
    </div>
  );
}
