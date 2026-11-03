import { useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowLeft, LayoutDashboard, Database } from 'lucide-react';

const MODULE_DETAILS = {
  'new-order': {
    title: 'New Walk-in Order POS',
    description:
      'Cashier counter walk-in token generation is pending dedicated POS transaction API implementation. In the current PlateWise architecture, all student meal orders are placed digitally via the pre-ordering portal.',
    status: 'Backend API Pending',
    scope: 'Member 2 Ordering Module',
  },
  payments: {
    title: 'Counter Cash & UPI Settlements',
    description:
      'The cashier daily cash reconciliation drawer and UPI settlement ledger are pending dedicated finance table integration. Currently, order payments are recorded directly within the orders table.',
    status: 'Backend API Pending',
    scope: 'Member 2 Billing Module',
  },
  credits: {
    title: 'Student Meal Credit Management',
    description:
      'Counter student meal credit queries and semester credit grants require the university ledger integration. Currently, student meal credit allocations are managed directly by campus administration.',
    status: 'Backend API Pending',
    scope: 'Member 2 Ledger Integration',
  },
};

export default function CashierUnavailableView({ moduleKey = 'new-order' }) {
  const navigate = useNavigate();
  const info = MODULE_DETAILS[moduleKey] || {
    title: 'Module Under Development',
    description: 'This feature is currently awaiting backend database integration.',
    status: 'Pending Implementation',
    scope: 'Phase 2 Architecture',
  };

  return (
    <div className="space-y-6 text-left">
      <div>
        <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#252A27]">
          {info.title}
        </h1>
        <p className="text-xs sm:text-sm text-[#252A27]/75 mt-0.5">
          System Integration Status Report
        </p>
      </div>

      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#245C45]/15 shadow-2xs space-y-5">
        <div className="flex items-center gap-3 pb-4 border-b border-[#245C45]/10">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#252A27]">Destination Unavailable</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                {info.status}
              </span>
            </div>
            <p className="text-[11px] text-[#252A27]/60 mt-0.5">
              Assigned Scope: {info.scope}
            </p>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-[#252A27]/80 leading-relaxed">
          {info.description}
        </p>

        <div className="p-4 rounded-2xl bg-[#F8F7F2] border border-[#245C45]/10 text-xs text-[#252A27]/75 flex items-start gap-3">
          <Database className="w-4 h-4 text-[#245C45] mt-0.5 flex-shrink-0" />
          <div>
            <span className="font-semibold text-[#252A27] block">No Mock Data Policy:</span>
            <span>
              Per project integration rules, this destination will not render fabricated mock transactions or fake state. Once the corresponding database tables and Express endpoints are provisioned, this interface will activate automatically.
            </span>
          </div>
        </div>

        <div className="pt-2 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => navigate('/cashier')}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#245C45] hover:bg-[#164B38] text-white text-xs font-semibold rounded-xl transition-all cursor-pointer shadow-xs"
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Return to Cashier Dashboard</span>
          </button>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-[#E6EFE7] text-[#252A27] text-xs font-semibold rounded-xl border border-[#245C45]/20 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Go Back</span>
          </button>
        </div>
      </div>
    </div>
  );
}
