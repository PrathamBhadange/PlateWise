import { useState, useEffect } from 'react';
import {
  AlertCircle,
  Filter,
  Flame,
  Clock,
  CheckCircle2,
  X,
  History,
  Send,
} from 'lucide-react';
import Member4Header from '../../components/dashboard/Member4Header';
import SeverityBadge from '../../components/dashboard/SeverityBadge';
import StatusBadge from '../../components/dashboard/StatusBadge';
import LoadingSpinner from '../../components/dashboard/LoadingSpinner';
import ErrorMessage from '../../components/dashboard/ErrorMessage';
import EmptyState from '../../components/dashboard/EmptyState';
import {
  getAdminComplaints,
  getComplaintActions,
  updateComplaint,
  escalateOverdueComplaints,
} from '../../services/member4Api';

export default function AdminComplaints() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [escalating, setEscalating] = useState(false);
  const [notification, setNotification] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const [complaints, setComplaints] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [filters, setFilters] = useState({
    status: 'all',
    severity: 'all',
    category: 'all',
  });

  // Side panel state
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [panelLoading, setPanelLoading] = useState(false);
  const [assignee, setAssignee] = useState('');
  const [statusVal, setStatusVal] = useState('');
  const [remarks, setRemarks] = useState('');
  const [savingAction, setSavingAction] = useState(false);

  useEffect(() => {
    let active = true;

    async function fetchData() {
      try {
        const res = await getAdminComplaints(filters);
        if (active) {
          setComplaints(res.complaints || []);
          setStaffList(res.staff || []);
          setLoading(false);
        }
      } catch (err) {
        if (active) {
          console.error('Failed to load complaints:', err);
          setError(err.message || 'Failed to fetch complaints');
          setLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      active = false;
    };
  }, [filters, refreshTrigger]);

  const handleRefresh = () => {
    setLoading(true);
    setRefreshTrigger((prev) => prev + 1);
  };

  // Load complaint actions timeline when selecting a ticket
  const handleSelectComplaint = async (c) => {
    setSelectedComplaint(c);
    setAssignee(c.assigned_to || '');
    setStatusVal(c.status || 'open');
    setRemarks('');
    setPanelLoading(true);
    try {
      const acts = await getComplaintActions(c.complaint_id);
      setTimeline(acts || []);
    } catch (err) {
      console.error('Failed to load actions:', err);
    } finally {
      setPanelLoading(false);
    }
  };

  const handleRunEscalation = async () => {
    setEscalating(true);
    try {
      const res = await escalateOverdueComplaints();
      setNotification({
        type: 'success',
        message: `Escalation check complete: ${res.escalated_count} ticket(s) updated to escalated status.`,
      });
      handleRefresh();
    } catch (err) {
      setNotification({
        type: 'error',
        message: err.message || 'Escalation failed',
      });
    } finally {
      setEscalating(false);
    }
  };

  const handleSaveAction = async (e) => {
    e.preventDefault();
    if (!selectedComplaint) return;
    setSavingAction(true);
    try {
      const payload = {
        status: statusVal,
        assigned_to: assignee ? Number(assignee) : null,
        remarks: remarks.trim() || undefined,
      };

      const res = await updateComplaint(selectedComplaint.complaint_id, payload);
      setNotification({
        type: 'success',
        message: `Ticket #${selectedComplaint.complaint_id} updated successfully.`,
      });

      // Update in-memory complaint list
      if (res.complaint) {
        setSelectedComplaint(res.complaint);
      }
      handleRefresh();

      // Refresh timeline
      const acts = await getComplaintActions(selectedComplaint.complaint_id);
      setTimeline(acts || []);
      setRemarks('');
    } catch (err) {
      setNotification({
        type: 'error',
        message: err.message || 'Failed to update ticket',
      });
    } finally {
      setSavingAction(false);
    }
  };

  const formatCountdown = (deadline, isOverdue) => {
    if (!deadline) return 'No deadline set';
    const now = new Date();
    const target = new Date(deadline);
    const diffMs = target - now;
    const diffHours = Math.round(diffMs / 3600000);

    if (diffMs < 0 || isOverdue) {
      return (
        <span className="text-[#B3402F] font-semibold text-xs inline-flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" />
          Overdue by {Math.abs(diffHours)}h
        </span>
      );
    }

    return (
      <span className="text-[#245C45] font-medium text-xs inline-flex items-center gap-1">
        <Clock className="w-3.5 h-3.5" />
        {diffHours}h remaining
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-[#F8F7F2] text-[#252A27] flex flex-col font-sans">
      <Member4Header
        title="Complaints & Escalation Desk"
        subtitle="SLA tracking, incident severity triage, and automated level escalations"
        onRoleChange={handleRefresh}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Notification Toast */}
        {notification && (
          <div
            className={`p-4 rounded-xl flex items-center justify-between text-sm ${
              notification.type === 'error'
                ? 'bg-[#B3402F]/15 text-[#B3402F] border border-[#B3402F]/30'
                : 'bg-[#E6EFE7] text-[#245C45] border border-[#245C45]/20'
            }`}
          >
            <div className="flex items-center gap-2">
              {notification.type === 'error' ? (
                <AlertCircle className="w-4 h-4" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              <span>{notification.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setNotification(null)}
              className="p-1 hover:opacity-75 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Action Header & Automated Escalation Trigger */}
        <div className="bg-white rounded-2xl border border-[#245C45]/10 shadow-sm p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-serif font-bold text-[#252A27]">Active Grievances</h2>
            <p className="text-xs text-[#252A27]/60">
              Filter tickets, review auto-assigned SLA deadlines, and inspect action history
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleRunEscalation}
              disabled={escalating}
              className="inline-flex items-center gap-2 bg-[#B3402F] hover:bg-[#8f3325] text-white rounded-xl text-xs font-semibold px-4 py-2.5 transition-all shadow-sm cursor-pointer disabled:opacity-50"
            >
              <Flame className={`w-4 h-4 ${escalating ? 'animate-spin' : ''}`} />
              <span>{escalating ? 'Evaluating SLAs...' : 'Run Escalation Now'}</span>
            </button>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="bg-white rounded-2xl border border-[#245C45]/10 shadow-sm p-4 sm:p-5 flex flex-wrap items-center gap-4 text-xs font-medium">
          <div className="flex items-center gap-1.5 text-[#245C45]">
            <Filter className="w-4 h-4" />
            <span className="font-semibold uppercase tracking-wider">Filters:</span>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <label htmlFor="filter-status" className="text-[#252A27]/60">Status:</label>
            <select
              id="filter-status"
              value={filters.status}
              onChange={(e) => {
                setLoading(true);
                setFilters((prev) => ({ ...prev, status: e.target.value }));
              }}
              className="bg-white border border-[#245C45]/20 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#245C45]/30 cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="escalated">Escalated</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          {/* Severity Filter */}
          <div className="flex items-center gap-2">
            <label htmlFor="filter-severity" className="text-[#252A27]/60">Severity:</label>
            <select
              id="filter-severity"
              value={filters.severity}
              onChange={(e) => {
                setLoading(true);
                setFilters((prev) => ({ ...prev, severity: e.target.value }));
              }}
              className="bg-white border border-[#245C45]/20 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#245C45]/30 cursor-pointer"
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-2">
            <label htmlFor="filter-category" className="text-[#252A27]/60">Category:</label>
            <select
              id="filter-category"
              value={filters.category}
              onChange={(e) => {
                setLoading(true);
                setFilters((prev) => ({ ...prev, category: e.target.value }));
              }}
              className="bg-white border border-[#245C45]/20 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#245C45]/30 cursor-pointer"
            >
              <option value="all">All Categories</option>
              <option value="hygiene">Hygiene</option>
              <option value="foreign_object">Foreign Object</option>
              <option value="food_quality">Food Quality</option>
              <option value="service">Service</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="ml-auto text-xs text-[#252A27]/60">
            Found {complaints.length} tickets
          </div>
        </div>

        {error && <ErrorMessage message={error} onRetry={handleRefresh} />}

        {loading ? (
          <LoadingSpinner message="Loading complaint desk records..." />
        ) : complaints.length === 0 ? (
          <EmptyState
            title="No complaints matched your filter"
            description="Try adjusting your status or severity filter criteria."
          />
        ) : (
          /* Complaints Table */
          <div className="bg-white rounded-2xl border border-[#245C45]/10 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse min-w-[750px]">
                <thead>
                  <tr className="bg-[#F8F7F2]/80 border-b border-[#245C45]/10 uppercase tracking-wider text-[#252A27]/60 font-semibold">
                    <th className="py-3 px-3.5">ID / Student</th>
                    <th className="py-3 px-3.5">Dish</th>
                    <th className="py-3 px-3.5">Description</th>
                    <th className="py-3 px-3.5">Category</th>
                    <th className="py-3 px-3.5">Severity</th>
                    <th className="py-3 px-3.5">Status</th>
                    <th className="py-3 px-3.5">Deadline</th>
                    <th className="py-3 px-3.5">Assigned To</th>
                    <th className="py-3 px-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#245C45]/5">
                  {complaints.map((c) => {
                    const isSelected = selectedComplaint?.complaint_id === c.complaint_id;
                    return (
                      <tr
                        key={c.complaint_id}
                        className={`hover:bg-[#F8F7F2]/60 transition-colors ${
                          isSelected ? 'bg-[#E6EFE7]/40' : ''
                        }`}
                      >
                        <td className="py-3.5 px-3.5">
                          <span className="font-bold text-[#245C45]">#{c.complaint_id}</span>
                          <div className="text-[11px] text-[#252A27]/70 font-medium">
                            {c.student_name || `User #${c.user_id}`}
                          </div>
                        </td>

                        <td className="py-3.5 px-3.5 font-medium text-[#252A27]">
                          {c.menu_item_name || 'General Canteen'}
                        </td>

                        <td className="py-3.5 px-3.5 max-w-xs">
                          <p className="line-clamp-2 text-[#252A27]/90">{c.description}</p>
                        </td>

                        <td className="py-3.5 px-3.5">
                          <span className="capitalize text-[#6B8F71] font-semibold">
                            {c.category?.replace('_', ' ')}
                          </span>
                        </td>

                        <td className="py-3.5 px-3.5">
                          <SeverityBadge severity={c.severity} />
                        </td>

                        <td className="py-3.5 px-3.5">
                          <StatusBadge status={c.status} isOverdue={Boolean(c.is_overdue)} />
                        </td>

                        <td className="py-3.5 px-3.5">
                          {formatCountdown(c.resolution_deadline, c.is_overdue)}
                        </td>

                        <td className="py-3.5 px-3.5 text-[#252A27]/70">
                          {c.assigned_to_name || (
                            <span className="text-[#252A27]/40 italic">Unassigned</span>
                          )}
                        </td>

                        <td className="py-3.5 px-3.5 text-right">
                          <button
                            type="button"
                            onClick={() => handleSelectComplaint(c)}
                            className="bg-[#245C45] hover:bg-[#164B38] text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                          >
                            Manage
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Side Panel Drawer for Selected Complaint */}
      {selectedComplaint && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-[#252A27]/40 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col animate-slide-left overflow-y-auto">
            {/* Header */}
            <div className="p-5 border-b border-[#245C45]/10 flex items-center justify-between bg-[#F8F7F2]">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white bg-[#245C45] px-2.5 py-0.5 rounded-md">
                  #{selectedComplaint.complaint_id}
                </span>
                <h3 className="font-serif font-bold text-base text-[#252A27]">Ticket Management</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedComplaint(null)}
                className="p-1.5 rounded-lg text-[#252A27]/60 hover:text-[#252A27] hover:bg-[#E6EFE7]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-6 flex-1">
              {/* Ticket Details Summary */}
              <div className="space-y-3 bg-[#F8F7F2] p-4 rounded-xl border border-[#245C45]/10 text-xs">
                <div>
                  <span className="text-[#252A27]/60">Student:</span>{' '}
                  <span className="font-semibold text-[#252A27]">{selectedComplaint.student_name}</span>{' '}
                  <span className="text-[#252A27]/50">({selectedComplaint.student_email})</span>
                </div>
                <div>
                  <span className="text-[#252A27]/60">Dish:</span>{' '}
                  <span className="font-semibold text-[#252A27]">{selectedComplaint.menu_item_name || 'General Canteen'}</span>
                </div>
                <div>
                  <span className="text-[#252A27]/60">SLA Resolution Deadline:</span>{' '}
                  <span className="font-medium text-[#252A27]">
                    {selectedComplaint.resolution_deadline
                      ? new Date(selectedComplaint.resolution_deadline).toLocaleString()
                      : 'N/A'}
                  </span>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <SeverityBadge severity={selectedComplaint.severity} />
                  <StatusBadge
                    status={selectedComplaint.status}
                    isOverdue={Boolean(selectedComplaint.is_overdue)}
                  />
                  {selectedComplaint.escalation_level > 0 && (
                    <span className="text-[11px] font-bold text-[#B3402F]">
                      Level {selectedComplaint.escalation_level} Escalation
                    </span>
                  )}
                </div>
                <div className="pt-2 border-t border-[#245C45]/10">
                  <span className="text-[#252A27]/60 block mb-1">Grievance Description:</span>
                  <p className="text-sm font-sans text-[#252A27] leading-relaxed">
                    {selectedComplaint.description}
                  </p>
                </div>
              </div>

              {/* Management Form */}
              <form onSubmit={handleSaveAction} className="space-y-4">
                <h4 className="font-serif font-bold text-sm text-[#252A27]">Update Ticket State</h4>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="assign-staff" className="block text-xs font-semibold text-[#252A27]/70 mb-1">
                      Assign Staff
                    </label>
                    <select
                      id="assign-staff"
                      value={assignee}
                      onChange={(e) => setAssignee(e.target.value)}
                      className="w-full bg-white border border-[#245C45]/20 rounded-lg text-xs p-2 focus:ring-2 focus:ring-[#245C45]/30"
                    >
                      <option value="">Unassigned</option>
                      {staffList.map((s) => (
                        <option key={s.user_id} value={s.user_id}>
                          {s.full_name} ({s.role})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="ticket-status" className="block text-xs font-semibold text-[#252A27]/70 mb-1">
                      Status
                    </label>
                    <select
                      id="ticket-status"
                      value={statusVal}
                      onChange={(e) => setStatusVal(e.target.value)}
                      className="w-full bg-white border border-[#245C45]/20 rounded-lg text-xs p-2 focus:ring-2 focus:ring-[#245C45]/30 font-medium"
                    >
                      <option value="open">Open</option>
                      <option value="in_progress">In Progress</option>
                      <option value="escalated">Escalated</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="action-remarks" className="block text-xs font-semibold text-[#252A27]/70 mb-1">
                    Action Remarks / Resolution Note
                  </label>
                  <textarea
                    id="action-remarks"
                    rows={3}
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="Document kitchen inspection, vendor query, or student reimbursement..."
                    className="w-full bg-white border border-[#245C45]/20 rounded-lg text-xs p-2.5 focus:ring-2 focus:ring-[#245C45]/30 focus:border-[#245C45]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={savingAction}
                  className="w-full bg-[#245C45] hover:bg-[#164B38] text-white rounded-xl text-xs font-semibold py-2.5 transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{savingAction ? 'Saving...' : 'Save & Append Action'}</span>
                </button>
              </form>

              {/* Action History Timeline */}
              <div className="space-y-3 pt-3 border-t border-[#245C45]/10">
                <div className="flex items-center gap-1.5 text-xs font-serif font-bold text-[#252A27]">
                  <History className="w-4 h-4 text-[#245C45]" />
                  <span>Complaint Actions Timeline</span>
                </div>

                {panelLoading ? (
                  <LoadingSpinner message="Loading timeline..." />
                ) : timeline.length === 0 ? (
                  <p className="text-xs text-[#252A27]/50 italic">No previous actions logged.</p>
                ) : (
                  <div className="space-y-3 relative before:absolute before:inset-0 before:left-3 before:w-0.5 before:bg-[#245C45]/20">
                    {timeline.map((act) => (
                      <div key={act.complaint_action_id} className="relative pl-7 text-xs">
                        <span className="absolute left-1.5 top-1 w-3 h-3 rounded-full bg-[#245C45] border-2 border-white"></span>
                        <div className="bg-[#F8F7F2] p-2.5 rounded-lg border border-[#245C45]/10">
                          <div className="flex items-center justify-between text-[11px] mb-1">
                            <span className="font-semibold text-[#245C45] capitalize">
                              {act.action_type.replace('_', ' ')}
                            </span>
                            <span className="text-[#252A27]/50">
                              {act.created_at ? new Date(act.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                            </span>
                          </div>
                          <p className="text-[#252A27]">{act.remarks || 'No remarks recorded'}</p>
                          <div className="text-[10px] text-[#252A27]/60 mt-1">
                            By: {act.action_by_name || 'System / Auto Trigger'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
