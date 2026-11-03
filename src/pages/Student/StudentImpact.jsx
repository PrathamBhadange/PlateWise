import { useState, useEffect } from 'react';
import { Leaf, Award, ShoppingBag, AlertCircle, Info } from 'lucide-react';
import { getStudentOrders } from '../../services/studentApi';
import ImpactCard from '../../components/student/ImpactCard';
import LoadingSpinner from '../../components/dashboard/LoadingSpinner';

export default function StudentImpact() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError('');
      try {
        const data = await getStudentOrders();
        setOrders(Array.isArray(data) ? data : data.orders || []);
      } catch (err) {
        console.error('Impact orders fetch error:', err);
        setError(
          err.response?.data?.message || err.response?.data?.error || 'Failed to calculate personal impact data.'
        );
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="py-24 flex justify-center">
        <LoadingSpinner text="Calculating your verified campus eco-impact..." />
      </div>
    );
  }

  // Derive metrics strictly from the student's own verified orders (Rule 43)
  const completedOrders = orders.filter((o) =>
    ['collected', 'picked_up'].includes(String(o.status || '').toLowerCase())
  );
  const totalMealsOrdered = completedOrders.reduce((sum, o) => sum + Number(o.total_quantity || 1), 0);
  const totalSpent = completedOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

  // Conservative food waste prevention factor: by pre-ordering instead of ad-hoc cafeteria overproduction,
  // each planned meal prevents approximately 0.15 kg of canteen waste.
  const estimatedWastePreventedKg = (totalMealsOrdered * 0.15).toFixed(2);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-serif font-bold text-[#252A27]">My Sustainability Impact</h1>
        <p className="text-xs text-[#252A27]/70 mt-1">
          Metrics calculated strictly from your verified canteen order transactions.
        </p>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-2xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Verified Personal Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <ImpactCard
          title="Verified Meals Consumed"
          value={totalMealsOrdered}
          unit="portions"
          description="Total completed canteen meals tracked in database."
          icon={ShoppingBag}
          color="emerald"
        />
        <ImpactCard
          title="Pre-ordered Food Saved"
          value={estimatedWastePreventedKg}
          unit="kg waste"
          description="Estimated buffer food saved by pre-scheduling kitchen demand."
          icon={Leaf}
          color="emerald"
        />
        <ImpactCard
          title="Canteen Investment"
          value={`₹${totalSpent.toFixed(2)}`}
          unit="spent"
          description="Contribution to sustainable campus dining operations."
          icon={Award}
          color="amber"
        />
      </div>

      {/* Dependent Metrics: Unavailable State for Member 3 Tables */}
      <div className="bg-white rounded-3xl p-6 border border-[#245C45]/15 shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-[#245C45]/10">
          <Info className="w-4 h-4 text-[#245C45]" />
          <h3 className="font-serif font-bold text-base text-[#252A27]">
            Community & Surplus Contribution Metrics
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-[#F8F7F2] p-4 rounded-2xl border border-stone-200 text-xs space-y-1.5 opacity-90">
            <span className="font-bold text-[#252A27]/60 uppercase text-[10px] tracking-wider block">
              Meals Sponsored for Peers
            </span>
            <div className="text-xl font-bold text-stone-500">Unavailable</div>
            <p className="text-[#252A27]/60 text-[11px]">
              Pending Member 3 integration (<code>meal_sponsors</code> schema table).
            </p>
          </div>

          <div className="bg-[#F8F7F2] p-4 rounded-2xl border border-stone-200 text-xs space-y-1.5 opacity-90">
            <span className="font-bold text-[#252A27]/60 uppercase text-[10px] tracking-wider block">
              Surplus Meals Rescued
            </span>
            <div className="text-xl font-bold text-stone-500">Unavailable</div>
            <p className="text-[#252A27]/60 text-[11px]">
              Pending Member 3 integration (<code>surplus_offers</code> schema table).
            </p>
          </div>
        </div>

        <div className="p-3.5 bg-[#E6EFE7]/40 rounded-xl border border-[#245C45]/10 text-xs text-[#245C45] flex items-center gap-2">
          <Leaf className="w-4 h-4 shrink-0" />
          <span>
            PlateWise calculates individual student metrics exclusively from authentic personal logs. Campus aggregates are never artificially divided or attributed.
          </span>
        </div>
      </div>
    </div>
  );
}
