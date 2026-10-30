export default function SeverityBadge({ severity }) {
  const sev = (severity || 'medium').toLowerCase();

  if (sev === 'critical') {
    return (
      <span className="inline-flex items-center gap-1 bg-[#B3402F]/15 text-[#B3402F] border border-[#B3402F]/30 rounded-full text-xs font-semibold px-2.5 py-0.5 animate-pulse">
        <span className="w-1.5 h-1.5 rounded-full bg-[#B3402F]"></span>
        Critical
      </span>
    );
  }

  if (sev === 'high') {
    return (
      <span className="inline-flex items-center gap-1 bg-[#B3402F]/10 text-[#B3402F] rounded-full text-xs font-semibold px-2.5 py-0.5">
        <span className="w-1.5 h-1.5 rounded-full bg-[#B3402F]"></span>
        High
      </span>
    );
  }

  if (sev === 'medium') {
    return (
      <span className="inline-flex items-center gap-1 bg-[#E99A55]/20 text-[#252A27] rounded-full text-xs font-semibold px-2.5 py-0.5">
        <span className="w-1.5 h-1.5 rounded-full bg-[#E99A55]"></span>
        Medium
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 bg-[#E6EFE7] text-[#245C45] rounded-full text-xs font-semibold px-2.5 py-0.5">
      <span className="w-1.5 h-1.5 rounded-full bg-[#6B8F71]"></span>
      Low
    </span>
  );
}

