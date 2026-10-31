import { ArrowLeft, UserPlus, ShieldCheck, LogIn } from 'lucide-react';
import BrandLogo from '../../components/common/BrandLogo';

export default function SignUpPlaceholder({ onBackToHome, onNavigateLogin }) {
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
            <UserPlus className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>

          <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-[#E6EFE7] text-[#245C45] mb-2 border border-[#245C45]/10">
            Phase 2 DBMS Module
          </span>

          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#252A27] mt-1">
            Campus Sign Up
          </h1>

          <p className="mt-2.5 text-xs sm:text-sm text-[#252A27]/75 leading-relaxed">
            New student, canteen staff, and NGO partner registration will be enabled in Phase 2 upon database schema migration.
          </p>

          <div className="mt-5 p-3.5 rounded-xl bg-[#F8F7F2] border border-[#245C45]/10 text-xs text-[#252A27]/80 text-left space-y-1">
            <div className="font-semibold text-[#245C45] flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" />
              <span>Campus Verification Protocol</span>
            </div>
            <p className="text-[11px] text-[#252A27]/70 leading-relaxed">
              Registration requires active institutional email verification to ensure zero food misuse and secure meal credits.
            </p>
          </div>

          <div className="mt-6 flex flex-col gap-2.5">
            <button
              type="button"
              onClick={onNavigateLogin}
              className="w-full py-2.5 sm:py-3 px-4 rounded-xl bg-[#245C45] hover:bg-[#164B38] text-white text-xs sm:text-sm font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              <span>Return to Login</span>
            </button>
            <button
              type="button"
              onClick={onBackToHome}
              className="w-full py-2 px-4 rounded-xl border border-[#245C45]/20 text-[#245C45] text-xs font-semibold hover:bg-[#E6EFE7] transition-colors cursor-pointer"
            >
              Explore PlateWise Landing Page
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
