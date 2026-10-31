import { useNavigate } from 'react-router-dom';
import { ArrowRight, Sprout, Sparkles } from 'lucide-react';
import heroMealImg from '../../assets/images/hero-meal.jpg';

export default function MealHeroBanner() {
  const navigate = useNavigate();

  return (
    <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden bg-gradient-to-r from-[#164B38] via-[#1b533f] to-[#245C45] text-white shadow-md border border-[#245C45]/20">
      {/* Subtle organic light reflections */}
      <div
        className="pointer-events-none absolute -top-16 -left-16 w-64 h-64 rounded-full bg-[#6B8F71]/20 blur-2xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-16 right-1/3 w-64 h-64 rounded-full bg-[#E99A55]/15 blur-2xl"
        aria-hidden="true"
      />

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center p-6 sm:p-8 lg:p-10 relative z-10">
        {/* Left Column: Text & CTA Button */}
        <div className="md:col-span-7 flex flex-col justify-center text-left">
          {/* Tagline Pill */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-semibold tracking-wider uppercase bg-white/10 text-[#E6EFE7] border border-white/15 w-fit mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-[#E99A55]" />
            <span>TODAY'S LUNCH</span>
          </div>

          {/* Heading */}
          <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-white leading-tight">
            Nutritious.{' '}
            <span className="text-[#E6EFE7]">Sustainable.</span>{' '}
            <span className="text-[#E99A55]">Delicious.</span>
          </h2>

          {/* Subtitle */}
          <p className="mt-3 text-xs sm:text-sm text-[#E6EFE7]/85 max-w-lg leading-relaxed">
            Fresh meals prepared with care for you and the planet. Lock your meal preference early to curb canteen overcooking.
          </p>

          {/* CTA Button */}
          <div className="mt-6 flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/student/order')}
              className="inline-flex items-center gap-2 px-5 py-2.5 sm:px-6 sm:py-3 bg-white hover:bg-[#F8F7F2] text-[#245C45] font-semibold text-xs sm:text-sm rounded-xl shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer active:scale-[0.98]"
            >
              <span>Browse Menu</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <span className="text-[11px] text-[#E6EFE7]/70 hidden sm:inline-flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#E99A55]" />
              <span>Express token counter pickup</span>
            </span>
          </div>
        </div>

        {/* Right Column: Food Image with Badge */}
        <div className="md:col-span-5 flex justify-center md:justify-end">
          <div className="relative w-full max-w-xs sm:max-w-sm">
            {/* Outer soft ring */}
            <div className="relative rounded-2xl overflow-hidden shadow-xl border-2 border-white/30 bg-[#164B38]">
              <img
                src={heroMealImg}
                alt="Today's Lunch: Fresh Indian Vegetarian Thali"
                className="w-full h-44 sm:h-52 object-cover object-center transform hover:scale-103 transition-transform duration-500"
                loading="eager"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />

              {/* Floating Badge */}
              <div className="absolute bottom-3 left-3 right-3 bg-white/95 backdrop-blur-md px-3 py-2 rounded-xl shadow-sm border border-white/60 flex items-center gap-2.5 text-[#252A27]">
                <div className="w-7 h-7 rounded-lg bg-[#245C45] text-white flex items-center justify-center flex-shrink-0">
                  <Sprout className="w-4 h-4 text-[#E6EFE7]" />
                </div>
                <div className="leading-tight">
                  <span className="text-xs font-bold text-[#245C45] block">
                    100% Wholesome Campus Meals
                  </span>
                  <span className="text-[10px] text-[#252A27]/70 font-medium">
                    Zero-waste certified preparation
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
