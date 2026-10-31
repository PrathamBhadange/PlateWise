import { ArrowLeft, Sprout, Recycle, Heart } from 'lucide-react';
import BrandLogo from '../../components/common/BrandLogo';
import LoginForm from '../../components/auth/LoginForm';
import heroMealImg from '../../assets/images/hero-meal.jpg';

export default function LoginPage({ onBackToHome, onNavigateSignUp, onNavigateForgotPassword }) {
  const highlights = [
    {
      icon: Sprout,
      iconBg: 'bg-[#E6EFE7] text-[#245C45]',
      title: 'Fresh Meals',
      subtitle: 'At Your Campus',
    },
    {
      icon: Recycle,
      iconBg: 'bg-[#E6EFE7] text-[#245C45]',
      title: 'Zero Food Waste',
      subtitle: 'For a Greener Planet',
    },
    {
      icon: Heart,
      iconBg: 'bg-[#E99A55]/20 text-[#E99A55]',
      title: 'Support Communities',
      subtitle: 'Meals for Those in Need',
    },
  ];

  return (
    <div className="min-h-screen bg-[#F8F7F2] text-[#252A27] flex flex-col justify-between relative overflow-x-hidden overflow-y-auto selection:bg-[#245C45] selection:text-white">
      {/* Subtle organic background gradients */}
      <div
        className="pointer-events-none absolute -top-24 -left-24 w-96 h-96 rounded-full bg-[#E6EFE7]/70 blur-3xl -z-10"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute top-1/3 -right-24 w-96 h-96 rounded-full bg-[#E99A55]/15 blur-3xl -z-10"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-24 left-1/4 w-96 h-96 rounded-full bg-[#245C45]/10 blur-3xl -z-10"
        aria-hidden="true"
      />

      {/* Top Page Header (shrink-0 prevents vertical squishing) */}
      <header className="shrink-0 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 sm:py-5 flex items-center justify-between z-20">
        <BrandLogo onClick={onBackToHome} href="/" size="md" />

        <button
          type="button"
          onClick={onBackToHome}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs sm:text-sm font-medium text-[#245C45] hover:text-[#164B38] hover:bg-[#E6EFE7]/80 rounded-xl transition-all duration-200 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </button>
      </header>

      {/* Main Content Area: Centered vertically when space permits, natural scroll without top clipping */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 flex flex-col justify-center relative z-10">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 xl:gap-8 items-center my-auto">
          
          {/* Left Decorative Column: Indian Food Photography & Calligraphic Note (Desktop Only) */}
          <div className="hidden lg:flex lg:col-span-3 flex-col items-center justify-center relative">
            {/* Playful Stylized Calligraphic Note */}
            <div className="text-center mb-4 transform -rotate-3 select-none">
              <span className="font-['Caveat',cursive] text-2xl xl:text-3xl font-bold text-[#252A27] tracking-wide block leading-tight">
                Good Food
              </span>
              <span className="font-['Caveat',cursive] text-2xl xl:text-3xl font-bold text-[#245C45] tracking-wide inline-flex items-center gap-1.5 leading-tight">
                Better People
                <span className="text-lg">🌱</span>
              </span>
            </div>

            {/* Authentic Indian Food Plate Card */}
            <div className="relative group w-56 xl:w-64">
              <div className="absolute inset-0 bg-[#245C45]/10 rounded-3xl transform -rotate-2 group-hover:rotate-0 transition-transform duration-300" />
              <div className="relative rounded-3xl overflow-hidden border-4 border-white shadow-lg bg-white">
                <img
                  src={heroMealImg}
                  alt="Authentic fresh Indian vegetarian thali with dal, rice, chapati and sabzi"
                  className="w-full h-52 xl:h-60 object-cover object-center group-hover:scale-105 transition-transform duration-500"
                  loading="eager"
                  width="256"
                  height="240"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
                <div className="absolute bottom-2.5 left-2.5 right-2.5 bg-white/95 backdrop-blur-xs px-2.5 py-1.5 rounded-xl border border-white/40 text-center">
                  <span className="text-[11px] font-semibold text-[#245C45]">
                    100% Wholesome Campus Meals
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Center Column: White / Warm Cream Login Card (Horizontally & Vertically Balanced) */}
          <div className="lg:col-span-6 flex justify-center">
            <div className="w-full max-w-md bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-7 xl:p-8 shadow-xl border border-[#245C45]/15 relative">
              {/* Subtle top brand accent line */}
              <div className="absolute top-0 left-8 right-8 h-1 bg-gradient-to-r from-transparent via-[#245C45] to-transparent rounded-full" />

              {/* Card Header: Brand Mark, Welcome Back, Subtitle */}
              <div className="text-center mb-4 sm:mb-5">
                <div className="inline-flex justify-center mb-1.5">
                  <BrandLogo onClick={onBackToHome} href="/" size="md" showTagline={false} />
                </div>

                <h1 className="font-serif text-2xl sm:text-[26px] font-bold text-[#252A27] tracking-tight mt-1">
                  Welcome Back
                </h1>

                <p className="text-xs sm:text-sm font-medium text-[#252A27]/80 mt-0.5">
                  Sign in to your PlateWise account
                </p>

                <p className="text-[11px] sm:text-xs text-[#6B8F71] mt-0.5 tracking-wide">
                  Order smart. Waste less. Feed more.
                </p>
              </div>

              {/* Login Form Component */}
              <LoginForm
                onNavigateSignUp={onNavigateSignUp}
                onNavigateForgotPassword={onNavigateForgotPassword}
              />
            </div>
          </div>

          {/* Right Decorative Column: Highlights & Sustainable Campus Dining Note (Desktop Only) */}
          <div className="hidden lg:flex lg:col-span-3 flex-col justify-center items-center xl:items-start pl-0 xl:pl-4 space-y-4">
            {/* Three Highlight Cards */}
            <div className="space-y-3 w-full max-w-xs">
              {highlights.map((item, idx) => {
                const IconComponent = item.icon;
                return (
                  <div
                    key={idx}
                    className="flex items-center gap-3 p-3 rounded-2xl bg-white/80 border border-[#245C45]/15 shadow-2xs hover:shadow-xs hover:bg-white transition-all duration-200"
                  >
                    <div
                      className={`w-9 h-9 rounded-xl ${item.iconBg} flex items-center justify-center flex-shrink-0 shadow-2xs`}
                    >
                      <IconComponent className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-[#252A27] tracking-tight">
                        {item.title}
                      </h3>
                      <p className="text-[11px] text-[#252A27]/70 font-medium">
                        {item.subtitle}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Playful Stylized Calligraphic Note */}
            <div className="text-center xl:text-left pt-1 transform rotate-2 select-none">
              <span className="font-['Caveat',cursive] text-2xl xl:text-3xl font-bold text-[#252A27] tracking-wide block leading-tight">
                Sustainable
              </span>
              <span className="font-['Caveat',cursive] text-2xl xl:text-3xl font-bold text-[#245C45] tracking-wide inline-flex items-center gap-1.5 leading-tight">
                Campus Dining
                <span className="text-lg">🌱</span>
              </span>
            </div>
          </div>

        </div>
      </main>

      {/* Page Minimal Footer (shrink-0 ensures it stays accessible at the bottom) */}
      <footer className="shrink-0 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-center text-[11px] text-[#252A27]/60 border-t border-[#245C45]/10 z-20">
        <span>© 2026 PlateWise · College DBMS Project Prototype</span>
      </footer>
    </div>
  );
}
