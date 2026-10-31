import { useState } from 'react';
import { Search } from 'lucide-react';

export default function StaffCreditsView() {
  const [prnQuery, setPrnQuery] = useState('');
  const [studentResult, setStudentResult] = useState({
    name: 'Rohan Deshmukh',
    prn: '72018492K',
    plan: 'Semester Saver 2026',
    available: 12,
    used: 18,
    status: 'Active',
  });

  const handleLookup = (e) => {
    e.preventDefault();
    if (prnQuery.trim()) {
      setStudentResult({
        name: 'Verified Student Diner',
        prn: prnQuery.trim().toUpperCase(),
        plan: 'Standard Dining Credit',
        available: 10,
        used: 15,
        status: 'Active',
      });
    }
  };

  return (
    <div className="space-y-6 text-left">
      <div>
        <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#252A27]">
          Student Meal Credit Lookup
        </h1>
        <p className="text-xs sm:text-sm text-[#252A27]/75 mt-0.5">
          Verify student semester meal balances and authorize emergency meal grants
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <form onSubmit={handleLookup} className="lg:col-span-6 bg-white p-6 rounded-3xl border border-[#245C45]/15 shadow-2xs space-y-4">
          <h3 className="font-serif text-lg font-bold text-[#252A27] pb-2 border-b border-[#245C45]/10">
            Search Student by PRN / ID
          </h3>
          <div>
            <label className="block text-xs font-semibold text-[#252A27] mb-1">
              Enter Student PRN / RFID Code
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-[#245C45] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={prnQuery}
                onChange={(e) => setPrnQuery(e.target.value)}
                placeholder="e.g. 72018492K"
                className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-[#245C45]/20 rounded-xl outline-none focus:border-[#245C45] font-mono"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 bg-[#245C45] hover:bg-[#164B38] text-white text-xs font-semibold rounded-xl transition-all cursor-pointer shadow-xs"
          >
            Check Credit Balance
          </button>
        </form>

        <div className="lg:col-span-6 bg-white p-6 rounded-3xl border border-[#245C45]/15 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-[#245C45]/10">
              <span className="text-xs font-bold text-[#245C45] uppercase tracking-wider">Student Ledger Summary</span>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">{studentResult.status}</span>
            </div>

            <div className="my-4 space-y-2 text-xs">
              <p><strong>Student Name:</strong> {studentResult.name}</p>
              <p><strong>University PRN:</strong> <span className="font-mono">{studentResult.prn}</span></p>
              <p><strong>Active Plan:</strong> {studentResult.plan}</p>
              <div className="pt-2 flex gap-4">
                <div className="p-3 rounded-2xl bg-[#E6EFE7] flex-1">
                  <span className="text-[10px] text-[#245C45] uppercase font-bold block">Available</span>
                  <span className="font-serif text-2xl font-bold text-[#245C45]">{studentResult.available} Credits</span>
                </div>
                <div className="p-3 rounded-2xl bg-[#F8F7F2] flex-1">
                  <span className="text-[10px] text-[#252A27]/60 uppercase font-bold block">Consumed</span>
                  <span className="font-serif text-2xl font-bold text-[#252A27]">{studentResult.used} Plates</span>
                </div>
              </div>
            </div>
          </div>

          <p className="text-[10px] text-[#252A27]/50 italic">
            * Direct campus RFID sync is simulated for frontend prototype presentation.
          </p>
        </div>
      </div>
    </div>
  );
}
