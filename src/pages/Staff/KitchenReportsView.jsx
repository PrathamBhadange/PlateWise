import PreparationChart from '../../components/staff/PreparationChart';
import { Download } from 'lucide-react';

export default function KitchenReportsView() {
  return (
    <div className="space-y-6 text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#252A27]">
            Kitchen Preparation & Waste Reports
          </h1>
          <p className="text-xs sm:text-sm text-[#252A27]/75 mt-0.5">
            Portion accuracy, preparation throughput, and kitchen batch records
          </p>
        </div>

        <button
          type="button"
          onClick={() => alert('Demo Kitchen Export: In Phase 2, downloads batch yield & surplus audit log.')}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#245C45] hover:bg-[#164B38] text-white text-xs font-semibold rounded-xl transition-all cursor-pointer shadow-xs w-fit"
        >
          <Download className="w-4 h-4" />
          <span>Export Kitchen Log</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6">
          <PreparationChart pendingCount={8} preparingCount={12} readyCount={8} />
        </div>

        <div className="lg:col-span-6 bg-white rounded-3xl p-6 border border-[#245C45]/15 shadow-2xs space-y-3 text-xs">
          <h3 className="font-serif text-lg font-bold text-[#252A27] pb-2 border-b border-[#245C45]/10">
            Batch Preparation Audit (Oct 2026)
          </h3>
          <p className="text-[#252A27]/80 leading-relaxed">
            Overall kitchen prep throughput averaged <strong>14.8 minutes</strong> per order today. Pre-booking accuracy reached <strong>96%</strong>, allowing the kitchen to hold zero over-prepped dal and curry pots at shift close.
          </p>

          <div className="p-3.5 rounded-2xl bg-[#E6EFE7]/60 border border-[#245C45]/15">
            <span className="font-bold text-[#245C45] block">Food Waste Reduction: 2.3 kg today</span>
            <span className="text-[11px] text-[#252A27]/70">Zero preparation batches discarded to waste.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
