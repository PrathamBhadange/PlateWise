import { useState, useEffect } from 'react';
import SalesChart from '../../components/cashier/SalesChart';
import { Sparkles, Utensils, IndianRupee } from 'lucide-react';
import api from '../../services/api';

export default function CashierReportsView() {
  const [overview, setOverview] = useState({
    orders_served_today: 0,
    total_sales_today: 0,
    orders_in_queue: 0,
    total_plates_today: 0,
    satisfaction: 98,
    hourly_sales: [],
    top_items: [],
  });

  useEffect(() => {
    let active = true;

    async function fetchOverview() {
      try {
        const res = await api.get('/cashier/overview');
        if (active) {
          setOverview(res.data);
        }
      } catch (err) {
        console.error('[CashierReportsView] Failed to load overview metrics:', err);
      }
    }

    fetchOverview();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="space-y-6 text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#252A27]">
            Cafeteria Operations & Sales Reports
          </h1>
          <p className="text-xs sm:text-sm text-[#252A27]/75 mt-0.5">
            Audit daily meals served, counter revenue, and hourly demand from live database records
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-[#245C45]/15 shadow-2xs">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-[#E6EFE7] text-[#245C45] flex items-center justify-center">
              <Utensils className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold text-[#252A27]/70 uppercase">Plates Handed Over</span>
          </div>
          <span className="font-serif text-3xl font-bold text-[#245C45] block">
            {overview.orders_served_today}
          </span>
          <span className="text-[11px] text-[#6B8F71] mt-1 block">
            Verified with QR token at counter
          </span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-[#245C45]/15 shadow-2xs">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-[#E99A55]/15 text-[#E99A55] flex items-center justify-center">
              <IndianRupee className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold text-[#252A27]/70 uppercase">Total Sales Volume</span>
          </div>
          <span className="font-serif text-3xl font-bold text-[#245C45] block">
            ₹{overview.total_sales_today.toLocaleString('en-IN')}
          </span>
          <span className="text-[11px] text-[#6B8F71] mt-1 block">
            Across {overview.total_plates_today} total meal portions
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6">
          <SalesChart
            hourlySales={overview.hourly_sales}
            topItems={overview.top_items}
            totalSales={overview.total_sales_today}
            totalPlates={overview.total_plates_today}
          />
        </div>

        <div className="lg:col-span-6 bg-white rounded-3xl p-6 border border-[#245C45]/15 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold text-[#245C45] uppercase tracking-wider pb-2 border-b border-[#245C45]/10">
            <Sparkles className="w-4 h-4 text-[#E99A55]" />
            <span>Shift Zero-Waste Highlights</span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3.5 rounded-2xl bg-[#E6EFE7]/50 border border-[#245C45]/15">
              <span className="font-bold text-[#245C45] block">Pre-Order Fulfillment</span>
              <p className="text-[11px] text-[#252A27]/75 mt-0.5">
                Pre-ordered meals claimed at counter match kitchen batch projections, preventing over-preparation.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#F8F7F2] border border-[#245C45]/10">
              <span className="font-bold text-[#252A27] block">Surplus Redistribution Link</span>
              <p className="text-[11px] text-[#252A27]/75 mt-0.5">
                Surplus portions remaining after lunch and dinner windows are automatically logged for registered NGO partners.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
