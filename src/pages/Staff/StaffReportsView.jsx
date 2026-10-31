import SalesChart from '../../components/staff/SalesChart';
import { Download, Sparkles } from 'lucide-react';

export default function StaffReportsView() {
  return (
    <div className="space-y-6 text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#252A27]">
            Cafeteria Operations & Sales Reports
          </h1>
          <p className="text-xs sm:text-sm text-[#252A27]/75 mt-0.5">
            Audit daily meals served, counter revenue, and zero-waste performance logs
          </p>
        </div>

        <button
          type="button"
          onClick={() => alert('Demo Report Export: In Phase 2, downloads official CSV/PDF cafeteria shift summary.')}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#245C45] hover:bg-[#164B38] text-white text-xs font-semibold rounded-xl transition-all cursor-pointer shadow-xs w-fit"
        >
          <Download className="w-4 h-4" />
          <span>Export Daily PDF</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6">
          <SalesChart />
        </div>

        <div className="lg:col-span-6 bg-white rounded-3xl p-6 border border-[#245C45]/15 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold text-[#245C45] uppercase tracking-wider pb-2 border-b border-[#245C45]/10">
            <Sparkles className="w-4 h-4 text-[#E99A55]" />
            <span>Shift Zero-Waste Highlights</span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3.5 rounded-2xl bg-[#E6EFE7]/50 border border-[#245C45]/15">
              <span className="font-bold text-[#245C45] block">Pre-Order Accuracy: 94%</span>
              <p className="text-[11px] text-[#252A27]/75 mt-0.5">
                42 out of 45 pre-ordered meals claimed on schedule, reducing surplus prep to minimal margin.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#F8F7F2] border border-[#245C45]/10">
              <span className="font-bold text-[#252A27] block">Surplus Redistribution Flag</span>
              <p className="text-[11px] text-[#252A27]/75 mt-0.5">
                3 unclaimed lunch portions packaged at 1:45 PM and transferred to Nashik shelter partner.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
