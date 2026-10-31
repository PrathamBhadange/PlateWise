import { useState } from 'react';
import { ArrowLeft, KeyRound, Mail, LogIn, CheckCircle2 } from 'lucide-react';
import BrandLogo from '../../components/common/BrandLogo';
import InputField from '../../components/auth/InputField';

export default function ForgotPasswordPlaceholder({ onBackToHome, onNavigateLogin }) {
  const [email, setEmail] = useState('');
  const [sentNotice, setSentNotice] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (email.trim()) {
      setSentNotice(true);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F7F2] text-[#252A27] flex flex-col justify-between p-4 sm:p-6 lg:p-8 overflow-y-auto overflow-x-hidden selection:bg-[#245C45] selection:text-white">
      {/* Header */}
      <header className="shrink-0 w-full max-w-5xl mx-auto flex items-center justify-between">
        <BrandLogo onClick={onBackToHome} href="/" size="md" />
        <button
          type="button"
          onClick={onBackToHome}
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-[#245C45] hover:text-[#164B38] py-2 px-3 rounded-lg hover:bg-[#E6EFE7]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col justify-center py-6 sm:py-8 my-auto w-full max-w-md mx-auto">
        <div className="w-full bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-xl border border-[#245C45]/15 text-center">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[#E6EFE7] text-[#245C45] flex items-center justify-center mx-auto mb-3">
            <KeyRound className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>

          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#252A27]">
            Reset Password
          </h1>

          <p className="mt-2 text-xs sm:text-sm text-[#252A27]/75 leading-relaxed">
            Enter your college email address and we'll send you instructions to reset your PlateWise password.
          </p>

          {!sentNotice ? (
            <form onSubmit={handleSubmit} className="mt-5 space-y-3.5 text-left">
              <InputField
                id="reset-email"
                label="College Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="yourname@college.edu.in"
                leftIcon={Mail}
                required
              />

              <button
                type="submit"
                disabled={!email.trim()}
                className="w-full py-2.5 sm:py-3 px-4 rounded-xl bg-[#245C45] hover:bg-[#164B38] disabled:bg-[#245C45]/50 text-white text-xs sm:text-sm font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
              >
                Send Reset Link (Demo)
              </button>
            </form>
          ) : (
            <div className="mt-5 p-3.5 rounded-xl bg-[#E6EFE7] border border-[#245C45]/20 text-xs text-[#245C45] text-left space-y-1.5">
              <div className="font-semibold flex items-center gap-1.5 text-[#164B38]">
                <CheckCircle2 className="w-4 h-4 text-[#245C45]" />
                <span>Reset Simulation Dispatched</span>
              </div>
              <p className="text-[11px] text-[#252A27]/80 leading-relaxed">
                In a live deployment, a tokenized reset link is delivered to <strong>{email}</strong>. This demo prototype does not send real external emails.
              </p>
            </div>
          )}

          <div className="mt-6 pt-5 border-t border-[#245C45]/10 flex flex-col gap-2">
            <button
              type="button"
              onClick={onNavigateLogin}
              className="w-full py-2 px-4 text-xs font-semibold text-[#245C45] hover:bg-[#E6EFE7] rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Back to Login</span>
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="shrink-0 w-full max-w-5xl mx-auto text-center text-xs text-[#252A27]/60 py-2">
        © 2026 PlateWise · College DBMS Project Prototype
      </footer>
    </div>
  );
}
