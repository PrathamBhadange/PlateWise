import { useNavigate } from 'react-router-dom';
import { CreditCard, ChevronRight } from 'lucide-react';

export default function WelcomeSection({ studentName = 'Rohan', availableCredits = 12 }) {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      {/* Welcome Greeting */}
      <div>
        <h1 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold text-[#252A27] tracking-tight flex items-center gap-2">
          <span>Good Morning, {studentName}!</span>
          <span className="text-xl sm:text-2xl animate-pulse">🍃</span>
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-[#252A27]/75 font-normal">
          Healthy meals. Zero waste. A brighter tomorrow.
        </p>
      </div>

      {/* Available Meal Credits Summary Card */}
      <div
        onClick={() => navigate('/student/credits')}
        className="group flex items-center justify-between sm:justify-start gap-3.5 px-4 py-2.5 bg-white rounded-2xl border border-[#245C45]/15 shadow-2xs hover:shadow-xs hover:border-[#245C45]/35 transition-all cursor-pointer"
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            navigate('/student/credits');
          }
        }}
        aria-label="View meal credits ledger"
      >
        <div className="w-10 h-10 rounded-xl bg-[#E6EFE7] text-[#245C45] flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
          <CreditCard className="w-5 h-5" />
        </div>

        <div>
          <span className="text-[11px] font-medium text-[#252A27]/70 block leading-tight">
            Meal Credits
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="font-serif text-xl sm:text-2xl font-bold text-[#245C45] leading-tight">
              {availableCredits}
            </span>
            <span className="text-[11px] font-medium text-[#252A27]/70">
              meals available
            </span>
          </div>
        </div>

        <ChevronRight className="w-4 h-4 text-[#245C45]/50 group-hover:text-[#245C45] group-hover:translate-x-0.5 transition-all ml-1" />
      </div>
    </div>
  );
}
