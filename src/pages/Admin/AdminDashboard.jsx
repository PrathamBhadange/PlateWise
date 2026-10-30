import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  HeartHandshake,
  Trash2,
  TrendingUp,
  AlertCircle,
  FileText,
  Percent,
  ArrowRight,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import Member4Header from '../../components/dashboard/Member4Header';
import StatCard from '../../components/dashboard/StatCard';
import LoadingSpinner from '../../components/dashboard/LoadingSpinner';
import ErrorMessage from '../../components/dashboard/ErrorMessage';
import EmptyState from '../../components/dashboard/EmptyState';
import { getAdminImpact, getAuditLogs } from '../../services/member4Api';

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const [impactData, setImpactData] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);

  useEffect(() => {
    let active = true;

    async function fetchData() {
      try {
        const [impRes, logsRes] = await Promise.all([
          getAdminImpact(),
          getAuditLogs(),
        ]);

        if (active) {
          setImpactData(impRes);
          setAuditLogs(logsRes || []);
          setLoading(false);
        }
      } catch (err) {
        if (active) {
          console.error('Failed to load admin metrics:', err);
          setError(err.message || 'Failed to load administrative overview');
          setLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      active = false;
    };
  }, [refreshTrigger]);

  const handleRefresh = () => {
    setLoading(true);
    setRefreshTrigger((prev) => prev + 1);
  };

  const impact = impactData?.impact || {};
  const monthlyTrend = impactData?.monthlyTrend || [];
  const kpis = impactData?.complaintKpis || {};

  // Color palette for complaints by status
  const complaintStatusData = [
    { name: 'Resolved', value: kpis.resolved_count || 0, color: '#245C45' },
    { name: 'Open', value: kpis.open_count || 0, color: '#6B8F71' },
    { name: 'In Progress', value: kpis.in_progress_count || 0, color: '#E99A55' },
    { name: 'Escalated', value: kpis.escalated_count || 0, color: '#B3402F' },
  ].filter((d) => d.value > 0);

  return (
    <div className="min-h-screen bg-[#F8F7F2] text-[#252A27] flex flex-col font-sans">
      <Member4Header
        title="Admin Governance & Sustainability Impact"
        subtitle="Zero-waste impact metrics, grievance resolution SLAs, and immutable audit logs"
        onRoleChange={handleRefresh}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {error && <ErrorMessage message={error} onRetry={handleRefresh} />}

        {loading ? (
          <LoadingSpinner message="Aggregating campus impact data..." />
        ) : (
          <>
            {/* Impact Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
              <StatCard
                title="Portions Saved"
                value={Number(impact.total_saved_portions || 0).toLocaleString()}
                subtitle="Sold + Donated portions rescued"
                icon={TrendingUp}
              />
              <StatCard
                title="Portions Donated"
                value={Number(impact.portions_donated || 0).toLocaleString()}
                subtitle="Partner NGOs & student shelters"
                icon={HeartHandshake}
              />
              <StatCard
                title="Portions Wasted"
                value={Number(impact.portions_wasted || 0).toLocaleString()}
                subtitle="Discarded post-shelf-life"
                icon={Trash2}
                alert={Number(impact.waste_percentage || 0) > 12}
              />
              <StatCard
                title="Campus Waste Rate"
                value={`${impact.waste_percentage || 0}%`}
                subtitle="Target threshold: <10%"
                icon={Percent}
                alert={Number(impact.waste_percentage || 0) > 10}
              />
            </div>

            {/* Overdue Alert Banner if overdue complaints exist */}
            {kpis.overdue_count > 0 && (
              <div className="bg-[#B3402F]/10 border border-[#B3402F]/30 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-[#B3402F] text-white">
                    <AlertCircle className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-base font-serif font-bold text-[#B3402F]">
                      {kpis.overdue_count} Overdue SLA Grievance Tickets
                    </h3>
                    <p className="text-xs text-[#252A27]/80">
                      Food quality or hygiene complaints past resolution deadlines require immediate administrative action.
                    </p>
                  </div>
                </div>

                <Link
                  to="/admin/complaints"
                  className="inline-flex items-center gap-1.5 self-start sm:self-auto bg-[#B3402F] hover:bg-[#8f3325] text-white rounded-xl text-xs font-semibold px-4 py-2.5 transition-all shadow-xs"
                >
                  <span>Review Escalations</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}

            {/* Charts Row: Monthly Trend & Complaints by Status */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* Monthly Trend Chart (2 columns) */}
              <div className="lg:col-span-2 bg-white rounded-2xl border border-[#245C45]/10 shadow-sm p-5 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-serif font-bold text-[#252A27]">
                      Month-over-Month Sustainability Trend
                    </h2>
                    <p className="text-xs text-[#252A27]/60">
                      Monthly portions cooked, sold, and leftover across semesters
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-[#245C45] bg-[#E6EFE7] px-2.5 py-1 rounded-full">
                    Window: 3 Months
                  </span>
                </div>

                <div className="h-64 sm:h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={monthlyTrend}
                      margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#245C45" strokeOpacity={0.1} />
                      <XAxis dataKey="sale_month" tick={{ fill: '#252A27', fontSize: 11 }} />
                      <YAxis tick={{ fill: '#252A27', fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#FFFFFF',
                          borderColor: '#245C45',
                          borderRadius: '12px',
                          fontSize: '12px',
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                      <Bar dataKey="monthly_cooked" name="Cooked" fill="#6B8F71" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="monthly_sold" name="Sold" fill="#245C45" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="monthly_leftover" name="Leftover" fill="#E99A55" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Complaints by Status Pie Chart (1 column) */}
              <div className="bg-white rounded-2xl border border-[#245C45]/10 shadow-sm p-5 sm:p-6 flex flex-col justify-between">
                <div>
                  <h2 className="text-lg font-serif font-bold text-[#252A27]">
                    Complaints by Status
                  </h2>
                  <p className="text-xs text-[#252A27]/60">
                    Total {kpis.total_complaints || 0} tickets logged to date
                  </p>
                </div>

                <div className="h-56 w-full my-auto flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={complaintStatusData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={4}
                      >
                        {complaintStatusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-3 border-t border-[#245C45]/10 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#245C45]"></span>
                    <span>Resolved: {kpis.resolved_count || 0}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#6B8F71]"></span>
                    <span>Open: {kpis.open_count || 0}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#E99A55]"></span>
                    <span>In Progress: {kpis.in_progress_count || 0}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#B3402F]"></span>
                    <span className="font-semibold text-[#B3402F]">Escalated: {kpis.escalated_count || 0}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Audit Log Table */}
            <div className="bg-white rounded-2xl border border-[#245C45]/10 shadow-sm p-5 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-[#E6EFE7] text-[#245C45]">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-serif font-bold text-[#252A27]">
                      Database Audit Logs (CDC)
                    </h2>
                    <p className="text-xs text-[#252A27]/60">
                      Immutable change data capture trail populated via MySQL triggers
                    </p>
                  </div>
                </div>
                <span className="text-xs text-[#252A27]/60">
                  Showing last {auditLogs.length} events
                </span>
              </div>

              {auditLogs.length === 0 ? (
                <EmptyState title="No audit events captured yet" />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse min-w-[650px]">
                    <thead>
                      <tr className="border-b border-[#245C45]/10 font-semibold uppercase tracking-wider text-[#252A27]/60">
                        <th className="py-2.5 px-3">ID</th>
                        <th className="py-2.5 px-3">Table / Record</th>
                        <th className="py-2.5 px-3">Action</th>
                        <th className="py-2.5 px-3">Modified By</th>
                        <th className="py-2.5 px-3">Timestamp</th>
                        <th className="py-2.5 px-3">Change Payload</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#245C45]/5 font-mono">
                      {auditLogs.slice(0, 15).map((log) => (
                        <tr key={log.audit_log_id} className="hover:bg-[#F8F7F2]/60">
                          <td className="py-2.5 px-3 font-semibold text-[#252A27]">
                            #{log.audit_log_id}
                          </td>
                          <td className="py-2.5 px-3 font-sans">
                            <span className="font-semibold text-[#245C45]">{log.table_name}</span>
                            <span className="text-[#252A27]/60"> (id: {log.record_id})</span>
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                log.action === 'INSERT'
                                  ? 'bg-[#E6EFE7] text-[#245C45]'
                                  : log.action === 'UPDATE'
                                  ? 'bg-[#E99A55]/20 text-[#252A27]'
                                  : 'bg-[#B3402F]/15 text-[#B3402F]'
                              }`}
                            >
                              {log.action}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-sans text-[#252A27]/80">
                            {log.changed_by_name || `User #${log.changed_by || 'system'}`}
                          </td>
                          <td className="py-2.5 px-3 text-[#252A27]/60">
                            {log.changed_at ? new Date(log.changed_at).toLocaleString() : 'N/A'}
                          </td>
                          <td className="py-2.5 px-3 max-w-xs truncate text-[11px] text-[#252A27]/70">
                            {JSON.stringify(log.new_value || log.old_value || {})}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
