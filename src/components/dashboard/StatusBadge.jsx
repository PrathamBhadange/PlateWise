export default function StatusBadge({ status, isOverdue = false }) {
  const st = (status || 'open').toLowerCase();

  if (st === 'escalated' || isOverdue) {
    return (
      <span className="inline-flex items-center gap-1 bg-[#B3402F]/15 text-[#B3402F] border border-[#B3402F]/30 rounded-full text-xs font-semibold px-2.5 py-0.5">
        <span className="w-1.5 h-1.5 rounded-full bg-[#B3402F]"></span>
        {st === 'escalated' ? 'Escalated' : 'Overdue'}
      </span>
    );
  }

  if (st === 'resolved' || st === 'closed') {
    return (
      <span className="inline-flex items-center gap-1 bg-[#E6EFE7] text-[#245C45] rounded-full text-xs font-semibold px-2.5 py-0.5">
        <span className="w-1.5 h-1.5 rounded-full bg-[#245C45]"></span>
        {st === 'resolved' ? 'Resolved' : 'Closed'}
      </span>
    );
  }

  if (st === 'in_progress') {
    return (
      <span className="inline-flex items-center gap-1 bg-[#E99A55]/20 text-[#252A27] rounded-full text-xs font-semibold px-2.5 py-0.5">
        <span className="w-1.5 h-1.5 rounded-full bg-[#E99A55]"></span>
        In Progress
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 bg-[#F8F7F2] border border-[#245C45]/20 text-[#252A27] rounded-full text-xs font-semibold px-2.5 py-0.5">
      <span className="w-1.5 h-1.5 rounded-full bg-[#6B8F71]"></span>
      Open
    </span>
  );
}

