export default function EmptyState({ title = 'No records found', description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center bg-white rounded-2xl border border-[#245C45]/10">
      <div className="w-12 h-12 rounded-full bg-[#E6EFE7] flex items-center justify-center text-[#245C45] mb-3">
        <span className="text-xl font-bold">∅</span>
      </div>
      <h3 className="text-base font-serif font-semibold text-[#252A27]">{title}</h3>
      {description && <p className="mt-1 text-sm text-[#252A27]/60 max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

