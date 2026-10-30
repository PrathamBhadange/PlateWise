export default function BrandLogo({
  inverted = false,
  showTagline = true,
  size = 'md',
  onClick,
}) {
  const iconSizeClasses = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-11 h-11',
  };

  const textClasses = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
  };

  return (
    <a
      href="#home"
      onClick={onClick}
      className="group inline-flex items-center gap-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#245C45] rounded-lg transition-transform"
      aria-label="PlateWise Home"
    >
      {/* Brand Icon Mark */}
      <div
        className={`relative ${iconSizeClasses[size]} rounded-full flex items-center justify-center transition-transform group-hover:scale-105 ${
          inverted
            ? 'bg-[#E6EFE7] text-[#245C45] shadow-md shadow-black/10'
            : 'bg-[#245C45] text-[#F8F7F2] shadow-sm'
        }`}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="w-5 h-5 transition-transform group-hover:rotate-6"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Plate Rim */}
          <circle cx="12" cy="12" r="9" strokeWidth="1.5" strokeOpacity="0.4" />
          {/* Leaf / Sprout */}
          <path
            d="M12 6C12 6 8.5 8.5 8.5 13C8.5 15.8 10.3 17.5 12 18C13.7 17.5 15.5 15.8 15.5 13C15.5 8.5 12 6 12 6Z"
            fill="currentColor"
            fillOpacity={inverted ? "0.9" : "0.85"}
          />
          {/* Sprout Stem */}
          <path d="M12 8V17" stroke={inverted ? "#245C45" : "#F8F7F2"} strokeWidth="1.5" />
        </svg>
        {/* Soft Orange Accent dot */}
        <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#E99A55] ring-2 ring-white" />
      </div>

      {/* Brand Name & Tagline */}
      <div className="flex flex-col">
        <span
          className={`font-serif font-bold tracking-tight leading-none ${textClasses[size]} ${
            inverted ? 'text-white' : 'text-[#245C45]'
          }`}
        >
          Plate<span className={inverted ? 'text-[#E99A55]' : 'text-[#E99A55]'}>Wise</span>
        </span>
        {showTagline && (
          <span
            className={`text-[10px] tracking-wide mt-1 font-medium hidden sm:inline-block ${
              inverted ? 'text-[#E6EFE7]/80' : 'text-[#6B8F71]'
            }`}
          >
            Good Food. Less Waste. Brighter Tomorrow.
          </span>
        )}
      </div>
    </a>
  );
}
