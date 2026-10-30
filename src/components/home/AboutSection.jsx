import { CheckCircle2, HeartHandshake, MapPin, Users2 } from 'lucide-react';
import SectionHeading from '../common/SectionHeading';
import campusDiningImg from '../../assets/images/campus-dining.jpg';
import foodDonationImg from '../../assets/images/food-donation.jpg';

export default function AboutSection() {
  return (
    <section id="about" className="py-16 sm:py-20 lg:py-24 bg-white/70 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeading
          badge="Our Mission & Ecosystem"
          title="Bridging Campus Dining With Community Nutrition"
          subtitle="PlateWise was envisioned to solve the dual challenges of college canteen food waste and community food insecurity."
        />

        {/* Two-part Story Grid */}
        <div className="mt-14 lg:mt-18 grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-center">
          {/* Left Column: Campus Life & Dining Image */}
          <div className="relative group">
            <div className="relative rounded-2xl overflow-hidden shadow-lg border-2 border-[#245C45]/15 bg-white">
              <img
                src={campusDiningImg}
                alt="College students enjoying fresh vegetarian thali meals together at university campus cafeteria"
                className="w-full h-[320px] sm:h-[380px] object-cover group-hover:scale-102 transition-transform duration-500"
                loading="lazy"
                width="600"
                height="380"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
              <div className="absolute bottom-4 left-4 right-4 bg-white/90 backdrop-blur-md p-3.5 rounded-xl border border-white/40 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#245C45] text-white flex items-center justify-center flex-shrink-0">
                  <Users2 className="w-5 h-5 text-[#E6EFE7]" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-[#252A27]">
                    Vibrant Campus Community
                  </h4>
                  <p className="text-xs text-[#252A27]/75">
                    Connecting 1,000+ students with warm, hygienic campus meals
                  </p>
                </div>
              </div>
            </div>

            {/* Small corner pill */}
            <div className="absolute -top-3 -right-2 bg-[#E6EFE7] border border-[#245C45]/20 text-[#245C45] text-xs font-semibold px-3 py-1 rounded-full shadow-xs flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#E99A55]" />
              <span>Nashik, Maharashtra</span>
            </div>
          </div>

          {/* Right Column: Mission Content */}
          <div className="flex flex-col justify-center">
            <h3 className="font-serif text-2xl sm:text-3xl font-semibold text-[#252A27] tracking-tight leading-snug">
              Every grain counts. Every student matters.
            </h3>
            <p className="mt-4 text-[#252A27]/80 text-base leading-relaxed">
              Every day across university dining halls, substantial quantities of wholesome prepared food go unused due to unpredictable attendance and fixed cooking batches. Meanwhile, neighboring communities face nutritional deficits.
            </p>
            <p className="mt-3 text-[#252A27]/80 text-base leading-relaxed">
              PlateWise transforms this cycle into an interconnected, circular ecosystem. By enabling smart pre-orders and intelligent inventory tracking, cafeterias optimize preparation, while verified NGO partners safely distribute surplus food to local shelters.
            </p>

            {/* Core Values checklist */}
            <div className="mt-6 space-y-3 pt-4 border-t border-[#245C45]/15">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#245C45] flex-shrink-0 mt-0.5" />
                <span className="text-sm text-[#252A27]/85 font-medium">
                  <strong>Intelligent Demand Forecasting:</strong> Predict meal demand to minimize surplus before it happens.
                </span>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#245C45] flex-shrink-0 mt-0.5" />
                <span className="text-sm text-[#252A27]/85 font-medium">
                  <strong>Direct NGO Redistribution:</strong> Safe, compliant temperature-regulated surplus distribution to community kitchens.
                </span>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#245C45] flex-shrink-0 mt-0.5" />
                <span className="text-sm text-[#252A27]/85 font-medium">
                  <strong>Anonymous Meal Credits:</strong> Peer-to-peer sponsorship ensuring no peer goes hungry on campus.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Secondary Story: Food Redistribution in Action */}
        <div className="mt-14 p-6 sm:p-8 rounded-2xl bg-[#E6EFE7]/40 border border-[#245C45]/15 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          <div className="md:col-span-4 rounded-xl overflow-hidden shadow-xs border border-white">
            <img
              src={foodDonationImg}
              alt="Hands gently sharing packaged nutritional food boxes with community members in need"
              className="w-full h-44 sm:h-52 object-cover"
              loading="lazy"
              width="400"
              height="200"
            />
          </div>
          <div className="md:col-span-8 flex flex-col justify-center">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#245C45] uppercase tracking-wider mb-2">
              <HeartHandshake className="w-4 h-4 text-[#E99A55]" />
              <span>Community Impact Network</span>
            </div>
            <h4 className="font-serif text-xl sm:text-2xl font-semibold text-[#252A27]">
              Zero-Waste. 100% Dignity.
            </h4>
            <p className="mt-2 text-sm text-[#252A27]/80 leading-relaxed">
              Surplus is never treated as refuse; it is high-grade, freshly prepared, wholesome Indian vegetarian meals packed safely under strict hygiene standards and transferred immediately to verified charity partners across Nashik.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
