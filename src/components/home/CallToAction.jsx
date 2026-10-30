import { ArrowRight, Play, Sparkles, CheckCircle } from 'lucide-react';

export default function CallToAction({ onGetStarted, onWatchDemo }) {
  return (
    <section className="py-20 sm:py-24 bg-[#F8F7F2] relative overflow-hidden">
      {/* Background soft ambient accents */}
      <div
        className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl h-80 bg-[#E6EFE7]/50 rounded-full blur-3xl -z-10"
        aria-hidden="true"
      />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="bg-white rounded-3xl p-8 sm:p-12 lg:p-16 border border-[#245C45]/15 shadow-sm relative overflow-hidden">
          {/* Subtle top decorative ribbon */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#245C45] via-[#6B8F71] to-[#E99A55]" />

          {/* Micro Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-wider uppercase bg-[#E6EFE7] text-[#245C45] mb-5 border border-[#245C45]/10">
            <Sparkles className="w-3.5 h-3.5 text-[#E99A55]" />
            <span>Join the Movement</span>
          </div>

          {/* Heading */}
          <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-[#252A27] tracking-tight leading-tight">
            Be a Part of the Change.
          </h2>

          {/* Description */}
          <p className="mt-4 sm:mt-5 text-base sm:text-lg text-[#252A27]/80 max-w-2xl mx-auto leading-relaxed">
            Join PlateWise and help us build a sustainable and inclusive campus community.
          </p>

          {/* Buttons */}
          <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              type="button"
              onClick={onGetStarted}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 text-base font-medium text-white bg-[#245C45] hover:bg-[#164B38] rounded-xl shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer active:scale-[0.98]"
            >
              <span>Get Started</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onWatchDemo}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 text-base font-medium text-[#245C45] bg-[#E6EFE7]/80 hover:bg-[#E6EFE7] border border-[#245C45]/20 rounded-xl transition-all duration-200 cursor-pointer"
            >
              <Play className="w-4 h-4 text-[#E99A55] fill-[#E99A55]" />
              <span>Watch How It Works</span>
            </button>
          </div>

          {/* Trust elements */}
          <div className="mt-10 pt-6 border-t border-[#245C45]/10 flex flex-wrap items-center justify-center gap-6 text-xs text-[#252A27]/70">
            <div className="flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-[#245C45]" />
              <span>Free for Students & Faculty</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-[#245C45]" />
              <span>Verified Food Safety Protocol</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-[#245C45]" />
              <span>Direct NGO Partnership</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
