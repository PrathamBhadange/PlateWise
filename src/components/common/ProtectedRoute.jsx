import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import AuthModal from './AuthModal';

export default function ProtectedRoute({ allowedRoles = [], children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // While /api/auth/me is loading, render the existing loading state without redirecting
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F7F2]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-[#245C45] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-[#252A27]/70 font-medium">Verifying session credentials...</p>
        </div>
      </div>
    );
  }

  // Not logged in
  if (!user) {
    // Unauthenticated user opens /admin:
    // Open the existing auth modal in Login mode with Admin preselected.
    // Do not render the dashboard.
    // If the user closes the modal without logging in, navigate to "/"
    if (location.pathname.startsWith('/admin')) {
      return (
        <div className="min-h-screen bg-[#F8F7F2]">
          <AuthModal
            isOpen={true}
            initialMode="login"
            initialRole="admin"
            onClose={() => navigate('/', { replace: true })}
          />
        </div>
      );
    }
    return <Navigate to="/" state={{ from: location, openAuth: true }} replace />;
  }

  // Deny pending or rejected accounts from all protected dashboards
  const normalizedStatus = String(user.account_status || 'active').trim().toLowerCase();
  if (normalizedStatus !== 'active') {
    return <Navigate to="/" state={{ from: location, openAuth: true }} replace />;
  }

  const normalizedRole = String(user.role || '').trim().toLowerCase();
  const normalizedAllowedRoles = allowedRoles.map((r) => String(r).trim().toLowerCase());

  // If user is authenticated but role is not in allowed roles, redirect to appropriate role home
  if (normalizedAllowedRoles.length > 0 && !normalizedAllowedRoles.includes(normalizedRole)) {
    const accessNotice = 'You do not have access to this area';
    if (normalizedRole === 'kitchen') {
      return <Navigate to="/kitchen" state={{ notice: accessNotice }} replace />;
    }
    if (normalizedRole === 'cashier') {
      return <Navigate to="/cashier" state={{ notice: accessNotice }} replace />;
    }
    if (normalizedRole === 'ngo') {
      return <Navigate to="/ngo" state={{ notice: accessNotice }} replace />;
    }
    if (normalizedRole === 'admin') {
      return <Navigate to="/admin" state={{ notice: accessNotice }} replace />;
    }
    if (normalizedRole === 'student') {
      return <Navigate to="/student" state={{ notice: accessNotice }} replace />;
    }
    return <Navigate to="/" state={{ notice: accessNotice }} replace />;
  }

  return children;
}
