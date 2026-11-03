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
  UserCheck,
  ShieldCheck,
  Check,
  X,
  UserPlus,
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
import {
  getAdminImpact,
  getAuditLogs,
  getPendingUsers,
  approveUser,
  rejectUser,
  promoteToKitchen,
  getAdminStudents,
} from '../../services/member4Api';

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const [impactData, setImpactData] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [students, setStudents] = useState([]);

  const [actionNotice, setActionNotice] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [isPromoting, setIsPromoting] = useState(false);
  const [confirmPromoteUser, setConfirmPromoteUser] = useState(null);

  useEffect(() => {
    let active = true;

    async function fetchData() {
      try {
        const [impRes, logsRes, pendingRes, studentsRes] = await Promise.all([
          getAdminImpact(),
          getAuditLogs(),
          getPendingUsers().catch(() => []),
          getAdminStudents().catch(() => []),
        ]);

        if (active) {
          setImpactData(impRes);
          setAuditLogs(logsRes || []);
          setPendingUsers(pendingRes || []);
          setStudents(studentsRes || []);
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

  const handleApprove = async (userId) => {
    setActionLoadingId(userId);
    setActionNotice(null);
    setActionError(null);
    try {
      const res = await approveUser(userId);
      setActionNotice(res.message || 'Staff account approved successfully');
      setPendingUsers((prev) => prev.filter((u) => u.user_id !== userId));
      setRefreshTrigger((prev) => prev + 1);
    } catch (err) {
      setActionError(err.response?.data?.message || err.message || 'Failed to approve staff account');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async (userId) => {
    setActionLoadingId(userId);
    setActionNotice(null);
    setActionError(null);
    try {
      const res = await rejectUser(userId);
      setActionNotice(res.message || 'Staff account rejected');
      setPendingUsers((prev) => prev.filter((u) => u.user_id !== userId));
      setRefreshTrigger((prev) => prev + 1);
    } catch (err) {
      setActionError(err.response?.data?.message || err.message || 'Failed to reject staff account');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handlePromoteConfirm = async () => {
    if (!confirmPromoteUser) return;
    setIsPromoting(true);
    setActionNotice(null);
    setActionError(null);
    try {
      const res = await promoteToKitchen(confirmPromoteUser.user_id);
      setActionNotice(res.message || 'Student promoted to kitchen staff successfully');
      setConfirmPromoteUser(null);
      setSelectedStudentId('');
      setRefreshTrigger((prev) => prev + 1);
    } catch (err) {
      setActionError(err.response?.data?.message || err.message || 'Failed to promote student');
    } finally {
      setIsPromoting(false);
    }
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

            {/* Action Feedback Alerts */}
            {actionNotice && (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{actionNotice}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setActionNotice(null)}
                  className="text-emerald-700 hover:text-emerald-900 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {actionError && (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{actionError}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setActionError(null)}
                  className="text-rose-700 hover:text-rose-900 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Staff Registrations & Approvals Section */}
            <div className="bg-white rounded-2xl border border-[#245C45]/10 shadow-sm p-5 sm:p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#245C45]/10">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-[#E6EFE7] text-[#245C45]">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-serif font-bold text-[#252A27]">
                      Staff Approvals & Role Management
                    </h2>
                    <p className="text-xs text-[#252A27]/60">
                      Review cafeteria staff account registrations and assign administrative permissions
                    </p>
                  </div>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 self-start sm:self-auto">
                  {pendingUsers.length} Pending Approval{pendingUsers.length !== 1 ? 's' : ''}
                </span>
              </div>

              {pendingUsers.length === 0 ? (
                <div className="p-6 text-center bg-[#F8F7F2] rounded-xl border border-[#245C45]/10">
                  <ShieldCheck className="w-8 h-8 text-[#245C45] mx-auto mb-2 opacity-80" />
                  <p className="text-xs font-semibold text-[#252A27]">All staff registrations reviewed</p>
                  <p className="text-[11px] text-[#252A27]/60 mt-0.5">
                    No cafeteria staff accounts are currently awaiting administrator approval.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse min-w-[650px]">
                    <thead>
                      <tr className="border-b border-[#245C45]/10 font-semibold uppercase tracking-wider text-[#252A27]/60">
                        <th className="py-2.5 px-3">Applicant Name</th>
                        <th className="py-2.5 px-3">Email Address</th>
                        <th className="py-2.5 px-3">Requested Role</th>
                        <th className="py-2.5 px-3">Registered On</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#245C45]/5">
                      {pendingUsers.map((pUser) => (
                        <tr key={pUser.user_id || pUser.id} className="hover:bg-[#F8F7F2]/60">
                          <td className="py-2.5 px-3 font-semibold text-[#252A27]">
                            {pUser.full_name}
                            <span className="text-[10px] text-[#252A27]/50 block">ID: #{pUser.user_id || pUser.id}</span>
                          </td>
                          <td className="py-2.5 px-3 text-[#252A27]/80">{pUser.email}</td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#E6EFE7] text-[#245C45] uppercase">
                              {pUser.role} (Kitchen)
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-[#252A27]/60">
                            {pUser.created_at ? new Date(pUser.created_at).toLocaleDateString() : 'N/A'}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                              {pUser.account_status}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <div className="inline-flex items-center gap-2">
                              <button
                                type="button"
                                disabled={actionLoadingId === (pUser.user_id || pUser.id)}
                                onClick={() => handleApprove(pUser.user_id || pUser.id)}
                                className="px-3 py-1 rounded-lg text-xs font-semibold bg-[#245C45] text-white hover:bg-[#1b4634] transition-colors cursor-pointer disabled:opacity-50"
                              >
                                {actionLoadingId === (pUser.user_id || pUser.id) ? '...' : 'Approve'}
                              </button>
                              <button
                                type="button"
                                disabled={actionLoadingId === (pUser.user_id || pUser.id)}
                                onClick={() => handleReject(pUser.user_id || pUser.id)}
                                className="px-3 py-1 rounded-lg text-xs font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition-colors cursor-pointer disabled:opacity-50"
                              >
                                {actionLoadingId === (pUser.user_id || pUser.id) ? '...' : 'Reject'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Promotion of Existing Misregistered Accounts */}
              <div className="pt-4 border-t border-[#245C45]/10">
                <div className="flex items-center gap-2 mb-2">
                  <UserPlus className="w-4 h-4 text-[#245C45]" />
                  <h3 className="text-sm font-serif font-bold text-[#252A27]">
                    Promote Existing Student to Kitchen Staff
                  </h3>
                </div>
                <p className="text-xs text-[#252A27]/70 mb-3">
                  Allows promoting student accounts (e.g. staff who inadvertently registered as students) to cafeteria staff. Preserves credentials, login history, and email.
                </p>

                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                  <select
                    value={selectedStudentId}
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                    className="w-full sm:w-80 bg-[#F8F7F2] border border-[#245C45]/20 rounded-xl px-3 py-2 text-xs text-[#252A27] focus:outline-none focus:ring-2 focus:ring-[#245C45]/30 font-medium"
                  >
                    <option value="">-- Select a student account to promote --</option>
                    {students.map((st) => (
                      <option key={st.user_id} value={st.user_id}>
                        {st.full_name} ({st.email}) - ID #{st.user_id}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    disabled={!selectedStudentId}
                    onClick={() => {
                      const found = students.find((s) => String(s.user_id) === String(selectedStudentId));
                      if (found) setConfirmPromoteUser(found);
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#245C45] text-white hover:bg-[#1b4634] transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
                  >
                    Promote to Kitchen Staff
                  </button>
                </div>
              </div>
            </div>

            {/* Confirmation Dialog Modal for Account Promotion */}
            {confirmPromoteUser && (
              <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-[#245C45]/20 shadow-2xl space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-[#E6EFE7] text-[#245C45] flex items-center justify-center mx-auto">
                    <UserPlus className="w-6 h-6" />
                  </div>
                  <div className="text-center">
                    <h3 className="text-lg font-serif font-bold text-[#252A27]">
                      Confirm Staff Promotion
                    </h3>
                    <p className="text-xs text-[#252A27]/70 mt-1">
                      Are you sure you want to promote <strong>{confirmPromoteUser.full_name}</strong> (<code>{confirmPromoteUser.email}</code>) to <strong>Kitchen Staff</strong>?
                    </p>
                  </div>
                  <div className="bg-[#F8F7F2] rounded-xl p-3 border border-[#245C45]/10 text-[11px] text-[#252A27]/70 space-y-1">
                    <p>• Account role will transition from <code>student</code> to <code>kitchen</code>.</p>
                    <p>• Account status will be set to <code>active</code>.</p>
                    <p>• Password hash, user ID (#{confirmPromoteUser.user_id}), and email are strictly preserved.</p>
                  </div>
                  <div className="flex gap-2 justify-end pt-2">
                    <button
                      type="button"
                      disabled={isPromoting}
                      onClick={() => setConfirmPromoteUser(null)}
                      className="px-4 py-2 rounded-xl text-xs font-semibold bg-stone-100 text-[#252A27] hover:bg-stone-200 transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={isPromoting}
                      onClick={handlePromoteConfirm}
                      className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#245C45] text-white hover:bg-[#1b4634] transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
                    >
                      {isPromoting ? 'Promoting...' : 'Confirm Promotion'}
                    </button>
                  </div>
                </div>
              </div>
            )}

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
