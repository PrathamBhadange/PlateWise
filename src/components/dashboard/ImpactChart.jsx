import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import { Sprout, ArrowRight } from 'lucide-react';

const WEEKLY_DATA = [
  { week: 'W1', saved: 1.8 },
  { week: 'W2', saved: 2.5 },
  { week: 'W3', saved: 2.1 },
  { week: 'W4', saved: 2.8 },
];

function CustomTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#164B38] text-white text-xs px-2.5 py-1.5 rounded-lg shadow-md border border-white/20">
        <span className="font-semibold">{label}:</span>{' '}
        <span className="text-[#E99A55] font-bold">{payload[0].value} kg</span> saved
      </div>
    );
  }
  return null;
}

export default function ImpactChart() {
  const navigate = useNavigate();
  const [timeframe, setTimeframe] = useState('month');

  return (
    <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-[#245C45]/15 shadow-2xs flex flex-col justify-between">
      <div>
        {/* Header with Title and Dropdown / View All */}
        <div className="flex items-center justify-between pb-4 border-b border-[#245C45]/10">
          <div>
            <h3 className="font-serif text-lg sm:text-xl font-bold text-[#252A27]">
              Your Impact
            </h3>
            <p className="text-[11px] text-[#252A27]/60">
              Weekly food waste prevented
            </p>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className="text-xs font-semibold text-[#245C45] bg-[#E6EFE7] border border-[#245C45]/20 rounded-lg px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-[#245C45] cursor-pointer"
            >
              <option value="month">This Month</option>
              <option value="last-month">Last Month</option>
              <option value="semester">Semester</option>
            </select>

            <button
              type="button"
              onClick={() => navigate('/student/impact')}
              className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold text-[#245C45] hover:text-[#164B38] hover:underline transition-colors cursor-pointer ml-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Content Body: Split into Bar Chart & Highlight Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center mt-4">
          {/* Left Chart (7 cols) */}
          <div className="sm:col-span-7 h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={WEEKLY_DATA}
                margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
              >
                <XAxis
                  dataKey="week"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: '#252A27', opacity: 0.7 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  domain={[0, 4]}
                  ticks={[0, 1, 2, 3, 4]}
                  tick={{ fontSize: 10, fill: '#252A27', opacity: 0.6 }}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(36, 92, 69, 0.05)' }} />
                <Bar
                  dataKey="saved"
                  fill="#6B8F71"
                  radius={[6, 6, 0, 0]}
                  activeBar={{ fill: '#245C45' }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Right Summary Callout (5 cols) */}
          <div className="sm:col-span-5 bg-[#F8F7F2] rounded-2xl p-4 border border-[#245C45]/10 flex flex-col justify-between relative overflow-hidden">
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-[#E6EFE7] text-[#245C45] flex items-center justify-center flex-shrink-0">
                  <Sprout className="w-4.5 h-4.5 text-[#245C45]" />
                </div>
                <span className="font-serif text-2xl font-bold text-[#245C45]">
                  2.3 kg
                </span>
              </div>

              <h4 className="text-xs font-bold text-[#252A27]">
                Food Waste Saved
              </h4>
              <p className="text-[11px] text-[#252A27]/70 mt-1 leading-snug">
                Equivalent to <strong>6 full meals</strong> redirected to community shelters.
              </p>
            </div>

            {/* Subtle decorative sprout leaf in bottom corner */}
            <div
              className="absolute -bottom-3 -right-3 text-[#245C45]/10 pointer-events-none select-none"
              aria-hidden="true"
            >
              <Sprout className="w-16 h-16" />
            </div>
          </div>
        </div>
      </div>

      {/* Footer hint */}
      <div className="pt-3 mt-3 border-t border-[#245C45]/10 flex items-center justify-between text-[11px] text-[#252A27]/60">
        <span>Campus Goal: 5.0 kg / month</span>
        <span className="text-[#245C45] font-semibold">46% Achieved</span>
      </div>
    </div>
  );
}
