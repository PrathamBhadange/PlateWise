import { useState, useEffect } from 'react';
import {
  Utensils,
  DollarSign,
  TrendingDown,
  Flame,
  Download,
  Calendar,
  AlertTriangle,
  Award,
} from 'lucide-react';
import {
  ResponsiveContainer,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  Line,
  ComposedChart,
} from 'recharts';
import Member4Header from '../../components/dashboard/Member4Header';
import StatCard from '../../components/dashboard/StatCard';
import ConfidenceChip from '../../components/dashboard/ConfidenceChip';
import LoadingSpinner from '../../components/dashboard/LoadingSpinner';
import ErrorMessage from '../../components/dashboard/ErrorMessage';
import EmptyState from '../../components/dashboard/EmptyState';
import {
  getKitchenSummary,
  getKitchenSalesReport,
  getDemandRecommendation,
} from '../../services/member4Api';

export default function KitchenDashboard() {
  const [selectedDate, setSelectedDate] = useState(
    () => new Date().toISOString().split('T')[0]
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const [summaryData, setSummaryData] = useState(null);
  const [salesReport, setSalesReport] = useState([]);
  const [demandData, setDemandData] = useState([]);

  useEffect(() => {
    let active = true;

    async function fetchData() {
      try {
        const [sumRes, reportRes, demandRes] = await Promise.all([
          getKitchenSummary(selectedDate),
          getKitchenSalesReport(),
          getDemandRecommendation(selectedDate),
        ]);

        if (active) {
          setSummaryData(sumRes);
          setSalesReport(reportRes.data || []);
          setDemandData(demandRes.recommendations || []);
          setLoading(false);
        }
      } catch (err) {
        if (active) {
          console.error('Failed to load kitchen dashboard data:', err);
          setError(err.message || 'Failed to load kitchen metrics');
          setLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      active = false;
    };
  }, [selectedDate, refreshTrigger]);

  const handleDateChange = (newDate) => {
    setLoading(true);
    setSelectedDate(newDate);
  };

  const handleRefresh = () => {
    setLoading(true);
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleExportCSV = () => {
    if (!demandData || demandData.length === 0) return;

    const headers = [
      'Menu Item ID',
      'Dish Name',
      'Category',
      'Price (INR)',
      'Weekday Historical Avg Sold',
      'Historical Waste %',
      'Pre-orders',
      'Recommended Cook Qty',
      'Confidence Level',
    ];

    const rows = demandData.map((d) => [
      d.menu_item_id,
      `"${d.item_name}"`,
      `"${d.category}"`,
      d.price,
      d.weekday_avg_sold,
      d.historical_waste_pct,
      d.pre_orders,
      d.recommended_qty,
      d.confidence_level,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `platewise_demand_recommendation_${selectedDate}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const summary = summaryData?.summary || {};
  const topSelling = summaryData?.topSelling || [];
  const mostWasted = summaryData?.mostWasted || [];

  return (
    <div className="min-h-screen bg-[#F8F7F2] text-[#252A27] flex flex-col font-sans">
      <Member4Header
        title="Kitchen & Production Analytics"
        subtitle="Demand forecasting, daily batch prep recommendations, and waste tracking"
        onRoleChange={handleRefresh}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Top Controls: Date Picker & Export Action */}
        <div className="bg-white rounded-2xl border border-[#245C45]/10 shadow-sm p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#E6EFE7] text-[#245C45]">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <label
                htmlFor="target-date"
                className="block text-xs font-semibold uppercase tracking-wider text-[#252A27]/60"
              >
                Production Target Date
              </label>
              <input
                id="target-date"
                type="date"
                value={selectedDate}
                onChange={(e) => handleDateChange(e.target.value)}
                className="mt-0.5 bg-white border border-[#245C45]/20 rounded-lg text-sm px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#245C45]/30 focus:border-[#245C45] font-medium"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleExportCSV}
              disabled={demandData.length === 0}
              className="inline-flex items-center gap-2 bg-[#245C45] hover:bg-[#164B38] text-white rounded-xl text-sm font-medium px-4 py-2.5 transition-all duration-200 shadow-sm cursor-pointer disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>Export Prep Sheet (CSV)</span>
            </button>
          </div>
        </div>

        {error && <ErrorMessage message={error} onRetry={handleRefresh} />}

        {loading ? (
          <LoadingSpinner message="Calculating dynamic demand recommendations..." />
        ) : (
          <>
            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
              <StatCard
                title="Portions Sold"
                value={Number(summary.total_sold || 0).toLocaleString()}
                subtitle="Fulfilled orders"
                icon={Utensils}
              />
              <StatCard
                title="Portions Cooked"
                value={Number(summary.total_cooked || 0).toLocaleString()}
                subtitle="Total canteen batch preparation"
                icon={Flame}
              />
              <StatCard
                title="Portions Leftover"
                value={Number(summary.total_leftover || 0).toLocaleString()}
                subtitle={`${summary.waste_percentage || 0}% leftover rate`}
                icon={TrendingDown}
                alert={Number(summary.waste_percentage || 0) > 15}
              />
              <StatCard
                title="Daily Revenue"
                value={`₹${Number(summary.total_revenue || 0).toLocaleString('en-IN', {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                })}`}
                subtitle="Canteen counter & pre-orders"
                icon={DollarSign}
              />
            </div>

            {/* Demand Recommendation Table */}
            <div className="bg-white rounded-2xl border border-[#245C45]/10 shadow-sm p-5 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                <div>
                  <h2 className="text-lg sm:text-xl font-serif font-bold text-[#252A27]">
                    Algorithmic Demand Recommendations
                  </h2>
                  <p className="text-xs text-[#252A27]/60">
                    Weighted 4-week weekday averages, active pre-orders, and &gt;15% waste reduction damping
                  </p>
                </div>
                <span className="self-start sm:self-auto bg-[#E6EFE7] text-[#245C45] rounded-full text-xs font-semibold px-3 py-1">
                  Target: {selectedDate}
                </span>
              </div>

              {demandData.length === 0 ? (
                <EmptyState
                  title="No demand forecast available"
                  description="No menu items registered or insufficient historical data points."
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse min-w-[650px]">
                    <thead>
                      <tr className="border-b border-[#245C45]/10 text-xs font-semibold uppercase tracking-wider text-[#252A27]/60">
                        <th className="py-3 px-3">Dish / Category</th>
                        <th className="py-3 px-3 text-right">Price</th>
                        <th className="py-3 px-3 text-right">4-Wk Weekday Avg</th>
                        <th className="py-3 px-3 text-right">Waste Rate</th>
                        <th className="py-3 px-3 text-right">Pre-Orders</th>
                        <th className="py-3 px-3 text-right">Recommended Cook</th>
                        <th className="py-3 px-3 text-center">Confidence</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#245C45]/5">
                      {demandData.map((dish) => {
                        const isHighWaste = Number(dish.historical_waste_pct) > 15;
                        return (
                          <tr
                            key={dish.menu_item_id}
                            className="hover:bg-[#F8F7F2]/60 transition-colors"
                          >
                            <td className="py-3.5 px-3">
                              <div className="font-semibold text-[#252A27]">
                                {dish.item_name}
                              </div>
                              <span className="text-xs text-[#6B8F71] font-medium">
                                {dish.category}
                              </span>
                            </td>
                            <td className="py-3.5 px-3 text-right font-medium">
                              ₹{dish.price}
                            </td>
                            <td className="py-3.5 px-3 text-right font-medium">
                              {dish.weekday_avg_sold}
                            </td>
                            <td className="py-3.5 px-3 text-right">
                              <span
                                className={`text-xs font-semibold ${
                                  isHighWaste
                                    ? 'text-[#B3402F] bg-[#B3402F]/10 px-2 py-0.5 rounded-md'
                                    : 'text-[#6B8F71]'
                                }`}
                              >
                                {dish.historical_waste_pct}%
                              </span>
                            </td>
                            <td className="py-3.5 px-3 text-right font-semibold text-[#245C45]">
                              {dish.pre_orders}
                            </td>
                            <td className="py-3.5 px-3 text-right">
                              <span className="inline-block bg-[#245C45] text-white font-serif font-bold px-3 py-1 rounded-lg text-sm shadow-xs">
                                {dish.recommended_qty}
                              </span>
                            </td>
                            <td className="py-3.5 px-3 text-center">
                              <ConfidenceChip level={dish.confidence_level} />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Sales Report Chart (Recharts) */}
            <div className="bg-white rounded-2xl border border-[#245C45]/10 shadow-sm p-5 sm:p-6">
              <div className="mb-4">
                <h2 className="text-lg sm:text-xl font-serif font-bold text-[#252A27]">
                  Production Volume & Sales History
                </h2>
                <p className="text-xs text-[#252A27]/60">
                  Cooked vs. Sold Portions with 7-Day Moving Average Revenue
                </p>
              </div>

              {salesReport.length === 0 ? (
                <EmptyState title="No sales data in this date range" />
              ) : (
                <div className="h-72 sm:h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                      data={salesReport}
                      margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#245C45" strokeOpacity={0.1} />
                      <XAxis
                        dataKey="sale_date"
                        tick={{ fill: '#252A27', fontSize: 11 }}
                        tickFormatter={(d) => d.slice(5)}
                      />
                      <YAxis yAxisId="left" tick={{ fill: '#252A27', fontSize: 11 }} />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        tick={{ fill: '#E99A55', fontSize: 11 }}
                        tickFormatter={(v) => `₹${v / 1000}k`}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#FFFFFF',
                          borderColor: '#245C45',
                          borderRadius: '12px',
                          fontSize: '12px',
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                      <Bar
                        yAxisId="left"
                        dataKey="total_cooked"
                        name="Cooked (Portions)"
                        fill="#6B8F71"
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar
                        yAxisId="left"
                        dataKey="total_sold"
                        name="Sold (Portions)"
                        fill="#245C45"
                        radius={[4, 4, 0, 0]}
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="moving_avg_7d_revenue"
                        name="7-Day Avg Revenue"
                        stroke="#E99A55"
                        strokeWidth={2.5}
                        dot={false}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Top-Selling & Most-Wasted Two-Column Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Top Selling */}
              <div className="bg-white rounded-2xl border border-[#245C45]/10 shadow-sm p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 rounded-xl bg-[#E6EFE7] text-[#245C45]">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-serif font-bold text-[#252A27]">Top-Selling Dishes</h3>
                    <p className="text-xs text-[#252A27]/60">Ranked by aggregate portions sold</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {topSelling.map((item, idx) => (
                    <div
                      key={item.menu_item_id || idx}
                      className="flex items-center justify-between p-3 rounded-xl bg-[#F8F7F2] border border-[#245C45]/5"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-[#245C45] text-white flex items-center justify-center text-xs font-bold">
                          {idx + 1}
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-[#252A27]">{item.item_name}</p>
                          <span className="text-xs text-[#6B8F71]">{item.category}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-[#245C45]">{item.total_sold} sold</div>
                        <div className="text-xs text-[#252A27]/60">₹{Number(item.total_revenue || 0).toLocaleString()}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Most Wasted */}
              <div className="bg-white rounded-2xl border border-[#245C45]/10 shadow-sm p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 rounded-xl bg-[#B3402F]/10 text-[#B3402F]">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-serif font-bold text-[#252A27]">Highest Wastage Dishes</h3>
                    <p className="text-xs text-[#252A27]/60">Dishes with largest leftover ratios</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {mostWasted.map((item, idx) => (
                    <div
                      key={item.menu_item_id || idx}
                      className="flex items-center justify-between p-3 rounded-xl bg-[#F8F7F2] border border-[#245C45]/5"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-[#B3402F]/15 text-[#B3402F] flex items-center justify-center text-xs font-bold">
                          {idx + 1}
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-[#252A27]">{item.item_name}</p>
                          <span className="text-xs text-[#6B8F71]">{item.category}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-[#B3402F]">
                          {item.waste_percentage}% waste
                        </div>
                        <div className="text-xs text-[#252A27]/60">{item.total_leftover} portions leftover</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
