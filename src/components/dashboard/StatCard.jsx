export default function StatCard({ title, value, subtitle, icon: Icon, trend, alert = false }) {
  return (
    <div className={`bg-white rounded-2xl border ${alert ? 'border-[#B3402F]/30 bg-[#B3402F]/5' : 'border-[#245C45]/10'} shadow-sm p-5 flex flex-col justify-between transition-all hover:shadow-md`}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-medium uppercase tracking-wider text-[#252A27]/60">
          {title}
        </span>
        {Icon && (
          <div className={`p-2 rounded-xl ${alert ? 'bg-[#B3402F]/10 text-[#B3402F]' : 'bg-[#E6EFE7] text-[#245C45]'}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      <div className="mt-3">
        <div className={`text-2xl sm:text-3xl font-serif font-bold ${alert ? 'text-[#B3402F]' : 'text-[#252A27]'}`}>
          {value}
        </div>
        {(subtitle || trend) && (
          <div className="mt-1 flex items-center gap-1.5 text-xs text-[#252A27]/70">
            {trend && <span className="font-semibold text-[#245C45]">{trend}</span>}
            {subtitle && <span>{subtitle}</span>}
          </div>
        )}
      </div>
    </div>
  );
}

