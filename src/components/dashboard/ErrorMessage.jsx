export default function ErrorMessage({ message = 'An unexpected error occurred.', onRetry }) {
  return (
    <div className="bg-[#B3402F]/10 border border-[#B3402F]/30 rounded-2xl p-5 text-center my-4">
      <p className="text-sm font-medium text-[#B3402F]">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 bg-[#B3402F] hover:bg-[#8f3325] text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all cursor-pointer"
        >
          Try Again
        </button>
      )}
    </div>
  );
}

