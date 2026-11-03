import { Link } from 'react-router-dom';

export default function EmptyState({ icon: Icon, title, description, actionText, actionLink, onAction }) {
  return (
    <div className="bg-white rounded-2xl p-8 border border-[#245C45]/10 text-center flex flex-col items-center justify-center max-w-md mx-auto my-6">
      {Icon && (
        <div className="w-14 h-14 rounded-2xl bg-[#E6EFE7] text-[#245C45] flex items-center justify-center mb-4">
          <Icon className="w-7 h-7" />
        </div>
      )}
      <h3 className="text-base font-serif font-bold text-[#252A27]">{title}</h3>
      {description && <p className="text-xs text-[#252A27]/70 mt-1.5 max-w-xs">{description}</p>}
      {actionText && (
        <div className="mt-5">
          {actionLink ? (
            <Link
              to={actionLink}
              className="inline-flex items-center justify-center px-4 py-2 rounded-xl text-xs font-semibold bg-[#245C45] text-white hover:bg-[#1b4634] transition-colors shadow-xs"
            >
              {actionText}
            </Link>
          ) : (
            <button
              type="button"
              onClick={onAction}
              className="inline-flex items-center justify-center px-4 py-2 rounded-xl text-xs font-semibold bg-[#245C45] text-white hover:bg-[#1b4634] transition-colors shadow-xs cursor-pointer"
            >
              {actionText}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
