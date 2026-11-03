import { useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';

function CustomSalesTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#164B38] text-white text-xs px-2.5 py-1.5 rounded-lg shadow-md border border-white/20">
        <span className="font-semibold">{label}:</span>{' '}
        <span className="text-[#E99A55] font-bold">₹{payload[0].value}</span>
      </div>
    );
  }
  return null;
}

export default function SalesChart({ hourlySales = [], topItems = [], totalSales = 0, totalPlates = 0 }) {
  const [filter, setFilter] = useState('Today');

  // Fallback data if no sales yet today
  const chartData =
    hourlySales.length > 0
      ? hourlySales
      : [
          { hour: '8 AM', sales: 0 },
          { hour: '10 AM', sales: 0 },
          { hour: '12 PM', sales: 0 },
          { hour: '2 PM', sales: 0 },
          { hour: '4 PM', sales: 0 },
          { hour: '6 PM', sales: 0 },
        ];

  return (
    <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-[#245C45]/15 shadow-2xs flex flex-col justify-between text-left">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#245C45]/10">
          <div>
            <h3 className="font-serif text-lg sm:text-xl font-bold text-[#252A27]">
              Today's Sales
            </h3>
            <p className="text-[11px] text-[#252A27]/60">
              Hourly revenue & top-selling plates
            </p>
          </div>

          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="text-xs font-semibold text-[#245C45] bg-[#E6EFE7] border border-[#245C45]/20 rounded-lg px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-[#245C45] cursor-pointer"
          >
            <option value="Today">Today</option>
          </select>
        </div>

        {/* Hourly Bar Chart */}
        <div className="h-36 w-full mt-3">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
            >
              <XAxis
                dataKey="hour"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: '#252A27', opacity: 0.7 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: '#252A27', opacity: 0.6 }}
              />
              <Tooltip
                content={<CustomSalesTooltip />}
                cursor={{ fill: 'rgba(36, 92, 69, 0.05)' }}
              />
              <Bar
                dataKey="sales"
                fill="#245C45"
                radius={[5, 5, 0, 0]}
                activeBar={{ fill: '#E99A55' }}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top Selling Items */}
        <div className="mt-4 pt-3 border-t border-[#245C45]/10">
          <span className="text-[11px] font-bold text-[#252A27] uppercase tracking-wider block mb-2">
            Top Selling Items Today
          </span>

          {topItems.length === 0 ? (
            <p className="text-xs text-[#252A27]/50 italic">No items sold yet today.</p>
          ) : (
            <div className="space-y-2">
              {topItems.map((item) => {
                const max = item.max || 20;
                const pct = Math.min(100, Math.round((item.count / max) * 100));
                return (
                  <div key={item.name} className="flex items-center justify-between text-xs gap-3">
                    <span className="text-[#252A27]/80 w-28 truncate">{item.name}</span>
                    <div className="flex-1 bg-[#F8F7F2] rounded-full h-2 overflow-hidden border border-[#245C45]/10">
                      <div
                        className="bg-[#245C45] h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="font-bold text-[#245C45] w-6 text-right">
                      {item.count}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="pt-3 mt-3 border-t border-[#245C45]/10 flex items-center justify-between text-[11px] text-[#252A27]/60">
        <span>Counter Shift Total</span>
        <span className="font-bold text-[#245C45]">
          ₹{totalSales.toLocaleString('en-IN')} ({totalPlates} plates)
        </span>
      </div>
    </div>
  );
}
