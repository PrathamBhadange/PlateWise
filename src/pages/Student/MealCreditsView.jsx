import { useState } from 'react';
import { CreditCard, Heart, ArrowUpRight, ArrowDownLeft, Sparkles, CheckCircle2 } from 'lucide-react';

export default function MealCreditsView() {
  const [sponsorshipNotice, setSponsorshipNotice] = useState(false);

  const transactions = [
    {
      id: 'TXN-401',
      type: 'Used',
      desc: 'Special Veg Thali lunch',
      amount: '-1 Credit',
      date: 'Today, 12:30 PM',
      color: 'text-[#252A27]',
      icon: ArrowDownLeft,
    },
    {
      id: 'TXN-400',
      type: 'Sponsored',
      desc: 'Community Meal Grant to Nashik Shelter',
      amount: '-1 Credit',
      date: 'Yesterday, 6:00 PM',
      color: 'text-[#E99A55]',
      icon: Heart,
    },
    {
      id: 'TXN-399',
      type: 'Reload',
      desc: 'Semester Plan Credit Refresh',
      amount: '+15 Credits',
      date: '25 Oct 2026',
      color: 'text-[#245C45]',
      icon: ArrowUpRight,
    },
  ];

  const handleSponsor = () => {
    setSponsorshipNotice(true);
    setTimeout(() => setSponsorshipNotice(false), 5000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#252A27]">
          Meal Credits
        </h1>
        <p className="text-xs sm:text-sm text-[#252A27]/75 mt-0.5">
          Manage your prepaid campus meal tokens and student meal sponsorships
        </p>
      </div>

      {/* Credit Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
        {/* Available Credits Card */}
        <div className="bg-gradient-to-br from-[#245C45] to-[#164B38] text-white rounded-3xl p-6 shadow-md border border-[#245C45]/20 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#E6EFE7]/80 uppercase tracking-wider">
                Available Credits
              </span>
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                <CreditCard className="w-4 h-4 text-[#E6EFE7]" />
              </div>
            </div>
            <div className="font-serif text-4xl sm:text-5xl font-bold mt-3">
              12
            </div>
            <p className="text-xs text-[#E6EFE7]/80 mt-1">
              Active plan: Semester Saver (Valid till Dec 2026)
            </p>
          </div>

          <div className="mt-6 pt-3 border-t border-white/15 text-[11px] text-[#E6EFE7]/70">
            Student: Rohan Deshmukh · SPPU Nashik
          </div>
        </div>

        {/* Total Meals Consumed */}
        <div className="bg-white rounded-3xl p-6 border border-[#245C45]/15 shadow-2xs flex flex-col justify-between">
          <div>
            <span className="text-xs font-semibold text-[#252A27]/70 uppercase tracking-wider">
              Consumed This Term
            </span>
            <div className="font-serif text-4xl font-bold text-[#252A27] mt-3">
              18
            </div>
            <p className="text-xs text-[#252A27]/60 mt-1">
              Saved ~7.2 kg potential plate waste
            </p>
          </div>

          <div className="mt-6 pt-3 border-t border-[#245C45]/10 flex items-center gap-1.5 text-xs text-[#245C45] font-semibold">
            <Sparkles className="w-4 h-4 text-[#E99A55]" />
            <span>100% On-Time Pickups</span>
          </div>
        </div>

        {/* Sponsor Action Card */}
        <div className="bg-[#E6EFE7] rounded-3xl p-6 border border-[#245C45]/20 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-[#245C45] uppercase tracking-wider">
              <Heart className="w-4 h-4 text-[#E99A55]" />
              <span>Sponsor a Peer Meal</span>
            </div>
            <p className="text-xs text-[#252A27]/80 mt-2 leading-relaxed">
              Donate 1 surplus credit to the campus hunger fund or local community kitchen.
            </p>
          </div>

          <button
            type="button"
            onClick={handleSponsor}
            className="w-full mt-4 py-2.5 bg-[#245C45] hover:bg-[#164B38] text-white text-xs font-semibold rounded-xl transition-all shadow-xs cursor-pointer"
          >
            Sponsor 1 Meal Credit
          </button>
        </div>
      </div>

      {/* Sponsorship Notice */}
      {sponsorshipNotice && (
        <div className="p-4 rounded-2xl bg-[#E6EFE7] border border-[#245C45]/30 flex items-center gap-3 text-xs text-[#245C45] animate-fade-in">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-[#245C45]" />
          <span>
            Thank you! 1 meal credit donated to the Nashik student welfare pantry. (Simulated Demo Action)
          </span>
        </div>
      )}

      {/* Credit Transactions Ledger */}
      <div className="bg-white rounded-3xl p-6 border border-[#245C45]/15 shadow-2xs">
        <h3 className="font-serif text-lg font-bold text-[#252A27] mb-4">
          Recent Credit Activity
        </h3>

        <div className="divide-y divide-[#245C45]/5">
          {transactions.map((txn) => {
            const IconComp = txn.icon;
            return (
              <div
                key={txn.id}
                className="py-3 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#F8F7F2] text-[#245C45] flex items-center justify-center flex-shrink-0">
                    <IconComp className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-[#252A27]">
                      {txn.desc}
                    </h4>
                    <span className="text-[11px] text-[#252A27]/60">
                      {txn.date} · {txn.type}
                    </span>
                  </div>
                </div>

                <span className={`text-sm font-bold font-mono ${txn.color}`}>
                  {txn.amount}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
