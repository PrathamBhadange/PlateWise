import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Heart,
  PackageCheck,
  Clock,
  Calendar,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  LogOut,
  UtensilsCrossed,
  Layers,
  ShieldCheck,
  Filter,
  Check,
  Copy,
  X,
  Bell,
  Building,
  User,
  Phone,
  MapPin,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  Ban,
  ChefHat,
  Truck,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import api from '../../services/api';

export default function NgoDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  // Navigation tab state: 'marketplace' | 'claims' | 'tracker' | 'analytics' | 'profile'
  const [activeTab, setActiveTab] = useState('marketplace');
  const [refreshKey, setRefreshKey] = useState(0);

  // Core data states
  const [overview, setOverview] = useState({
    available_batches: 0,
    available_portions: 0,
    my_claimed_batches: 0,
    my_claimed_portions: 0,
    my_collected_portions: 0,
    total_platform_donated: 0,
  });

  const [analytics, setAnalytics] = useState({
    total_portions_collected: 0,
    successful_collections_count: 0,
    active_claims_count: 0,
    pending_collection_portions: 0,
    cancelled_claims_count: 0,
    collected_this_week: 0,
    collected_this_month: 0,
    weight_tracking_note: '',
    chart_data: [],
  });

  const [donations, setDonations] = useState([]);
  const [claims, setClaims] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const [profile, setProfile] = useState(null);

  // Loading & refresh states
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Alerts
  const [actionSuccess, setActionSuccess] = useState('');
  const [actionError, setActionError] = useState('');
  const [fetchError, setFetchError] = useState('');

  // Marketplace filter states
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [minQtyFilter, setMinQtyFilter] = useState(0);
  const [urgentOnly, setUrgentOnly] = useState(false);

  // Claims filter state: 'all' | 'active' | 'collected' | 'cancelled' | 'expired'
  const [claimsStatusFilter, setClaimsStatusFilter] = useState('all');

  // Modals state
  const [claimingDonation, setClaimingDonation] = useState(null);
  const [claimQtyInput, setClaimQtyInput] = useState('');
  const [isSubmittingClaim, setIsSubmittingClaim] = useState(false);

  const [cancellingClaim, setCancellingClaim] = useState(null);
  const [cancelReasonInput, setCancelReasonInput] = useState('');
  const [isSubmittingCancel, setIsSubmittingCancel] = useState(false);

  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileForm, setProfileForm] = useState({
    organization_name: '',
    contact_person: '',
    phone_number: '',
    address: '',
  });
  const [isSubmittingProfile, setIsSubmittingProfile] = useState(false);

  const [showNotificationsDrawer, setShowNotificationsDrawer] = useState(false);
  const [copiedCode, setCopiedCode] = useState(null);

  const isMountedRef = useRef(true);

  // Refresh trigger handler
  const loadData = useCallback(() => {
    setIsRefreshing(true);
    setRefreshKey((k) => k + 1);
  }, []);

  // Fetch all live NGO data
  useEffect(() => {
    isMountedRef.current = true;

    async function fetchNgoData() {
      try {
        const [overviewResult, donResult, claimsResult, analyticsResult, notifResult, profileResult] =
          await Promise.allSettled([
            api.get('/ngo/overview'),
            api.get('/ngo/donations?status=all'),
            api.get('/ngo/my-claims').catch(() => api.get('/ngo/donations/my-claims')),
            api.get('/ngo/analytics'),
            api.get('/ngo/notifications'),
            api.get('/ngo/profile'),
          ]);

        if (isMountedRef.current) {
          let hasFailure = false;

          if (overviewResult.status === 'fulfilled') {
            setOverview(overviewResult.value.data || {});
          } else {
            console.error('[NGO] Overview endpoint failed:', overviewResult.reason);
            hasFailure = true;
          }

          if (donResult.status === 'fulfilled') {
            setDonations(Array.isArray(donResult.value.data) ? donResult.value.data : []);
          } else {
            console.error('[NGO] Donations feed failed:', donResult.reason);
            hasFailure = true;
          }

          if (claimsResult.status === 'fulfilled') {
            setClaims(Array.isArray(claimsResult.value.data) ? claimsResult.value.data : []);
          } else {
            console.error('[NGO] Claims feed failed:', claimsResult.reason);
            hasFailure = true;
          }

          if (analyticsResult.status === 'fulfilled') {
            setAnalytics(analyticsResult.value.data || {});
          } else {
            console.error('[NGO] Analytics failed:', analyticsResult.reason);
            hasFailure = true;
          }

          if (notifResult.status === 'fulfilled') {
            const notifData = notifResult.value.data;
            setNotifications(Array.isArray(notifData?.notifications) ? notifData.notifications : []);
            setUnreadNotifCount(Number(notifData?.unread_count || 0));
          } else {
            console.error('[NGO] Notifications failed:', notifResult.reason);
          }

          if (profileResult.status === 'fulfilled' && profileResult.value?.data) {
            const p = profileResult.value.data;
            setProfile(p);
            setProfileForm({
              organization_name: p.organization_name || '',
              contact_person: p.contact_person || '',
              phone_number: p.phone_number || '',
              address: p.address || '',
            });
          }

          if (hasFailure) {
            setFetchError('Some live kitchen and redistribution data could not be retrieved. Click Refresh to synchronize.');
          } else {
            setFetchError('');
          }

          setLastUpdated(new Date());
        }
      } catch (err) {
        if (isMountedRef.current) {
          console.error('[NGO] Critical error loading dashboard data:', err);
          setFetchError(err.response?.data?.message || err.message || 'Unable to connect to campus donation network.');
        }
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    }

    fetchNgoData();

    // 20-second background polling for live synchronization
    const timer = setInterval(fetchNgoData, 20000);

    // Refresh immediately on window focus and document visibility regain
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchNgoData();
      }
    };
    const handleWindowFocus = () => {
      fetchNgoData();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleWindowFocus);

    return () => {
      isMountedRef.current = false;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [refreshKey]);

  // Logout handler
  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  // Copy verification code to clipboard
  const handleCopyCode = (code) => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  // Open Partial Claim Modal
  const handleOpenClaimModal = (batch) => {
    setActionSuccess('');
    setActionError('');
    setClaimingDonation(batch);
    setClaimQtyInput(String(batch.remaining_quantity || batch.quantity));
  };

  // Submit Claim
  const handleSubmitClaim = async (e) => {
    e.preventDefault();
    if (!claimingDonation) return;

    const parsedQty = parseInt(claimQtyInput, 10);
    if (isNaN(parsedQty) || parsedQty <= 0) {
      setActionError('Claim quantity must be a positive integer.');
      return;
    }

    if (parsedQty > claimingDonation.remaining_quantity) {
      setActionError(`Cannot claim ${parsedQty} portions. Only ${claimingDonation.remaining_quantity} remain available.`);
      return;
    }

    setIsSubmittingClaim(true);
    setActionSuccess('');
    setActionError('');

    try {
      const res = await api.post(`/ngo/donations/${claimingDonation.donation_id}/claims`, {
        quantity: parsedQty,
      });

      setActionSuccess(res.data.message || `Successfully claimed ${parsedQty} portions!`);
      setClaimingDonation(null);
      loadData();
    } catch (err) {
      setActionError(
        err.response?.data?.message || err.response?.data?.error || 'Failed to claim surplus donation.'
      );
    } finally {
      setIsSubmittingClaim(false);
    }
  };

  // Open Cancel Modal
  const handleOpenCancelModal = (claim) => {
    setActionSuccess('');
    setActionError('');
    setCancellingClaim(claim);
    setCancelReasonInput('');
  };

  // Submit Cancellation
  const handleSubmitCancel = async (e) => {
    e.preventDefault();
    if (!cancellingClaim || !cancellingClaim.claim_id) return;

    setIsSubmittingCancel(true);
    setActionSuccess('');
    setActionError('');

    try {
      const res = await api.post(`/ngo/donation-claims/${cancellingClaim.claim_id}/cancel`, {
        reason: cancelReasonInput.trim() || 'Cancelled by NGO partner',
      });

      setActionSuccess(res.data.message || 'Donation claim cancelled successfully. Portions released back.');
      setCancellingClaim(null);
      loadData();
    } catch (err) {
      setActionError(
        err.response?.data?.message || err.response?.data?.error || 'Failed to cancel donation claim.'
      );
    } finally {
      setIsSubmittingCancel(false);
    }
  };

  // Submit Profile Update
  const handleSubmitProfile = async (e) => {
    e.preventDefault();
    setIsSubmittingProfile(true);
    setActionSuccess('');
    setActionError('');

    try {
      const res = await api.put('/ngo/profile', profileForm);
      setActionSuccess(res.data.message || 'Organization profile updated successfully.');
      setProfile(res.data.profile);
      setShowProfileModal(false);
    } catch (err) {
      setActionError(
        err.response?.data?.message || err.response?.data?.error || 'Failed to update organization profile.'
      );
    } finally {
      setIsSubmittingProfile(false);
    }
  };

  // Mark all notifications as read
  const handleMarkAllNotifRead = async () => {
    try {
      await api.post('/ngo/notifications/mark-all-read');
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
      setUnreadNotifCount(0);
    } catch (err) {
      console.error('Failed to mark notifications read:', err);
    }
  };

  // Filter available donations for the marketplace
  const filteredDonations = donations.filter((d) => {
    // Only active donations with available portions and unexpired deadlines
    const isAvail = d.is_available_to_claim !== false && d.remaining_quantity > 0;
    if (!isAvail) return false;

    if (categoryFilter !== 'all' && d.category !== categoryFilter) {
      return false;
    }
    if (minQtyFilter > 0 && d.remaining_quantity < minQtyFilter) {
      return false;
    }
    if (urgentOnly && !d.is_urgent) {
      return false;
    }
    return true;
  });

  // Filter My Claims
  const filteredClaims = claims.filter((c) => {
    if (claimsStatusFilter === 'all') return true;
    if (claimsStatusFilter === 'active') return c.status === 'Claimed';
    if (claimsStatusFilter === 'collected') return c.status === 'Collected';
    if (claimsStatusFilter === 'cancelled') return c.status === 'Cancelled';
    if (claimsStatusFilter === 'expired') return c.status === 'Expired';
    return true;
  });

  // Active claims for collection tracking
  const activeTrackerClaims = claims.filter((c) => c.status === 'Claimed');

  return (
    <div className="min-h-screen bg-[#F8F7F2] text-[#252A27]">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-[#F8F7F2]/95 backdrop-blur-md border-b border-[#245C45]/15 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#245C45] text-white flex items-center justify-center font-bold text-sm shadow-2xs">
            <Heart className="w-5 h-5 fill-white" />
          </div>
          <div>
            <span className="font-serif font-bold text-[#252A27] text-base sm:text-lg block leading-tight">
              PlateWise NGO Partner Portal
            </span>
            <span className="text-[10px] text-[#245C45] font-semibold uppercase tracking-wider block">
              Live Food Rescue & Community Redistribution
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Live Sync Status indicator */}
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#E6EFE7] text-[#245C45] text-[11px] font-semibold">
            <span className="w-2 h-2 rounded-full bg-[#245C45] animate-pulse" />
            <span>Live Sync</span>
            <span className="text-[#245C45]/70 font-normal">
              · {lastUpdated.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>

          {/* Notifications Bell */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowNotificationsDrawer((prev) => !prev)}
              className="relative p-2 rounded-xl text-[#245C45] hover:bg-[#E6EFE7] border border-[#245C45]/15 transition-all cursor-pointer"
              title="Surplus alerts & updates"
            >
              <Bell className="w-4 h-4" />
              {unreadNotifCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#B3402F] text-white text-[10px] font-bold flex items-center justify-center shadow-xs">
                  {unreadNotifCount > 9 ? '9+' : unreadNotifCount}
                </span>
              )}
            </button>

            {/* Notifications Dropdown */}
            {showNotificationsDrawer && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl border border-[#245C45]/20 shadow-xl p-4 z-50 space-y-3">
                <div className="flex items-center justify-between border-b border-[#245C45]/10 pb-2.5">
                  <div className="flex items-center gap-1.5 font-serif font-bold text-sm text-[#252A27]">
                    <Bell className="w-4 h-4 text-[#245C45]" />
                    <span>Rescue Notifications</span>
                  </div>
                  {unreadNotifCount > 0 && (
                    <button
                      type="button"
                      onClick={handleMarkAllNotifRead}
                      className="text-[11px] text-[#245C45] hover:underline font-semibold cursor-pointer"
                    >
                      Mark all read
                    </button>
                  )}
                </div>

                <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                  {notifications.length === 0 ? (
                    <p className="text-xs text-[#252A27]/60 text-center py-6">
                      No notifications logged yet.
                    </p>
                  ) : (
                    notifications.map((notif) => (
                      <div
                        key={notif.notification_id}
                        className={`p-2.5 rounded-xl text-xs transition-colors border ${
                          notif.is_read
                            ? 'bg-[#F8F7F2]/60 border-[#245C45]/5 text-[#252A27]/80'
                            : 'bg-[#E6EFE7]/50 border-[#245C45]/20 text-[#252A27] font-medium'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="font-bold text-[11px] text-[#245C45]">
                            {notif.title}
                          </span>
                          <span className="text-[10px] text-[#252A27]/50">
                            {new Date(notif.created_at).toLocaleTimeString('en-IN', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <p className="text-[11px] leading-relaxed text-[#252A27]/80">
                          {notif.message}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* NGO Info */}
          <div className="hidden sm:flex flex-col text-right">
            <span className="text-xs font-bold text-[#252A27]">
              {profile?.organization_name || user?.full_name || 'Relief Partner'}
            </span>
            <span className="text-[10px] text-[#245C45] font-semibold flex items-center justify-end gap-1">
              <ShieldCheck className="w-3 h-3 text-[#245C45]" />
              <span>Verified Relief Partner</span>
            </span>
          </div>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={loadData}
            title="Refresh database records"
            className="p-2 rounded-xl text-[#245C45] hover:bg-[#E6EFE7] border border-[#245C45]/15 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>

          {/* Logout Button */}
          <button
            type="button"
            onClick={handleLogout}
            title="Log Out"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-all cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Welcome & Live Status Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#252A27] tracking-tight flex items-center gap-2">
              <span>Welcome, {profile?.organization_name || user?.full_name || 'Relief Partner'}!</span>
              <span className="text-xl sm:text-2xl">🤝</span>
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-[#252A27]/75 font-normal">
              Direct connection to campus canteen surplus for immediate hunger relief and community meal distribution.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-xl border border-[#245C45]/15 shadow-2xs text-xs font-semibold text-[#252A27]">
              <Calendar className="w-3.5 h-3.5 text-[#245C45]" />
              <span>
                {new Date().toLocaleDateString('en-IN', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#E6EFE7] rounded-xl border border-[#245C45]/20 text-xs font-bold text-[#245C45]">
              <MapPin className="w-3.5 h-3.5" />
              <span>Loading Dock Dispatch Active</span>
            </div>
          </div>
        </div>

        {/* Feedback Alerts */}
        {actionSuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-xs text-emerald-800 animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{actionSuccess}</span>
            </div>
            <button type="button" onClick={() => setActionSuccess('')} className="p-1 hover:text-emerald-950">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {actionError && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between text-xs text-rose-800 animate-in fade-in">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{actionError}</span>
            </div>
            <button type="button" onClick={() => setActionError('')} className="p-1 hover:text-rose-950">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {fetchError && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between text-xs text-amber-900 animate-in fade-in">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{fetchError}</span>
            </div>
            <button
              type="button"
              onClick={loadData}
              className="px-2.5 py-1 bg-amber-600 text-white rounded-lg text-[11px] font-semibold hover:bg-amber-700 transition cursor-pointer"
            >
              Retry Sync
            </button>
          </div>
        )}

        {/* 4 Core Statistics KPI Cards (Feature 4 - Real DB data) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
          {/* Card 1: Available Portions */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#245C45]/15 shadow-2xs">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                <UtensilsCrossed className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                Live Surplus
              </span>
            </div>
            <span className="font-serif text-2xl sm:text-3xl font-bold text-[#252A27] block">
              {overview.available_portions || 0}
            </span>
            <span className="text-xs font-semibold text-[#252A27]/85 mt-0.5 block">
              Available Portions
            </span>
            <span className="text-[11px] text-[#6B8F71] block">
              {filteredDonations.length} surplus offers ready to claim
            </span>
          </div>

          {/* Card 2: Portions Collected */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#245C45]/15 shadow-2xs">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-[#E6EFE7] text-[#245C45] flex items-center justify-center">
                <PackageCheck className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#245C45] bg-[#E6EFE7] px-2 py-0.5 rounded-full">
                Distributed
              </span>
            </div>
            <span className="font-serif text-2xl sm:text-3xl font-bold text-[#252A27] block">
              {analytics.total_portions_collected || overview.my_collected_portions || 0}
            </span>
            <span className="text-xs font-semibold text-[#252A27]/85 mt-0.5 block">
              Portions Collected
            </span>
            <span className="text-[11px] text-[#6B8F71] block">
              {analytics.successful_collections_count || 0} verified dock pickups completed
            </span>
          </div>

          {/* Card 3: Active Reserved */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#245C45]/15 shadow-2xs">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-[#E99A55]/15 text-[#E99A55] flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#E99A55] bg-[#E99A55]/10 px-2 py-0.5 rounded-full">
                Pending Dock
              </span>
            </div>
            <span className="font-serif text-2xl sm:text-3xl font-bold text-[#252A27] block">
              {analytics.pending_collection_portions || 0}
            </span>
            <span className="text-xs font-semibold text-[#252A27]/85 mt-0.5 block">
              Pending Portions Reserved
            </span>
            <span className="text-[11px] text-[#E99A55] font-medium block">
              {analytics.active_claims_count || 0} claims awaiting pickup
            </span>
          </div>

          {/* Card 4: This Week Impact */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#245C45]/15 shadow-2xs">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-[#245C45]/10 text-[#245C45] flex items-center justify-center">
                <TrendingUp className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#245C45] bg-[#E6EFE7] px-2 py-0.5 rounded-full">
                Weekly Impact
              </span>
            </div>
            <span className="font-serif text-2xl sm:text-3xl font-bold text-[#252A27] block">
              {analytics.collected_this_week || 0}
            </span>
            <span className="text-xs font-semibold text-[#252A27]/85 mt-0.5 block">
              Portions Rescued This Week
            </span>
            <span className="text-[11px] text-[#6B8F71] block">
              {analytics.collected_this_month || 0} portions this month
            </span>
          </div>
        </div>

        {/* Tab Switcher Navigation */}
        <div className="flex overflow-x-auto border-b border-[#245C45]/15 space-x-6">
          <button
            type="button"
            onClick={() => setActiveTab('marketplace')}
            className={`pb-3 text-sm font-semibold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'marketplace'
                ? 'border-[#245C45] text-[#245C45]'
                : 'border-transparent text-[#252A27]/60 hover:text-[#252A27]'
            }`}
          >
            <UtensilsCrossed className="w-4 h-4" />
            <span>Surplus Marketplace</span>
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-[#E6EFE7] text-[#245C45] text-[10px] font-bold">
              {filteredDonations.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('claims')}
            className={`pb-3 text-sm font-semibold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'claims'
                ? 'border-[#245C45] text-[#245C45]'
                : 'border-transparent text-[#252A27]/60 hover:text-[#252A27]'
            }`}
          >
            <PackageCheck className="w-4 h-4" />
            <span>My Claims</span>
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-[#E6EFE7] text-[#245C45] text-[10px] font-bold">
              {claims.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('tracker')}
            className={`pb-3 text-sm font-semibold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'tracker'
                ? 'border-[#245C45] text-[#245C45]'
                : 'border-transparent text-[#252A27]/60 hover:text-[#252A27]'
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>Collection Tracker</span>
            {activeTrackerClaims.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-[#E99A55]/20 text-[#E99A55] text-[10px] font-bold animate-pulse">
                {activeTrackerClaims.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('analytics')}
            className={`pb-3 text-sm font-semibold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'analytics'
                ? 'border-[#245C45] text-[#245C45]'
                : 'border-transparent text-[#252A27]/60 hover:text-[#252A27]'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Impact Analytics</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`pb-3 text-sm font-semibold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'profile'
                ? 'border-[#245C45] text-[#245C45]'
                : 'border-transparent text-[#252A27]/60 hover:text-[#252A27]'
            }`}
          >
            <Building className="w-4 h-4" />
            <span>Organization Profile</span>
          </button>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* TAB 1: LIVE SURPLUS FOOD MARKETPLACE (Feature 1) */}
        {/* ------------------------------------------------------------------ */}
        {activeTab === 'marketplace' && (
          <div className="space-y-4">
            {/* Filter Toolbar */}
            <div className="bg-white rounded-2xl p-4 border border-[#245C45]/15 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-[#252A27]/70 flex items-center gap-1 mr-1">
                  <Filter className="w-3.5 h-3.5 text-[#245C45]" />
                  <span>Category:</span>
                </span>
                {['all', 'Lunch', 'Breakfast', 'Snacks', 'Beverages'].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategoryFilter(cat)}
                    className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      categoryFilter === cat
                        ? 'bg-[#245C45] text-white shadow-2xs'
                        : 'bg-[#F8F7F2] text-[#252A27]/70 hover:bg-[#E6EFE7]'
                    }`}
                  >
                    {cat === 'all' ? 'All Dishes' : cat}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                {/* Min Quantity filter */}
                <select
                  value={minQtyFilter}
                  onChange={(e) => setMinQtyFilter(Number(e.target.value))}
                  className="px-3 py-1.5 rounded-xl border border-[#245C45]/20 text-xs font-semibold bg-white text-[#252A27] focus:outline-none focus:ring-2 focus:ring-[#245C45]/20 cursor-pointer"
                >
                  <option value={0}>Any Quantity</option>
                  <option value={5}>5+ Portions</option>
                  <option value={10}>10+ Portions</option>
                  <option value={20}>20+ Portions</option>
                </select>

                {/* Urgent Filter Toggle */}
                <button
                  type="button"
                  onClick={() => setUrgentOnly((prev) => !prev)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                    urgentOnly
                      ? 'bg-[#E99A55] text-white shadow-2xs'
                      : 'bg-[#F8F7F2] text-[#252A27]/70 hover:bg-[#E99A55]/15 border border-[#245C45]/15'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Urgent Only (&lt;2h)</span>
                </button>
              </div>
            </div>

            {/* Marketplace Grid */}
            {filteredDonations.length === 0 ? (
              <div className="bg-white rounded-3xl p-10 text-center border border-[#245C45]/15 space-y-2">
                <Heart className="w-10 h-10 text-[#245C45]/30 mx-auto" />
                <h4 className="font-serif text-base font-bold text-[#252A27]">
                  No Surplus Offers Match Your Current Filter
                </h4>
                <p className="text-xs text-[#252A27]/60 max-w-sm mx-auto">
                  {urgentOnly || categoryFilter !== 'all' || minQtyFilter > 0
                    ? 'Try adjusting your filters above to see more prepared surplus food batches.'
                    : 'The canteen kitchen has not posted any unclaimed surplus food at this moment. Daily donations are published as batches become available.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredDonations.map((batch) => (
                  <div
                    key={batch.donation_id}
                    className={`bg-white rounded-2xl p-5 border shadow-2xs flex flex-col justify-between text-left hover:border-[#245C45]/40 transition-all ${
                      batch.is_urgent ? 'border-[#E99A55] ring-1 ring-[#E99A55]/30' : 'border-[#245C45]/15'
                    }`}
                  >
                    <div>
                      {/* Urgent Banner */}
                      {batch.is_urgent && (
                        <div className="mb-2.5 px-2.5 py-1 rounded-xl bg-[#E99A55]/15 border border-[#E99A55]/30 flex items-center gap-1.5 text-[11px] font-bold text-[#E99A55]">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          <span>Pickup Window Closing Soon</span>
                        </div>
                      )}

                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#245C45] bg-[#E6EFE7] px-2 py-0.5 rounded-full">
                            {batch.category || 'Surplus Meal'}
                          </span>
                          <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            Pure Veg
                          </span>
                        </div>
                        <span className="text-[11px] font-mono text-[#252A27]/50 font-medium">
                          {batch.batch_code || `Batch #${batch.food_batch_id}`}
                        </span>
                      </div>

                      <h4 className="font-serif text-lg font-bold text-[#252A27] leading-snug">
                        {batch.food_name}
                      </h4>

                      <div className="mt-3.5 space-y-2 text-xs text-[#252A27]/80">
                        {/* Prepared quantity & session */}
                        <div className="flex justify-between items-center pb-1 border-b border-[#245C45]/5">
                          <span className="text-[#252A27]/60">Total Prepared:</span>
                          <span className="font-semibold text-[#252A27]">
                            {batch.original_prepared_qty || batch.total_quantity} plates ({batch.meal_session})
                          </span>
                        </div>

                        {/* Available portion count */}
                        <div className="flex justify-between items-center py-1 bg-[#E6EFE7]/40 px-2 rounded-lg">
                          <span className="text-[#245C45] font-semibold">Available to Claim:</span>
                          <span className="font-bold text-[#245C45] text-base">
                            {batch.remaining_quantity} portions
                          </span>
                        </div>

                        {/* Collection location */}
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="text-[#252A27]/60 flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-[#245C45]" />
                            <span>Pickup Dock:</span>
                          </span>
                          <span className="font-medium text-[#252A27]">
                            {batch.pickup_location || 'Rear Loading Dock'}
                          </span>
                        </div>

                        {/* Deadline */}
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="text-[#252A27]/60 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-[#E99A55]" />
                            <span>Collection Deadline:</span>
                          </span>
                          <span className="font-bold text-[#E99A55]">
                            {batch.collection_deadline
                              ? new Date(batch.collection_deadline).toLocaleTimeString('en-IN', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : '18:30 IST Cutoff'}
                          </span>
                        </div>

                        {batch.batch_notes && (
                          <p className="text-[11px] text-[#252A27]/60 italic bg-[#F8F7F2] p-1.5 rounded-lg">
                            Note: {batch.batch_notes}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-[#245C45]/10">
                      <button
                        type="button"
                        onClick={() => handleOpenClaimModal(batch)}
                        className="w-full py-2.5 px-3 bg-[#245C45] hover:bg-[#164B38] text-white rounded-xl text-xs font-semibold shadow-2xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Heart className="w-3.5 h-3.5" />
                        <span>Claim Portions (Up to {batch.remaining_quantity})</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* TAB 2: MY CLAIMS (Feature 2) */}
        {/* ------------------------------------------------------------------ */}
        {activeTab === 'claims' && (
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#245C45]/15 shadow-2xs text-left space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#245C45]/10">
              <div>
                <h3 className="font-serif text-lg font-bold text-[#252A27]">
                  Your Organization's Food Rescue Claims
                </h3>
                <p className="text-xs text-[#252A27]/60">
                  Surplus portions claimed by {profile?.organization_name || user?.full_name} for community distribution.
                </p>
              </div>

              {/* Status Filter Pills */}
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { id: 'all', label: 'All Claims' },
                  { id: 'active', label: 'Ready for Dock Pickup' },
                  { id: 'collected', label: 'Collected' },
                  { id: 'cancelled', label: 'Cancelled' },
                  { id: 'expired', label: 'Expired' },
                ].map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setClaimsStatusFilter(st.id)}
                    className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      claimsStatusFilter === st.id
                        ? 'bg-[#245C45] text-white shadow-2xs'
                        : 'bg-[#F8F7F2] text-[#252A27]/70 hover:bg-[#E6EFE7]'
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>

            {filteredClaims.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#252A27]/50 space-y-2">
                <Layers className="w-8 h-8 text-[#252A27]/30 mx-auto" />
                <p className="font-semibold text-sm">No claims found in this view.</p>
                <p>Browse the Surplus Marketplace tab to reserve surplus portions.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[700px]">
                  <thead>
                    <tr className="border-b border-[#245C45]/10 text-[11px] font-semibold text-[#252A27]/60 uppercase tracking-wider bg-[#F8F7F2]/60">
                      <th className="py-2.5 px-3">Donation / Claim</th>
                      <th className="py-2.5 px-3">Food Item</th>
                      <th className="py-2.5 px-3">Claimed Portions</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Collection Code</th>
                      <th className="py-2.5 px-3">Collection Deadline</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#245C45]/5">
                    {filteredClaims.map((c) => (
                      <tr key={c.claim_id || `leg-${c.donation_id}`} className="hover:bg-[#F8F7F2]/60 transition-colors">
                        <td className="py-3 px-3 font-mono">
                          <span className="font-bold text-[#245C45]">#{c.donation_id}</span>
                          {c.claim_id && (
                            <span className="text-[10px] text-[#252A27]/50 block">Claim #{c.claim_id}</span>
                          )}
                        </td>

                        <td className="py-3 px-3">
                          <span className="font-bold text-[#252A27] block text-sm">{c.food_name}</span>
                          <span className="text-[10px] text-[#6B8F71] font-medium">{c.food_category} · Pure Veg</span>
                        </td>

                        <td className="py-3 px-3 font-bold text-[#245C45] text-sm">
                          {c.quantity} portions
                        </td>

                        <td className="py-3 px-3">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                              c.status === 'Collected'
                                ? 'bg-[#E6EFE7] text-[#245C45] border-[#245C45]/20'
                                : c.status === 'Cancelled'
                                ? 'bg-gray-100 text-gray-500 border-gray-200'
                                : c.status === 'Expired'
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            }`}
                          >
                            {c.progress_label || c.status}
                          </span>
                        </td>

                        <td className="py-3 px-3">
                          {c.verification_code ? (
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-bold text-xs bg-[#245C45]/10 text-[#245C45] px-2 py-0.5 rounded-lg border border-[#245C45]/20">
                                {c.verification_code}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopyCode(c.verification_code)}
                                className="p-1 text-[#245C45] hover:bg-[#E6EFE7] rounded cursor-pointer"
                                title="Copy verification code"
                              >
                                {copiedCode === c.verification_code ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] text-[#252A27]/40">—</span>
                          )}
                        </td>

                        <td className="py-3 px-3 text-[#252A27]/75">
                          {c.collection_deadline
                            ? new Date(c.collection_deadline).toLocaleString('en-IN', {
                                dateStyle: 'short',
                                timeStyle: 'short',
                              })
                            : '18:30 IST Cutoff'}
                        </td>

                        <td className="py-3 px-3 text-right">
                          {c.can_cancel ? (
                            <button
                              type="button"
                              onClick={() => handleOpenCancelModal(c)}
                              className="px-2.5 py-1 rounded-lg text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-all cursor-pointer"
                            >
                              Cancel Claim
                            </button>
                          ) : (
                            <span className="text-[11px] text-[#252A27]/40 italic">
                              {c.status === 'Collected' ? 'Collected' : 'Non-cancellable'}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* TAB 3: COLLECTION TRACKER (Feature 3) */}
        {/* ------------------------------------------------------------------ */}
        {activeTab === 'tracker' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#245C45]/15 shadow-2xs">
              <h3 className="font-serif text-lg font-bold text-[#252A27] flex items-center gap-2">
                <Truck className="w-5 h-5 text-[#245C45]" />
                <span>Live Dock Collection & Progress Tracker</span>
              </h3>
              <p className="text-xs text-[#252A27]/60 mt-0.5">
                Presents active claims, verification codes for counter handover, and live progress stages.
              </p>
            </div>

            {activeTrackerClaims.length === 0 ? (
              <div className="bg-white rounded-3xl p-10 text-center border border-[#245C45]/15 space-y-2">
                <PackageCheck className="w-10 h-10 text-[#245C45]/30 mx-auto" />
                <h4 className="font-serif text-base font-bold text-[#252A27]">
                  No Active Claims Awaiting Collection
                </h4>
                <p className="text-xs text-[#252A27]/60 max-w-sm mx-auto">
                  All claimed food portions have either been collected or no active claims currently exist.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {activeTrackerClaims.map((claim) => (
                  <div
                    key={claim.claim_id || claim.donation_id}
                    className="bg-white rounded-2xl p-5 border border-[#245C45]/20 shadow-2xs space-y-4 text-left"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#245C45]/10 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-serif text-lg font-bold text-[#252A27]">
                            {claim.food_name}
                          </span>
                          <span className="text-xs font-bold text-[#245C45] bg-[#E6EFE7] px-2.5 py-0.5 rounded-full">
                            {claim.quantity} portions
                          </span>
                        </div>
                        <span className="text-xs text-[#252A27]/60">
                          Donation #{claim.donation_id} · Claim #{claim.claim_id || 'N/A'}
                        </span>
                      </div>

                      {/* Verification Code Box */}
                      <div className="p-3 bg-[#F8F7F2] rounded-xl border border-[#245C45]/15 flex items-center gap-3">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-[#252A27]/60 block">
                            Present Code at Dock:
                          </span>
                          <span className="font-mono font-bold text-base text-[#245C45]">
                            {claim.verification_code}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopyCode(claim.verification_code)}
                          className="p-1.5 rounded-lg bg-white border border-[#245C45]/15 hover:bg-[#E6EFE7] text-[#245C45] cursor-pointer"
                          title="Copy Code"
                        >
                          {copiedCode === claim.verification_code ? (
                            <Check className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Visual 3-Stage Progress Stepper */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                      {/* Step 1: Claim Logged */}
                      <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-2.5">
                        <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                          ✓
                        </div>
                        <div>
                          <span className="text-xs font-bold text-emerald-950 block">
                            1. Claim Submitted
                          </span>
                          <span className="text-[11px] text-emerald-800">
                            Portions reserved in canteen database.
                          </span>
                        </div>
                      </div>

                      {/* Step 2: Awaiting Collection */}
                      <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2.5">
                        <div className="w-6 h-6 rounded-full bg-amber-600 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 animate-pulse">
                          2
                        </div>
                        <div>
                          <span className="text-xs font-bold text-amber-950 block">
                            2. Ready for Pickup
                          </span>
                          <span className="text-[11px] text-amber-800">
                            Proceed to Central Canteen Rear Loading Dock.
                          </span>
                        </div>
                      </div>

                      {/* Step 3: Kitchen Verification & Handover */}
                      <div className="p-3 rounded-xl bg-[#F8F7F2] border border-[#245C45]/10 flex items-start gap-2.5 opacity-75">
                        <div className="w-6 h-6 rounded-full bg-gray-300 text-gray-700 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                          3
                        </div>
                        <div>
                          <span className="text-xs font-bold text-[#252A27] block">
                            3. Dock Handover
                          </span>
                          <span className="text-[11px] text-[#252A27]/60">
                            Kitchen staff verifies code to mark Collected.
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Pickup Details & Security Notice */}
                    <div className="p-3 rounded-xl bg-[#E6EFE7]/40 border border-[#245C45]/15 flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-2">
                      <div className="flex items-center gap-2 text-[#245C45]">
                        <ShieldCheck className="w-4 h-4 shrink-0" />
                        <span>
                          <strong>Security Notice:</strong> Only authorized canteen kitchen staff can complete handover. Verification code is private to your NGO.
                        </span>
                      </div>
                      <div className="font-semibold text-[#252A27]">
                        Deadline: {claim.collection_deadline ? new Date(claim.collection_deadline).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '18:30 IST Cutoff'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* TAB 4: IMPACT ANALYTICS (Feature 4) */}
        {/* ------------------------------------------------------------------ */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-5 border border-[#245C45]/15 shadow-2xs text-left">
              <h3 className="font-serif text-lg font-bold text-[#252A27] flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-[#245C45]" />
                <span>Verified Hunger Relief & Food Rescue Analytics</span>
              </h3>
              <p className="text-xs text-[#252A27]/60 mt-0.5">
                Directly calculated from immutable database records of completed dock handovers.
              </p>
            </div>

            {/* 7 Core Database Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5">
              <div className="bg-white p-4 rounded-2xl border border-[#245C45]/15 text-left">
                <span className="text-[11px] text-[#252A27]/60 block">1. Total Portions Collected</span>
                <span className="font-serif text-2xl font-bold text-[#245C45] block mt-1">
                  {analytics.total_portions_collected || 0}
                </span>
                <span className="text-[10px] text-[#6B8F71]">Exact verified plates</span>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-[#245C45]/15 text-left">
                <span className="text-[11px] text-[#252A27]/60 block">2. Successful Collections</span>
                <span className="font-serif text-2xl font-bold text-[#245C45] block mt-1">
                  {analytics.successful_collections_count || 0}
                </span>
                <span className="text-[10px] text-[#6B8F71]">Completed dock pickups</span>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-[#245C45]/15 text-left">
                <span className="text-[11px] text-[#252A27]/60 block">3. Active Claims</span>
                <span className="font-serif text-2xl font-bold text-[#E99A55] block mt-1">
                  {analytics.active_claims_count || 0}
                </span>
                <span className="text-[10px] text-[#E99A55]">Reserved in kitchen</span>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-[#245C45]/15 text-left">
                <span className="text-[11px] text-[#252A27]/60 block">4. Pending Portions</span>
                <span className="font-serif text-2xl font-bold text-[#E99A55] block mt-1">
                  {analytics.pending_collection_portions || 0}
                </span>
                <span className="text-[10px] text-[#E99A55]">Awaiting handover</span>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-[#245C45]/15 text-left">
                <span className="text-[11px] text-[#252A27]/60 block">5. Cancelled Claims</span>
                <span className="font-serif text-2xl font-bold text-gray-500 block mt-1">
                  {analytics.cancelled_claims_count || 0}
                </span>
                <span className="text-[10px] text-gray-400">Released to surplus</span>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-[#245C45]/15 text-left">
                <span className="text-[11px] text-[#252A27]/60 block">6. Rescued This Week</span>
                <span className="font-serif text-2xl font-bold text-[#245C45] block mt-1">
                  {analytics.collected_this_week || 0}
                </span>
                <span className="text-[10px] text-[#6B8F71]">Past 7 days</span>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-[#245C45]/15 text-left">
                <span className="text-[11px] text-[#252A27]/60 block">7. Rescued This Month</span>
                <span className="font-serif text-2xl font-bold text-[#245C45] block mt-1">
                  {analytics.collected_this_month || 0}
                </span>
                <span className="text-[10px] text-[#6B8F71]">Past 30 days</span>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-[#245C45]/15 text-left flex flex-col justify-between">
                <div>
                  <span className="text-[11px] text-[#252A27]/60 block">8. Mass Measurement</span>
                  <span className="font-semibold text-xs text-[#245C45] block mt-1">
                    Meal Portion Units
                  </span>
                </div>
                <span className="text-[10px] text-[#252A27]/50 block">
                  Weight conversions not estimated without scale logs.
                </span>
              </div>
            </div>

            {/* 14-Day Collection Trend Chart */}
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#245C45]/15 shadow-2xs text-left space-y-4">
              <div>
                <h4 className="font-serif text-base font-bold text-[#252A27]">
                  14-Day Daily Food Rescue Trend
                </h4>
                <p className="text-xs text-[#252A27]/60">
                  Daily meal portions verified and collected from Central Canteen dock
                </p>
              </div>

              <div className="h-64 sm:h-72 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.chart_data || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#245C45" strokeOpacity={0.1} />
                    <XAxis dataKey="day" tick={{ fill: '#252A27', fontSize: 11 }} />
                    <YAxis tick={{ fill: '#252A27', fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#FFFFFF',
                        borderColor: '#245C45',
                        borderRadius: '12px',
                        fontSize: '12px',
                      }}
                    />
                    <Bar dataKey="portions" name="Portions Rescued" fill="#245C45" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* TAB 5: ORGANIZATION PROFILE (Feature 8) */}
        {/* ------------------------------------------------------------------ */}
        {activeTab === 'profile' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#245C45]/15 shadow-2xs text-left max-w-2xl mx-auto space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-[#245C45]/10">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#E6EFE7] text-[#245C45] flex items-center justify-center font-bold">
                  <Building className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-serif text-xl font-bold text-[#252A27]">
                    {profile?.organization_name || user?.full_name}
                  </h3>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#245C45] bg-[#E6EFE7] px-2 py-0.5 rounded-full mt-0.5">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>{profile?.verification_status || 'Verified Relief Partner'}</span>
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowProfileModal(true)}
                className="px-3.5 py-1.5 rounded-xl bg-[#245C45] hover:bg-[#164B38] text-white text-xs font-semibold shadow-2xs transition-all cursor-pointer"
              >
                Edit Contact Details
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 rounded-xl bg-[#F8F7F2] border border-[#245C45]/10 space-y-1">
                <span className="text-[#252A27]/60 block">Authorized Contact Person</span>
                <span className="font-bold text-sm text-[#252A27] block">
                  {profile?.contact_person || user?.full_name || 'N/A'}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-[#F8F7F2] border border-[#245C45]/10 space-y-1">
                <span className="text-[#252A27]/60 block">Authorized Login Email</span>
                <span className="font-mono text-xs text-[#252A27] font-semibold block">
                  {user?.email || profile?.email}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-[#F8F7F2] border border-[#245C45]/10 space-y-1">
                <span className="text-[#252A27]/60 block">Contact Phone Number</span>
                <span className="font-medium text-xs text-[#252A27] block">
                  {profile?.phone_number || 'Not specified'}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-[#F8F7F2] border border-[#245C45]/10 space-y-1">
                <span className="text-[#252A27]/60 block">Partner Onboarded Since</span>
                <span className="font-medium text-xs text-[#252A27] block">
                  {profile?.created_at
                    ? new Date(profile.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })
                    : 'Campus Partner'}
                </span>
              </div>

              <div className="sm:col-span-2 p-3.5 rounded-xl bg-[#F8F7F2] border border-[#245C45]/10 space-y-1">
                <span className="text-[#252A27]/60 block">Organization Operating Address</span>
                <span className="font-medium text-xs text-[#252A27] block">
                  {profile?.address || 'Central Campus Relief Network'}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>
                Your partner credentials authorize surplus pickup from Central Canteen Loading Dock under institutional food safety compliance guidelines.
              </span>
            </div>
          </div>
        )}
      </main>

      {/* ------------------------------------------------------------------ */}
      {/* MODAL 1: PARTIAL QUANTITY CLAIM MODAL */}
      {/* ------------------------------------------------------------------ */}
      {claimingDonation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-[#245C45]/20 shadow-xl max-w-md w-full p-6 space-y-4 animate-in fade-in duration-150 text-left">
            <div className="flex items-center justify-between border-b border-[#245C45]/10 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-[#E6EFE7] text-[#245C45]">
                  <Heart className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-base text-[#252A27]">
                    Claim Surplus Food Portions
                  </h3>
                  <p className="text-xs text-[#252A27]/60">
                    Reserve portions for your organization's distribution
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setClaimingDonation(null)}
                className="p-1 rounded-lg text-[#252A27]/60 hover:text-[#252A27] hover:bg-[#F8F7F2]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-[#F8F7F2] border border-[#245C45]/10 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-[#252A27]/60">Dish:</span>
                <strong className="text-[#252A27]">{claimingDonation.food_name}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-[#252A27]/60">Available to Claim:</span>
                <span className="font-bold text-[#245C45] text-sm">
                  {claimingDonation.remaining_quantity} portions
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#252A27]/60">Pickup Location:</span>
                <span className="font-medium text-[#252A27]">Kitchen Rear Loading Dock</span>
              </div>
            </div>

            <form onSubmit={handleSubmitClaim} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#252A27] mb-1">
                  Portions to Claim (1 to {claimingDonation.remaining_quantity}) *
                </label>
                <input
                  type="number"
                  min="1"
                  max={claimingDonation.remaining_quantity}
                  required
                  value={claimQtyInput}
                  onChange={(e) => setClaimQtyInput(e.target.value)}
                  className="w-full text-sm border border-[#245C45]/20 rounded-xl px-3 py-2 bg-white text-[#252A27] focus:ring-2 focus:ring-[#245C45]/30 focus:outline-none"
                />

                {/* Quick select presets */}
                <div className="flex items-center gap-1.5 mt-2">
                  <span className="text-[11px] text-[#252A27]/50">Quick preset:</span>
                  {[5, 10, claimingDonation.remaining_quantity].map((preset) => {
                    if (preset > claimingDonation.remaining_quantity) return null;
                    return (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setClaimQtyInput(String(preset))}
                        className="px-2 py-0.5 rounded-lg text-[11px] bg-[#F8F7F2] border border-[#245C45]/15 hover:bg-[#E6EFE7] font-semibold text-[#245C45] cursor-pointer"
                      >
                        {preset === claimingDonation.remaining_quantity ? 'All' : `${preset} plates`}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#245C45]/10">
                <button
                  type="button"
                  onClick={() => setClaimingDonation(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#252A27]/70 hover:bg-[#F8F7F2]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    isSubmittingClaim ||
                    !claimQtyInput ||
                    parseInt(claimQtyInput, 10) <= 0 ||
                    parseInt(claimQtyInput, 10) > claimingDonation.remaining_quantity
                  }
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#245C45] text-white hover:bg-[#1D4A37] transition-all disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  {isSubmittingClaim ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Reserving...</span>
                    </>
                  ) : (
                    <>
                      <Heart className="w-3.5 h-3.5" />
                      <span>Confirm Claim ({claimQtyInput || 0} Portions)</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* MODAL 2: CANCEL CLAIM MODAL */}
      {/* ------------------------------------------------------------------ */}
      {cancellingClaim && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-rose-200 shadow-xl max-w-md w-full p-6 space-y-4 animate-in fade-in duration-150 text-left">
            <div className="flex items-center justify-between border-b border-rose-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-rose-50 text-rose-700">
                  <Ban className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-base text-rose-950">
                    Cancel Food Rescue Claim
                  </h3>
                  <p className="text-xs text-rose-700">
                    Releases reserved portions back to surplus pool
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCancellingClaim(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-[#252A27]/80 leading-relaxed">
              Are you sure you want to cancel your claim for{' '}
              <strong>
                {cancellingClaim.quantity} portions of {cancellingClaim.food_name}
              </strong>
              ? These portions will be immediately released so other relief partners can claim them.
            </p>

            <form onSubmit={handleSubmitCancel} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#252A27] mb-1">
                  Cancellation Reason (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Volunteer vehicle delayed, capacity reached"
                  value={cancelReasonInput}
                  onChange={(e) => setCancelReasonInput(e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white text-[#252A27] focus:ring-2 focus:ring-rose-200 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setCancellingClaim(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#252A27]/70 hover:bg-gray-100"
                >
                  Keep Claim
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCancel}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-700 text-white hover:bg-rose-800 transition-all disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  {isSubmittingCancel ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Releasing...</span>
                    </>
                  ) : (
                    <span>Confirm Cancellation</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* MODAL 3: EDIT PROFILE MODAL */}
      {/* ------------------------------------------------------------------ */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-[#245C45]/20 shadow-xl max-w-md w-full p-6 space-y-4 animate-in fade-in duration-150 text-left">
            <div className="flex items-center justify-between border-b border-[#245C45]/10 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-[#E6EFE7] text-[#245C45]">
                  <Building className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-base text-[#252A27]">
                    Update Organization Details
                  </h3>
                  <p className="text-xs text-[#252A27]/60">
                    Maintain accurate contact records for dock dispatch
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowProfileModal(false)}
                className="p-1 rounded-lg text-[#252A27]/60 hover:text-[#252A27] hover:bg-[#F8F7F2]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitProfile} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#252A27] mb-1">
                  Organization / Trust Name *
                </label>
                <input
                  type="text"
                  required
                  value={profileForm.organization_name}
                  onChange={(e) =>
                    setProfileForm((prev) => ({
                      ...prev,
                      organization_name: e.target.value,
                    }))
                  }
                  className="w-full text-sm border border-[#245C45]/20 rounded-xl px-3 py-2 bg-white text-[#252A27] focus:ring-2 focus:ring-[#245C45]/30 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#252A27] mb-1">
                  Authorized Contact Person *
                </label>
                <input
                  type="text"
                  required
                  value={profileForm.contact_person}
                  onChange={(e) =>
                    setProfileForm((prev) => ({
                      ...prev,
                      contact_person: e.target.value,
                    }))
                  }
                  className="w-full text-sm border border-[#245C45]/20 rounded-xl px-3 py-2 bg-white text-[#252A27] focus:ring-2 focus:ring-[#245C45]/30 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#252A27] mb-1">
                  Contact Phone Number *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="+91 98765 43210"
                  value={profileForm.phone_number}
                  onChange={(e) =>
                    setProfileForm((prev) => ({
                      ...prev,
                      phone_number: e.target.value,
                    }))
                  }
                  className="w-full text-sm border border-[#245C45]/20 rounded-xl px-3 py-2 bg-white text-[#252A27] focus:ring-2 focus:ring-[#245C45]/30 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#252A27] mb-1">
                  Operating Address / Shelter Location
                </label>
                <textarea
                  rows="2"
                  value={profileForm.address}
                  onChange={(e) =>
                    setProfileForm((prev) => ({
                      ...prev,
                      address: e.target.value,
                    }))
                  }
                  className="w-full text-sm border border-[#245C45]/20 rounded-xl px-3 py-2 bg-white text-[#252A27] focus:ring-2 focus:ring-[#245C45]/30 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#245C45]/10">
                <button
                  type="button"
                  onClick={() => setShowProfileModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#252A27]/70 hover:bg-[#F8F7F2]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingProfile}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#245C45] text-white hover:bg-[#1D4A37] transition-all disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  {isSubmittingProfile ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Contact Details</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
