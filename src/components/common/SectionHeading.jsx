export default function SectionHeading({
  badge,
  title,
  subtitle,
  align = 'center',
  inverted = false,
  className = '',
}) {
  const isCenter = align === 'center';

  return (
    <div
      className={`max-w-3xl ${
        isCenter ? 'mx-auto text-center' : 'text-left'
      } ${className}`}
    >
      {badge && (
        <div
          className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold tracking-wider uppercase mb-3 ${
            inverted
              ? 'bg-[#E6EFE7]/15 text-[#E6EFE7] border border-[#E6EFE7]/20'
              : 'bg-[#E6EFE7] text-[#245C45] border border-[#245C45]/15'
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#E99A55]" />
          {badge}
        </div>
      )}

      <h2
        className={`font-serif text-3xl sm:text-4xl lg:text-4xl font-semibold tracking-tight leading-tight ${
          inverted ? 'text-white' : 'text-[#252A27]'
        }`}
      >
        {title}
      </h2>

      {subtitle && (
        <p
          className={`mt-4 text-base sm:text-lg leading-relaxed ${
            inverted ? 'text-[#E6EFE7]/90' : 'text-[#252A27]/75'
          }`}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}
