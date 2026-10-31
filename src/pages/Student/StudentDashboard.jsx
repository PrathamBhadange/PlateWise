import WelcomeSection from '../../components/dashboard/WelcomeSection';
import MealHeroBanner from '../../components/dashboard/MealHeroBanner';
import QuickStats from '../../components/dashboard/QuickStats';
import RecentOrders from '../../components/dashboard/RecentOrders';
import ImpactChart from '../../components/dashboard/ImpactChart';

export default function StudentDashboard() {
  return (
    <div className="space-y-6 sm:space-y-7">
      {/* 1. Welcome Greeting & Available Meal Credits Pill */}
      <WelcomeSection studentName="Rohan" availableCredits={12} />

      {/* 2. Today's Lunch Hero Banner */}
      <MealHeroBanner />

      {/* 3. Four Quick Statistic Cards */}
      <QuickStats />

      {/* 4. Two-Column Lower Content: Recent Orders & Impact Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-7">
        {/* Left Column: Recent Orders */}
        <RecentOrders />

        {/* Right Column: Your Impact Recharts Bar Chart */}
        <ImpactChart />
      </div>
    </div>
  );
}
