export default function StatCard({ title, value, subtitle, icon: Icon, trend, alert = false }) {
  return (
    <div
      className={`bg-white rounded-2xl border ${
        alert ? 'border-[#B3402F]/30 bg-[#B3402F]/5' : 'border-[#245C45]/10'
      } shadow-sm p-4 sm:p-5 flex flex-col justify-between transition-all hover:shadow-md min-w-0 h-full`}
    >
      <div className="flex items-center justify-between gap-2 min-w-0">
        <span
          className="text-xs font-medium uppercase tracking-wider text-[#252A27]/60 truncate"
          title={title}
        >
          {title}
        </span>
        {Icon && (
          <div
            className={`p-2 rounded-xl shrink-0 ${
              alert ? 'bg-[#B3402F]/10 text-[#B3402F]' : 'bg-[#E6EFE7] text-[#245C45]'
            }`}
          >
            <Icon className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
          </div>
        )}
      </div>

      <div className="mt-3 min-w-0">
        <div
          className={`text-xl sm:text-2xl lg:text-3xl font-serif font-bold whitespace-nowrap truncate ${
            alert ? 'text-[#B3402F]' : 'text-[#252A27]'
          }`}
          title={String(value)}
        >
          {value}
        </div>
        {(subtitle || trend) && (
          <div className="mt-1 flex items-center gap-1.5 text-xs text-[#252A27]/70 min-w-0">
            {trend && <span className="font-semibold text-[#245C45] shrink-0">{trend}</span>}
            {subtitle && <span className="truncate">{subtitle}</span>}
          </div>
        )}
      </div>
    </div>
  );
}
