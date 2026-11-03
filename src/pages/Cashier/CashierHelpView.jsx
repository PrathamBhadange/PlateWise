import { Phone, Mail, HelpCircle, CheckCircle2 } from 'lucide-react';

export default function CashierHelpView() {
  return (
    <div className="space-y-6 text-left">
      <div>
        <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#252A27]">
          Cashier Help & Technical Support
        </h1>
        <p className="text-xs sm:text-sm text-[#252A27]/75 mt-0.5">
          Counter hardware guidelines, token scanner assistance, and supervisor escalation contacts
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-[#245C45]/15 shadow-2xs">
          <div className="w-10 h-10 rounded-xl bg-[#E6EFE7] text-[#245C45] flex items-center justify-center mb-3">
            <Phone className="w-5 h-5" />
          </div>
          <h3 className="font-serif text-base font-bold text-[#252A27]">
            Canteen Supervisor Hotline
          </h3>
          <p className="text-xs text-[#252A27]/70 mt-1">
            Immediate assistance for counter escalations, meal shortages, or student grievance mediation.
          </p>
          <span className="text-xs font-mono font-bold text-[#245C45] mt-2 block">
            +91 20-2569-1088 (Ext 102)
          </span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-[#245C45]/15 shadow-2xs">
          <div className="w-10 h-10 rounded-xl bg-[#E99A55]/15 text-[#E99A55] flex items-center justify-center mb-3">
            <Mail className="w-5 h-5" />
          </div>
          <h3 className="font-serif text-base font-bold text-[#252A27]">
            Campus POS & IT Helpdesk
          </h3>
          <p className="text-xs text-[#252A27]/70 mt-1">
            Assistance with thermal printer connectivity, barcode hardware, or network sync errors.
          </p>
          <span className="text-xs font-mono font-bold text-[#245C45] mt-2 block">
            it-canteen@platewise.campus
          </span>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-6 border border-[#245C45]/15 shadow-2xs text-xs space-y-3">
        <div className="flex items-center gap-2 font-bold text-sm text-[#252A27]">
          <HelpCircle className="w-4 h-4 text-[#245C45]" />
          <span>Counter Operational Guidelines</span>
        </div>

        <div className="space-y-2 text-[#252A27]/80">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#245C45] mt-0.5 flex-shrink-0" />
            <span>Verify the token status is 'Ready' on screen before releasing meal plates from the dispatch rack.</span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#245C45] mt-0.5 flex-shrink-0" />
            <span>If an order is marked 'Preparing', advise the student that the kitchen is finishing cooking the batch.</span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#245C45] mt-0.5 flex-shrink-0" />
            <span>Once handed over, click 'Verify Token & Hand Over Meal' to update the state machine to Collected.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
