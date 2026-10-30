export default function LoadingSpinner({ message = 'Loading data...' }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="w-9 h-9 border-3 border-[#245C45]/20 border-t-[#245C45] rounded-full animate-spin"></div>
      <p className="mt-3 text-sm text-[#252A27]/70 font-medium">{message}</p>
    </div>
  );
}

