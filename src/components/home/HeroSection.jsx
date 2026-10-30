import { ArrowRight, Utensils, Sprout, Heart, ShieldCheck, Sparkles } from 'lucide-react';
import heroMealImg from '../../assets/images/hero-meal.jpg';

export default function HeroSection({ onOrderClick, onLearnMoreClick }) {
  const highlights = [
    {
      icon: Utensils,
      title: 'Fresh Meals',
      subtitle: 'At Your Campus',
    },
    {
      icon: Sprout,
      title: 'Zero Food Waste',
      subtitle: 'For a Greener Planet',
    },
    {
      icon: Heart,
      title: 'Support Communities',
      subtitle: 'Meals for Those in Need',
    },
  ];

  return (
    <section
      id="home"
      className="relative overflow-hidden pt-8 pb-16 md:pt-14 md:pb-24 lg:pt-16 lg:pb-28"
    >
      {/* Subtle organic background decoration */}
      <div
        className="pointer-events-none absolute -top-24 -left-24 w-96 h-96 rounded-full bg-[#E6EFE7]/60 blur-3xl -z-10"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute top-1/2 -right-24 w-80 h-80 rounded-full bg-[#E99A55]/10 blur-3xl -z-10"
        aria-hidden="true"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Left Column: Hero Text Content */}
          <div className="lg:col-span-7 flex flex-col justify-center text-left">
            {/* Small Label */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-wider uppercase bg-[#E6EFE7] text-[#245C45] border border-[#245C45]/15 w-fit mb-5 shadow-2xs">
              <Sparkles className="w-3.5 h-3.5 text-[#E99A55]" />
              <span>SUSTAINABLE CAMPUS DINING</span>
            </div>

            {/* Main Heading */}
            <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-[#252A27] leading-[1.15]">
              Good Food Today.{' '}
              <span className="block text-[#245C45] mt-1">
                A Better Tomorrow.
              </span>
            </h1>

            {/* Supporting Description */}
            <p className="mt-5 text-lg sm:text-xl text-[#252A27]/80 leading-relaxed max-w-2xl font-normal">
              PlateWise helps you enjoy fresh, affordable meals while reducing
              food waste and supporting those in need.
            </p>

            {/* CTA Buttons */}
            <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
              <button
                type="button"
                onClick={onOrderClick}
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 text-base font-medium text-white bg-[#245C45] hover:bg-[#164B38] rounded-xl shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer active:scale-[0.98]"
              >
                <span>Order Now</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onLearnMoreClick}
                className="inline-flex items-center justify-center px-7 py-3.5 text-base font-medium text-[#245C45] bg-[#E6EFE7]/80 hover:bg-[#E6EFE7] border border-[#245C45]/20 rounded-xl transition-all duration-200 cursor-pointer"
              >
                Learn More
              </button>
            </div>

            {/* Three Compact Highlights */}
            <div className="mt-12 pt-8 border-t border-[#245C45]/15 grid grid-cols-1 sm:grid-cols-3 gap-5">
              {highlights.map((item, idx) => {
                const IconComponent = item.icon;
                return (
                  <div
                    key={idx}
                    className="flex items-start gap-3 p-3 rounded-lg bg-white/50 border border-[#245C45]/5 hover:bg-white/80 transition-colors"
                  >
                    <div className="w-9 h-9 rounded-lg bg-[#E6EFE7] text-[#245C45] flex items-center justify-center flex-shrink-0">
                      <IconComponent className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-[#252A27] leading-snug">
                        {item.title}
                      </h4>
                      <p className="text-xs text-[#252A27]/70 mt-0.5">
                        {item.subtitle}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Authentic Indian Vegetarian Thali Photography */}
          <div className="lg:col-span-5 flex justify-center lg:justify-end">
            <div className="relative w-full max-w-lg lg:max-w-none">
              {/* Outer decorative soft glow */}
              <div
                className="absolute inset-0 bg-gradient-to-tr from-[#245C45]/10 to-[#E99A55]/15 rounded-3xl transform rotate-1 scale-105 -z-10"
                aria-hidden="true"
              />

              {/* Main Image Container */}
              <div className="relative rounded-2xl overflow-hidden shadow-xl border-4 border-white bg-white">
                <img
                  src={heroMealImg}
                  alt="Fresh Indian vegetarian thali with dal, rice, chapati, raita and vegetables"
                  className="w-full h-[360px] sm:h-[420px] lg:h-[460px] object-cover hover:scale-102 transition-transform duration-500 ease-out"
                  loading="eager"
                  width="600"
                  height="460"
                />

                {/* Subtle warm vignette / gradient for image depth */}
                <div
                  className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent pointer-events-none"
                  aria-hidden="true"
                />

                {/* Small floating badge: 'Save Food, Save Lives' */}
                <div className="absolute bottom-5 left-5 right-5 sm:right-auto sm:max-w-xs bg-white/95 backdrop-blur-md px-4 py-3 rounded-xl shadow-lg border border-[#245C45]/15 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#245C45] text-white flex items-center justify-center flex-shrink-0">
                    <Heart className="w-4 h-4 fill-[#E99A55] text-[#E99A55]" />
                  </div>
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-[#245C45] block">
                      Save Food, Save Lives
                    </span>
                    <span className="text-xs text-[#252A27]/75 font-medium">
                      Zero-waste smart dining in action
                    </span>
                  </div>
                </div>
              </div>

              {/* Secondary Trust Tag */}
              <div className="hidden sm:flex absolute -top-3 -right-3 bg-[#F8F7F2] border border-[#245C45]/15 rounded-lg py-1.5 px-3 shadow-sm items-center gap-1.5 text-xs font-medium text-[#245C45]">
                <ShieldCheck className="w-4 h-4 text-[#245C45]" />
                <span>100% Hygienic Campus Cafeteria</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
