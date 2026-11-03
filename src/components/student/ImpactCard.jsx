export default function ImpactCard({ title, value, unit, description, icon: Icon, color = 'emerald' }) {
  const colorMap = {
    emerald: 'bg-[#E6EFE7] text-[#245C45]',
    amber: 'bg-amber-100 text-amber-800',
    blue: 'bg-blue-100 text-blue-800',
    stone: 'bg-stone-100 text-stone-700',
  };

  const activeColor = colorMap[color] || colorMap.emerald;

  return (
    <div className="bg-white rounded-2xl p-5 border border-[#245C45]/10 shadow-xs flex flex-col justify-between">
      <div className="flex items-start justify-between">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#252A27]/60 block">{title}</span>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-3xl font-serif font-bold text-[#245C45]">{value}</span>
            {unit && <span className="text-xs font-semibold text-[#252A27]/60">{unit}</span>}
          </div>
        </div>
        {Icon && (
          <div className={`p-2.5 rounded-xl ${activeColor}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
      {description && <p className="text-xs text-[#252A27]/70 mt-3 pt-2 border-t border-[#245C45]/10">{description}</p>}
    </div>
  );
}
