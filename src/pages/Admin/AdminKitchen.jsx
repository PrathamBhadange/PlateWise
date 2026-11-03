import Member4Header from '../../components/dashboard/Member4Header';
import KitchenDashboard from '../Kitchen/KitchenDashboard';

export default function AdminKitchen() {
  return (
    <div className="min-h-screen bg-[#F8F7F2] text-[#252A27] flex flex-col font-sans">
      <Member4Header
        title="Kitchen & Production Analytics"
        subtitle="Demand forecasting, daily batch prep recommendations, and real-time order lifecycle"
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <KitchenDashboard showTitle={false} />
      </main>
    </div>
  );
}
