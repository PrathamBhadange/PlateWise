export default function StatusBadge({ status, isOverdue = false }) {
  const st = (status || 'open').toLowerCase().replace(/\s+/g, '_');

  if (st === 'escalated' || isOverdue) {
    return (
      <span className="inline-flex items-center gap-1 bg-[#B3402F]/15 text-[#B3402F] border border-[#B3402F]/30 rounded-full text-xs font-semibold px-2.5 py-0.5">
        <span className="w-1.5 h-1.5 rounded-full bg-[#B3402F]"></span>
        {st === 'escalated' ? 'Escalated' : 'Overdue'}
      </span>
    );
  }

  if (st === 'resolved' || st === 'closed' || st === 'collected' || st === 'available') {
    return (
      <span className="inline-flex items-center gap-1 bg-[#E6EFE7] text-[#245C45] rounded-full text-xs font-semibold px-2.5 py-0.5">
        <span className="w-1.5 h-1.5 rounded-full bg-[#245C45]"></span>
        {status || (st === 'resolved' ? 'Resolved' : 'Closed')}
      </span>
    );
  }

  if (st === 'in_progress' || st === 'preparing' || st === 'low_stock') {
    return (
      <span className="inline-flex items-center gap-1 bg-[#E99A55]/20 text-[#252A27] rounded-full text-xs font-semibold px-2.5 py-0.5">
        <span className="w-1.5 h-1.5 rounded-full bg-[#E99A55]"></span>
        {status || 'In Progress'}
      </span>
    );
  }

  if (st === 'confirmed') {
    return (
      <span className="inline-flex items-center gap-1 bg-[#6B8F71]/20 text-[#245C45] rounded-full text-xs font-semibold px-2.5 py-0.5">
        <span className="w-1.5 h-1.5 rounded-full bg-[#245C45]"></span>
        Confirmed
      </span>
    );
  }

  if (st === 'ready') {
    return (
      <span className="inline-flex items-center gap-1 bg-[#245C45] text-white rounded-full text-xs font-semibold px-2.5 py-0.5 shadow-xs">
        <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
        Ready
      </span>
    );
  }

  if (st === 'cancelled' || st === 'out_of_stock') {
    return (
      <span className="inline-flex items-center gap-1 bg-[#B3402F]/10 text-[#B3402F] rounded-full text-xs font-semibold px-2.5 py-0.5">
        <span className="w-1.5 h-1.5 rounded-full bg-[#B3402F]"></span>
        {status || (st === 'cancelled' ? 'Cancelled' : 'Out of Stock')}
      </span>
    );
  }

  if (st === 'pending') {
    return (
      <span className="inline-flex items-center gap-1 bg-[#F8F7F2] border border-[#E99A55]/40 text-[#252A27] rounded-full text-xs font-semibold px-2.5 py-0.5">
        <span className="w-1.5 h-1.5 rounded-full bg-[#E99A55]"></span>
        Pending
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 bg-[#F8F7F2] border border-[#245C45]/20 text-[#252A27] rounded-full text-xs font-semibold px-2.5 py-0.5">
      <span className="w-1.5 h-1.5 rounded-full bg-[#6B8F71]"></span>
      {status || 'Open'}
    </span>
  );
}

