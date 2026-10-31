import TodaysOrdersTable from '../../components/staff/TodaysOrdersTable';

export default function TodaysOrdersView() {
  return (
    <div className="space-y-6 text-left">
      <div>
        <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#252A27]">
          Today's Counter Orders
        </h1>
        <p className="text-xs sm:text-sm text-[#252A27]/75 mt-0.5">
          Full audit list of all pre-booked and counter walk-in tokens for Friday, 30 Oct 2026
        </p>
      </div>

      <TodaysOrdersTable />
    </div>
  );
}
