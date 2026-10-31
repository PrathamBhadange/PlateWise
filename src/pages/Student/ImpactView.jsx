import { Sprout, Heart, Scale, Award, Sparkles } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';

const DETAILED_IMPACT = [
  { week: 'Week 1', waste: 1.8, target: 2.5 },
  { week: 'Week 2', waste: 2.5, target: 2.5 },
  { week: 'Week 3', waste: 2.1, target: 2.5 },
  { week: 'Week 4', waste: 2.8, target: 2.5 },
];

export default function ImpactView() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#252A27]">
          Your Sustainability Impact
        </h1>
        <p className="text-xs sm:text-sm text-[#252A27]/75 mt-0.5">
          See how your pre-ordering and zero-waste dining habits create measurable change
        </p>
      </div>

      {/* Impact Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-[#245C45]/15 shadow-2xs">
          <div className="w-10 h-10 rounded-xl bg-[#E6EFE7] text-[#245C45] flex items-center justify-center mb-3">
            <Scale className="w-5 h-5" />
          </div>
          <span className="font-serif text-2xl sm:text-3xl font-bold text-[#245C45]">
            9.2 kg
          </span>
          <span className="text-xs font-semibold text-[#252A27] block mt-0.5">
            Total Food Rescued
          </span>
          <span className="text-[11px] text-[#6B8F71] block">
            Across 2026 academic term
          </span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-[#245C45]/15 shadow-2xs">
          <div className="w-10 h-10 rounded-xl bg-[#E99A55]/15 text-[#E99A55] flex items-center justify-center mb-3">
            <Heart className="w-5 h-5" />
          </div>
          <span className="font-serif text-2xl sm:text-3xl font-bold text-[#252A27]">
            24 Meals
          </span>
          <span className="text-xs font-semibold text-[#252A27] block mt-0.5">
            Equivalent Nourished
          </span>
          <span className="text-[11px] text-[#6B8F71] block">
            Redirected to community kitchens
          </span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-[#245C45]/15 shadow-2xs">
          <div className="w-10 h-10 rounded-xl bg-[#E6EFE7] text-[#245C45] flex items-center justify-center mb-3">
            <Sprout className="w-5 h-5" />
          </div>
          <span className="font-serif text-2xl sm:text-3xl font-bold text-[#245C45]">
            18.4 kg
          </span>
          <span className="text-xs font-semibold text-[#252A27] block mt-0.5">
            CO₂ Equivalent Prevented
          </span>
          <span className="text-[11px] text-[#6B8F71] block">
            Landfill methane reduction
          </span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-[#245C45]/15 shadow-2xs">
          <div className="w-10 h-10 rounded-xl bg-[#E99A55]/15 text-[#E99A55] flex items-center justify-center mb-3">
            <Award className="w-5 h-5" />
          </div>
          <span className="font-serif text-2xl sm:text-3xl font-bold text-[#245C45]">
            Eco Star
          </span>
          <span className="text-xs font-semibold text-[#252A27] block mt-0.5">
            Campus Dining Badge
          </span>
          <span className="text-[11px] text-[#6B8F71] block">
            Top 5% zero-waste students
          </span>
        </div>
      </div>

      {/* Expanded Monthly Analysis Chart */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#245C45]/15 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-4 border-b border-[#245C45]/10 gap-2">
          <div>
            <h3 className="font-serif text-lg font-bold text-[#252A27]">
              October 2026 Waste Reduction Breakdown
            </h3>
            <p className="text-xs text-[#252A27]/60">
              Weekly progress in kg compared with campus pilot target
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5 text-[#245C45] font-semibold">
              <span className="w-3 h-3 rounded-xs bg-[#245C45]" />
              Rescued (kg)
            </span>
          </div>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={DETAILED_IMPACT} margin={{ top: 15, right: 20, left: -20, bottom: 5 }}>
              <XAxis dataKey="week" tick={{ fontSize: 12, fill: '#252A27' }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 4]} tick={{ fontSize: 11, fill: '#252A27' }} axisLine={false} tickLine={false} />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-[#164B38] text-white text-xs px-3 py-2 rounded-xl shadow-md">
                        <p className="font-bold">{label}</p>
                        <p className="text-[#E99A55] font-semibold">{payload[0].value} kg rescued</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="waste" fill="#245C45" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Campus Zero Waste Community Pledge */}
      <div className="p-6 rounded-3xl bg-[#E6EFE7]/50 border border-[#245C45]/20 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-[#252A27]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#245C45] text-white flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-5 h-5 text-[#E99A55]" />
          </div>
          <div>
            <h4 className="font-serif text-sm font-bold text-[#245C45]">
              Nashik Zero-Food-Waste University Pledge
            </h4>
            <p className="text-[11px] text-[#252A27]/70 mt-0.5">
              PlateWise connects 1,000+ hostel diners directly with city NGO distribution hubs.
            </p>
          </div>
        </div>

        <span className="px-3.5 py-1.5 rounded-xl bg-white border border-[#245C45]/20 text-[#245C45] font-semibold text-xs whitespace-nowrap">
          Verified Student Pilot
        </span>
      </div>
    </div>
  );
}
