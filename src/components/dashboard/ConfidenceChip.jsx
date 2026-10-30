export default function ConfidenceChip({ level }) {
  const conf = (level || 'LOW').toUpperCase();

  if (conf === 'HIGH') {
    return (
      <span className="bg-[#E6EFE7] text-[#245C45] border border-[#245C45]/20 rounded-full text-xs font-semibold px-2.5 py-0.5">
        High (4w+)
      </span>
    );
  }

  if (conf === 'MEDIUM') {
    return (
      <span className="bg-[#E99A55]/15 text-[#252A27] border border-[#E99A55]/30 rounded-full text-xs font-semibold px-2.5 py-0.5">
        Medium (2-3w)
      </span>
    );
  }

  return (
    <span className="bg-gray-100 text-[#252A27]/70 border border-gray-200 rounded-full text-xs font-semibold px-2.5 py-0.5">
      Low (&lt;2w)
    </span>
  );
}

