export default function StudentStatCard({ label, value, subtext, icon: Icon, color = 'emerald' }) {
  const colorMap = {
    emerald: 'bg-[#E6EFE7] text-[#245C45] border-[#245C45]/20',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
  };

  const activeColor = colorMap[color] || colorMap.emerald;

  return (
    <div className="bg-white rounded-2xl p-5 border border-[#245C45]/10 shadow-xs hover:shadow-sm transition-shadow">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-[#252A27]/70 uppercase tracking-wider">{label}</span>
        {Icon && (
          <div className={`p-2.5 rounded-xl border ${activeColor}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
      <div className="mt-3">
        <span className="text-2xl sm:text-3xl font-serif font-bold text-[#252A27]">{value}</span>
        {subtext && <p className="text-xs text-[#252A27]/60 mt-1">{subtext}</p>}
      </div>
    </div>
  );
}
