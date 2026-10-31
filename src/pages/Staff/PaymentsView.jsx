export default function PaymentsView() {
  const transactions = [
    { id: 'PAY-892', time: '12:30 PM', student: 'Rohan Deshmukh', type: 'Meal Credit', amount: '1 Credit', status: 'Settled' },
    { id: 'PAY-891', time: '12:28 PM', student: 'Sneha Jadhav', type: 'Meal Credit', amount: '1 Credit', status: 'Settled' },
    { id: 'PAY-890', time: '12:25 PM', student: 'Aditya More', type: 'UPI (PhonePe)', amount: '₹120', status: 'Settled' },
    { id: 'PAY-889', time: '12:10 PM', student: 'Vikas Sharma', type: 'Cash Counter', amount: '₹90', status: 'Settled' },
    { id: 'PAY-888', time: '11:55 AM', student: 'Pooja Verma', type: 'UPI (GPay)', amount: '₹65', status: 'Settled' },
  ];

  return (
    <div className="space-y-6 text-left">
      <div>
        <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#252A27]">
          Counter Payments & Settlements
        </h1>
        <p className="text-xs sm:text-sm text-[#252A27]/75 mt-0.5">
          Real-time daily collection breakdown by cash, digital UPI, and meal credits
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-[#245C45]/15 shadow-2xs">
          <span className="text-xs font-semibold text-[#252A27]/60 block uppercase">Cash at Counter</span>
          <span className="font-serif text-3xl font-bold text-[#245C45] mt-1 block">₹450</span>
          <span className="text-[11px] text-[#6B8F71] mt-0.5 block">5 cash orders received</span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-[#245C45]/15 shadow-2xs">
          <span className="text-xs font-semibold text-[#252A27]/60 block uppercase">UPI Digital Collection</span>
          <span className="font-serif text-3xl font-bold text-[#245C45] mt-1 block">₹810</span>
          <span className="text-[11px] text-[#6B8F71] mt-0.5 block">9 dynamic QR transactions</span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-[#245C45]/15 shadow-2xs">
          <span className="text-xs font-semibold text-[#252A27]/60 block uppercase">Pre-booked Meal Credits</span>
          <span className="font-serif text-3xl font-bold text-[#245C45] mt-1 block">28 Credits</span>
          <span className="text-[11px] text-[#6B8F71] mt-0.5 block">Direct university ledger debit</span>
        </div>
      </div>

      {/* Transaction Table */}
      <div className="bg-white rounded-3xl p-6 border border-[#245C45]/15 shadow-2xs">
        <h3 className="font-serif text-lg font-bold text-[#252A27] mb-4">
          Recent Counter Settlements
        </h3>
        <div className="divide-y divide-[#245C45]/5 text-xs">
          {transactions.map((t) => (
            <div key={t.id} className="py-3 flex items-center justify-between gap-3">
              <div>
                <span className="font-semibold text-[#252A27]">{t.student}</span>
                <p className="text-[11px] text-[#252A27]/60">{t.id} · {t.time} · {t.type}</p>
              </div>
              <div className="text-right">
                <span className="font-mono font-bold text-[#245C45] text-sm block">{t.amount}</span>
                <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">{t.status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
