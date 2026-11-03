import { Phone, Mail, HelpCircle, CheckCircle2 } from 'lucide-react';

export default function KitchenHelpView() {
  return (
    <div className="space-y-6 text-left">
      <div>
        <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#252A27]">
          Kitchen Help & Operational Support
        </h1>
        <p className="text-xs sm:text-sm text-[#252A27]/75 mt-0.5">
          Kitchen display guidelines, prep sheet assistance, and supervisor escalation contacts
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-[#245C45]/15 shadow-2xs">
          <div className="w-10 h-10 rounded-xl bg-[#E6EFE7] text-[#245C45] flex items-center justify-center mb-3">
            <Phone className="w-5 h-5" />
          </div>
          <h3 className="font-serif text-base font-bold text-[#252A27]">
            Head Chef & Supervisor Hotline
          </h3>
          <p className="text-xs text-[#252A27]/70 mt-1">
            Immediate assistance for ingredient shortages, equipment breakdowns, or production capacity escalations.
          </p>
          <span className="text-xs font-mono font-bold text-[#245C45] mt-2 block">
            +91 20-2569-1088 (Ext 104)
          </span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-[#245C45]/15 shadow-2xs">
          <div className="w-10 h-10 rounded-xl bg-[#E99A55]/15 text-[#E99A55] flex items-center justify-center mb-3">
            <Mail className="w-5 h-5" />
          </div>
          <h3 className="font-serif text-base font-bold text-[#252A27]">
            Kitchen Display System (KDS) & IT Support
          </h3>
          <p className="text-xs text-[#252A27]/70 mt-1">
            Assistance with kitchen display monitors, network sync delays, or prep sheet export formatting.
          </p>
          <span className="text-xs font-mono font-bold text-[#245C45] mt-2 block">
            it-kitchen@platewise.campus
          </span>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-6 border border-[#245C45]/15 shadow-2xs text-xs space-y-3">
        <div className="flex items-center gap-2 font-bold text-sm text-[#252A27]">
          <HelpCircle className="w-4 h-4 text-[#245C45]" />
          <span>Standard Operating Procedures (SOP)</span>
        </div>

        <div className="space-y-2 text-[#252A27]/80">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#245C45] mt-0.5 flex-shrink-0" />
            <span>Follow the order pipeline progression: Pending &rarr; Confirmed &rarr; Preparing &rarr; Ready.</span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#245C45] mt-0.5 flex-shrink-0" />
            <span>Review Demand Planning recommendations each morning to calculate optimum batch sizes based on weekday trends and pre-orders.</span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#245C45] mt-0.5 flex-shrink-0" />
            <span>Click 'Export Prep Sheet' to generate a downloadable CSV of required ingredients and portion targets for kitchen stations.</span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#245C45] mt-0.5 flex-shrink-0" />
            <span>Flag items with available portions &le; 15 as Low Stock to prevent over-promising orders at checkout.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
