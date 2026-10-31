import { Phone, Mail, HelpCircle } from 'lucide-react';

export default function StaffHelpView() {
  return (
    <div className="space-y-6 text-left">
      <div>
        <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#252A27]">
          Staff Technical & Manager Support
        </h1>
        <p className="text-xs sm:text-sm text-[#252A27]/75 mt-0.5">
          Counter hardware troubleshooting, token scanner help, and cafeteria supervisor escalation
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-[#245C45]/15 shadow-2xs">
          <div className="w-10 h-10 rounded-xl bg-[#E6EFE7] text-[#245C45] flex items-center justify-center mb-3">
            <Phone className="w-5 h-5" />
          </div>
          <h3 className="font-serif text-base font-bold text-[#252A27]">
            Canteen Supervisor Line
          </h3>
          <p className="text-xs text-[#252A27]/70 mt-1">
            Immediate assistance for counter disputes or food shortage escalation
          </p>
          <span className="text-xs font-mono font-bold text-[#245C45] mt-2 block">
            +91 253-257XXXX (Ext 101)
          </span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-[#245C45]/15 shadow-2xs">
          <div className="w-10 h-10 rounded-xl bg-[#E99A55]/15 text-[#E99A55] flex items-center justify-center mb-3">
            <Mail className="w-5 h-5" />
          </div>
          <h3 className="font-serif text-base font-bold text-[#252A27]">
            IT & POS System Support
          </h3>
          <p className="text-xs text-[#252A27]/70 mt-1">
            Thermal printer connection, QR scanner errors, or network outages
          </p>
          <span className="text-xs font-mono font-bold text-[#245C45] mt-2 block">
            it-support@sppu.campus.in
          </span>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-6 border border-[#245C45]/15 shadow-2xs text-xs space-y-3">
        <div className="flex items-center gap-2 font-bold text-sm text-[#252A27]">
          <HelpCircle className="w-4 h-4 text-[#245C45]" />
          <span>Quick Counter Troubleshooting</span>
        </div>
        <p className="text-[#252A27]/80">
          <strong>Scanner Camera Offline?</strong> Switch to <em>"Enter Token Manually"</em> mode and type the 4-character pickup code (e.g. <code>#A-42</code>) printed on the student's app.
        </p>
        <p className="text-[#252A27]/80">
          <strong>Token shows "Preparing"?</strong> The kitchen has not marked the plate ready. Instruct the student to wait ~2 minutes near Counter 2.
        </p>
      </div>
    </div>
  );
}
