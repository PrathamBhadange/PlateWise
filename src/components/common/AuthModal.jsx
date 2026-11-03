import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Lock, Mail, User, Info, ArrowRight, ShieldCheck } from 'lucide-react';
import BrandLogo from './BrandLogo';
import { useAuth } from '../../context/useAuth';

export default function AuthModal({ isOpen, onClose, initialMode = 'login', initialRole = 'student' }) {
  const navigate = useNavigate();
  const { login, register } = useAuth();

  const [mode, setMode] = useState(initialMode);
  const [role, setRole] = useState(initialRole);
  const [staffView, setStaffView] = useState('cashier'); // 'cashier' | 'kitchen'
  const [staffRegistrationRole, setStaffRegistrationRole] = useState('kitchen'); // 'kitchen' | 'cashier'
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync state if isOpen or initial props change without triggering cascading renders in an effect
  const [prevProps, setPrevProps] = useState({ isOpen, initialMode, initialRole });
  if (
    prevProps.isOpen !== isOpen ||
    prevProps.initialMode !== initialMode ||
    prevProps.initialRole !== initialRole
  ) {
    setPrevProps({ isOpen, initialMode, initialRole });
    if (isOpen) {
      setMode(initialMode);
      setRole(initialRole);
      setError('');
      setNotice('');
    }
  }

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setNotice('');
    setError('');
    setIsSubmitting(true);

    try {
      if (mode === 'signup') {
        const cleanName = fullName.trim();
        const cleanEmail = email.trim();

        if (!cleanName) {
          setError('Full name is required.');
          setIsSubmitting(false);
          return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(cleanEmail)) {
          setError('Please provide a valid email address.');
          setIsSubmitting(false);
          return;
        }

        if (password.length < 8) {
          setError('Password must be at least 8 characters long.');
          setIsSubmitting(false);
          return;
        }

        if (password !== confirmPassword) {
          setError('Passwords do not match.');
          setIsSubmitting(false);
          return;
        }

        // Map selected role to account_type
        if (role === 'admin') {
          setError('Admin accounts cannot be created via registration.');
          setIsSubmitting(false);
          return;
        }

        let accountType = 'student';
        if (role === 'cafeteria') {
          accountType = staffRegistrationRole === 'cashier' ? 'cashier' : 'kitchen';
        } else if (role === 'ngo') {
          accountType = 'ngo';
        }

        const regRes = await register(cleanName, cleanEmail, password, confirmPassword, accountType);

        if (accountType === 'student') {
          setNotice('Registration successful! Redirecting to your student dashboard...');
          setPassword('');
          setConfirmPassword('');
          setTimeout(() => {
            onClose();
            navigate('/student');
          }, 800);
        } else {
          setNotice(
            regRes?.message ||
              `${accountType === 'ngo' ? 'NGO partner' : 'Staff'} registration submitted successfully. Your account is pending administrator approval before you can log in.`
          );
          setPassword('');
          setConfirmPassword('');
        }
      } else {
        const loginAsHint = role === 'admin' ? 'admin' : null;
        const user = await login(email.trim(), password, loginAsHint);
        const normalizedRole = user?.role ? String(user.role).trim().toLowerCase() : '';

        // Required order of operations:
        // (1) await login and receive the user (completed above)
        // (2) close the modal
        // (3) navigate based on the returned user's role
        onClose();

        if (normalizedRole === 'kitchen') {
          navigate('/kitchen');
        } else if (normalizedRole === 'cashier') {
          navigate('/cashier');
        } else if (normalizedRole === 'ngo') {
          navigate('/ngo');
        } else if (normalizedRole === 'admin') {
          // If admin logged in via cafeteria staff selector, honor the chosen operational view
          if (role === 'cafeteria') {
            navigate(staffView === 'kitchen' ? '/kitchen' : '/cashier');
          } else {
            navigate('/admin');
          }
        } else if (normalizedRole === 'student') {
          navigate('/student');
        } else {
          console.warn(`[AUTH] Unrecognized or missing role: "${normalizedRole}", navigating to landing page`);
          navigate('/');
        }
      }
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        'Authentication failed. Please check your credentials.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md bg-[#F8F7F2] rounded-2xl shadow-2xl border border-[#245C45]/20 overflow-hidden p-6 sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-[#252A27]/60 hover:text-[#252A27] hover:bg-[#E6EFE7] rounded-lg transition-colors cursor-pointer"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center mb-6">
          <div className="inline-block mb-3">
            <BrandLogo size="md" showTagline={false} />
          </div>
          <h3 className="font-serif text-2xl font-bold text-[#252A27]">
            {mode === 'login' ? 'Welcome Back' : 'Create an Account'}
          </h3>
          <p className="text-xs text-[#252A27]/70 mt-1">
            {mode === 'login'
              ? 'Access your campus meal account and zero-waste credits'
              : 'Join the PlateWise zero-waste campus dining network'}
          </p>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="flex bg-[#E6EFE7]/80 p-1 rounded-xl mb-5 border border-[#245C45]/10">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setNotice('');
              setError('');
              setPassword('');
              setConfirmPassword('');
            }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              mode === 'login'
                ? 'bg-[#245C45] text-white shadow-xs'
                : 'text-[#252A27]/70 hover:text-[#252A27]'
            }`}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              if (role === 'admin') {
                setRole('student');
              }
              setNotice('');
              setError('');
              setPassword('');
              setConfirmPassword('');
            }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              mode === 'signup'
                ? 'bg-[#245C45] text-white shadow-xs'
                : 'text-[#252A27]/70 hover:text-[#252A27]'
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* Role Selector */}
        <div className="mb-4">
          <label className="block text-xs font-medium text-[#252A27]/80 mb-1.5">
            Select Your Role
          </label>
          <div className={mode === 'login' ? 'grid grid-cols-2 sm:grid-cols-4 gap-1.5' : 'grid grid-cols-3 gap-2'}>
            {(mode === 'login'
              ? [
                  { id: 'student', label: 'Student' },
                  { id: 'cafeteria', label: 'Cafeteria Staff' },
                  { id: 'ngo', label: 'NGO Partner' },
                  { id: 'admin', label: 'Admin' },
                ]
              : [
                  { id: 'student', label: 'Student' },
                  { id: 'cafeteria', label: 'Cafeteria Staff' },
                  { id: 'ngo', label: 'NGO Partner' },
                ]
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setRole(item.id)}
                className={`py-1.5 px-2 text-[11px] font-medium rounded-lg border text-center transition-all cursor-pointer ${
                  role === item.id
                    ? 'border-[#245C45] bg-[#E6EFE7] text-[#245C45] font-semibold shadow-2xs'
                    : 'border-[#245C45]/15 bg-white text-[#252A27]/70 hover:bg-[#E6EFE7]/40'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Expandable Staff Sub-options */}
          {role === 'cafeteria' && (
            <div className="mt-2.5 p-2.5 bg-[#E6EFE7]/80 rounded-xl border border-[#245C45]/20 animate-fade-in text-left">
              <span className="text-[11px] font-semibold text-[#245C45] block mb-1.5">
                {mode === 'login' ? 'Select Staff Operational View:' : 'Select Staff Account Type:'}
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => (mode === 'login' ? setStaffView('cashier') : setStaffRegistrationRole('cashier'))}
                  className={`py-1.5 px-2 text-xs font-medium rounded-lg border text-center transition-all cursor-pointer ${
                    (mode === 'login' ? staffView === 'cashier' : staffRegistrationRole === 'cashier')
                      ? 'bg-[#245C45] text-white border-[#245C45] shadow-2xs font-semibold'
                      : 'bg-white text-[#252A27]/80 border-[#245C45]/20 hover:bg-white/80'
                  }`}
                >
                  Cashier View
                </button>
                <button
                  type="button"
                  onClick={() => (mode === 'login' ? setStaffView('kitchen') : setStaffRegistrationRole('kitchen'))}
                  className={`py-1.5 px-2 text-xs font-medium rounded-lg border text-center transition-all cursor-pointer ${
                    (mode === 'login' ? staffView === 'kitchen' : staffRegistrationRole === 'kitchen')
                      ? 'bg-[#245C45] text-white border-[#245C45] shadow-2xs font-semibold'
                      : 'bg-white text-[#252A27]/80 border-[#245C45]/20 hover:bg-white/80'
                  }`}
                >
                  Kitchen View
                </button>
              </div>
              <p className="text-[10px] text-[#245C45]/70 mt-1">
                {mode === 'login'
                  ? 'Authenticated database role is authoritative: kitchen staff route to /kitchen, cashier staff to /cashier.'
                  : 'Staff accounts start as pending and require canteen administrator approval before login.'}
              </p>
            </div>
          )}
        </div>

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {mode === 'signup' && (
            <div>
              <label className="block text-xs font-medium text-[#252A27] mb-1">
                Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-[#245C45] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="e.g. Aarav Sharma"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-[#245C45]/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#245C45]/30 focus:border-[#245C45]"
                  required
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-[#252A27] mb-1">
              Campus Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#245C45] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="email"
                placeholder="student@college.edu.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-[#245C45]/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#245C45]/30 focus:border-[#245C45]"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#252A27] mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#245C45] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-[#245C45]/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#245C45]/30 focus:border-[#245C45]"
                required
              />
            </div>
          </div>

          {mode === 'signup' && (
            <div>
              <label className="block text-xs font-medium text-[#252A27] mb-1">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#245C45] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-[#245C45]/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#245C45]/30 focus:border-[#245C45]"
                  required
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-2 py-2.5 px-4 bg-[#245C45] hover:bg-[#164B38] text-white rounded-xl text-sm font-medium shadow-sm transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <span>
              {isSubmitting
                ? mode === 'login'
                  ? 'Verifying...'
                  : 'Registering...'
                : mode === 'login'
                ? 'Continue to Account'
                : 'Register for PlateWise'}
            </span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Error message */}
        {error && (
          <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2 text-xs text-red-700">
            <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        {/* Notice for feedback */}
        {notice && (
          <div className="mt-4 p-3 rounded-lg bg-[#E6EFE7] border border-[#245C45]/20 flex items-start gap-2 text-xs text-[#245C45]">
            <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-[#E99A55]" />
            <span>{notice}</span>
          </div>
        )}

        {/* Footer info badge */}
        <div className="mt-5 pt-4 border-t border-[#245C45]/10 flex items-center justify-center gap-1.5 text-[11px] text-[#252A27]/60">
          <ShieldCheck className="w-3.5 h-3.5 text-[#245C45]" />
          <span>College DBMS Project · PlateWise Prototype</span>
        </div>
      </div>
    </div>
  );
}
