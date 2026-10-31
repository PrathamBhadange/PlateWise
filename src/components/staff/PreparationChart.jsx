import { ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function PreparationChart({ pendingCount = 0, preparingCount = 0, readyCount = 0 }) {
  const total = pendingCount + preparingCount + readyCount;

  const data = total > 0 ? [
    { name: 'Pending', value: pendingCount, color: '#F87171' },
    { name: 'Preparing', value: preparingCount, color: '#F59E0B' },
    { name: 'Ready', value: readyCount, color: '#245C45' },
  ] : [
    { name: 'No Active Orders', value: 1, color: '#E6EFE7' },
  ];

  const pendingPct = total ? Math.round((pendingCount / total) * 100) : 0;
  const preparingPct = total ? Math.round((preparingCount / total) * 100) : 0;
  const readyPct = total ? Math.round((readyCount / total) * 100) : 0;

  return (
    <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-[#245C45]/15 shadow-2xs text-left">
      <div className="flex items-center justify-between pb-3 border-b border-[#245C45]/10">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-serif text-lg font-bold text-[#252A27]">
              Preparation Status
            </h3>
            <span className="text-[10px] font-semibold text-[#245C45] bg-[#E6EFE7] px-2 py-0.5 rounded-full border border-[#245C45]/20">
              Live Total
            </span>
          </div>
          <p className="text-[11px] text-[#252A27]/60">
            Real-time kitchen order distribution across preparation stages
          </p>
        </div>
      </div>

      {/* Donut Chart with Center Count */}
      <div className="relative h-44 w-full mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={48}
              outerRadius={68}
              paddingAngle={total > 0 ? 3 : 0}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        {/* Center Total Count (guaranteed to match sum of categories) */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="font-serif text-2xl font-bold text-[#252A27] leading-none">
            {total}
          </span>
          <span className="text-[10px] text-[#252A27]/60 font-medium mt-0.5">
            Total Orders
          </span>
        </div>
      </div>

      {/* Legend with percentages */}
      <div className="mt-3 space-y-1.5 pt-3 border-t border-[#245C45]/10 text-xs">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-[#252A27]/80">
            <span className="w-2.5 h-2.5 rounded-full bg-[#F87171]" />
            <span>Pending (Awaiting Prep)</span>
          </span>
          <span className="font-semibold text-[#252A27]">
            {pendingCount} ({pendingPct}%)
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-[#252A27]/80">
            <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" />
            <span>Now Preparing (In Cook)</span>
          </span>
          <span className="font-semibold text-[#252A27]">
            {preparingCount} ({preparingPct}%)
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-[#252A27]/80">
            <span className="w-2.5 h-2.5 rounded-full bg-[#245C45]" />
            <span>Ready for Pickup (Staged)</span>
          </span>
          <span className="font-semibold text-[#252A27]">
            {readyCount} ({readyPct}%)
          </span>
        </div>
      </div>
    </div>
  );
}
