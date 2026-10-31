import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Lock, Mail, User, Info, ArrowRight, ShieldCheck } from 'lucide-react';
import BrandLogo from './BrandLogo';

const ROLE_PATHS = {
  cafeteria: '/kitchen',
  admin: '/admin',
};

export default function AuthModal({ isOpen, onClose, initialMode = 'login' }) {
  const navigate = useNavigate();
  const [mode, setMode] = useState(initialMode);
  const [role, setRole] = useState('student');
  const [notice, setNotice] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setNotice(
      'Notice: Authentication backend is pending DBMS database connection in Phase 2. This interface demonstrates the upcoming login architecture.'
    );
    const targetPath = ROLE_PATHS[role];
    if (targetPath) {
      onClose();
      navigate(targetPath);
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
              setNotice('');
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
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'student', label: 'Student' },
              { id: 'cafeteria', label: 'Cafeteria Staff' },
              { id: 'ngo', label: 'NGO Partner' },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setRole(item.id)}
                className={`py-1.5 px-2 text-[11px] font-medium rounded-lg border text-center transition-all cursor-pointer ${
                  role === item.id
                    ? 'border-[#245C45] bg-[#E6EFE7] text-[#245C45] font-semibold'
                    : 'border-[#245C45]/15 bg-white text-[#252A27]/70 hover:bg-[#E6EFE7]/40'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Demo Form */}
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
                className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-[#245C45]/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#245C45]/30 focus:border-[#245C45]"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full mt-2 py-2.5 px-4 bg-[#245C45] hover:bg-[#164B38] text-white rounded-xl text-sm font-medium shadow-sm transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
          >
            <span>{mode === 'login' ? 'Continue to Account' : 'Register for PlateWise'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

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
