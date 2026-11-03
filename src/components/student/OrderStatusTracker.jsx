import { CheckCircle2, Clock, ChefHat, Sparkles, Check, XCircle } from 'lucide-react';

export default function OrderStatusTracker({ status }) {
  const normalized = String(status || '').trim();

  if (normalized.toLowerCase() === 'cancelled') {
    return (
      <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-center gap-2.5 text-rose-800 text-xs">
        <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
        <span className="font-semibold">This order was cancelled.</span>
      </div>
    );
  }

  const steps = [
    { key: 'Pending', label: 'Order Placed', icon: Clock },
    { key: 'Confirmed', label: 'Confirmed', icon: CheckCircle2 },
    { key: 'Preparing', label: 'Preparing', icon: ChefHat },
    { key: 'Ready', label: 'Ready for Pickup', icon: Sparkles },
    { key: 'Collected', label: 'Collected', icon: Check },
  ];

  // Map backend status to index
  const statusIndexMap = {
    pending: 0,
    confirmed: 1,
    preparing: 2,
    ready: 3,
    collected: 4,
    picked_up: 4,
  };

  const currentIdx = statusIndexMap[normalized.toLowerCase()] ?? 0;

  return (
    <div className="w-full py-2">
      <div className="flex items-center justify-between relative">
        {/* Connecting line */}
        <div className="absolute left-4 right-4 top-4 h-0.5 bg-stone-200 -z-0" />
        <div
          className="absolute left-4 top-4 h-0.5 bg-[#245C45] transition-all duration-300 -z-0"
          style={{ width: `${(currentIdx / (steps.length - 1)) * 92}%` }}
        />

        {steps.map((step, idx) => {
          const isDone = idx < currentIdx;
          const isCurrent = idx === currentIdx;
          const Icon = step.icon;

          return (
            <div key={step.key} className="flex flex-col items-center relative z-10">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                  isDone
                    ? 'bg-[#245C45] text-white'
                    : isCurrent
                    ? 'bg-[#245C45] text-white ring-4 ring-[#E6EFE7]'
                    : 'bg-white text-stone-400 border-2 border-stone-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
              </div>
              <span
                className={`text-[10px] sm:text-xs mt-1.5 font-medium text-center ${
                  isCurrent ? 'font-bold text-[#245C45]' : isDone ? 'text-[#252A27]' : 'text-stone-400'
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
