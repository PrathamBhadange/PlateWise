import { Phone, Mail, MapPin, HelpCircle } from 'lucide-react';

export default function HelpSupportView() {
  const faqs = [
    {
      q: 'How does pre-ordering reduce food waste?',
      a: 'When you lock in your meal 1–2 hours before lunch, the campus kitchen cooks exact portion counts instead of guesswork bulk preparation. Untouched surplus is automatically flagged for verified NGO pickup.',
    },
    {
      q: 'What if I am late to pick up my meal?',
      a: 'Pre-ordered meals are held in temperature-controlled hot boxes at Counter 2 for up to 45 minutes past the dining window. After that, uncollected meals are transferred to community food donation.',
    },
    {
      q: 'How do meal sponsorships work?',
      a: 'Students can donate unused meal credits from their plan. These credits are pooled anonymously for peers facing financial hardship or transferred to local partner shelters in Nashik.',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#252A27]">
          Help & Support
        </h1>
        <p className="text-xs sm:text-sm text-[#252A27]/75 mt-0.5">
          Campus canteen assistance, order resolutions, and zero-waste inquiries
        </p>
      </div>

      {/* Support Contact Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-[#245C45]/15 shadow-2xs">
          <div className="w-10 h-10 rounded-xl bg-[#E6EFE7] text-[#245C45] flex items-center justify-center mb-3">
            <Phone className="w-5 h-5" />
          </div>
          <h3 className="font-serif text-base font-bold text-[#252A27]">
            Cafeteria Helpdesk
          </h3>
          <p className="text-xs text-[#252A27]/70 mt-1">
            Call for counter issues & delayed tokens
          </p>
          <span className="text-xs font-mono font-bold text-[#245C45] mt-2 block">
            +91 253-257XXXX (Ext 402)
          </span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-[#245C45]/15 shadow-2xs">
          <div className="w-10 h-10 rounded-xl bg-[#E99A55]/15 text-[#E99A55] flex items-center justify-center mb-3">
            <Mail className="w-5 h-5" />
          </div>
          <h3 className="font-serif text-base font-bold text-[#252A27]">
            Email Support
          </h3>
          <p className="text-xs text-[#252A27]/70 mt-1">
            General meal credit & diet queries
          </p>
          <span className="text-xs font-mono font-bold text-[#245C45] mt-2 block">
            canteen@sppu.campus.in
          </span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-[#245C45]/15 shadow-2xs">
          <div className="w-10 h-10 rounded-xl bg-[#E6EFE7] text-[#245C45] flex items-center justify-center mb-3">
            <MapPin className="w-5 h-5" />
          </div>
          <h3 className="font-serif text-base font-bold text-[#252A27]">
            Physical Counter
          </h3>
          <p className="text-xs text-[#252A27]/70 mt-1">
            PlateWise Express Kiosk
          </p>
          <span className="text-xs font-semibold text-[#245C45] mt-2 block">
            Dining Hall Ground Floor, Nashik
          </span>
        </div>
      </div>

      {/* Frequently Asked Questions */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#245C45]/15 shadow-2xs">
        <div className="flex items-center gap-2 mb-4">
          <HelpCircle className="w-5 h-5 text-[#245C45]" />
          <h3 className="font-serif text-lg font-bold text-[#252A27]">
            Frequently Asked Questions
          </h3>
        </div>

        <div className="divide-y divide-[#245C45]/10 space-y-3">
          {faqs.map((faq, idx) => (
            <div key={idx} className="pt-3">
              <h4 className="text-sm font-semibold text-[#252A27]">
                {faq.q}
              </h4>
              <p className="mt-1 text-xs text-[#252A27]/75 leading-relaxed">
                {faq.a}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
