import { Sparkles, Info, Users, Utensils, HeartHandshake, Scale } from 'lucide-react';
import SectionHeading from '../common/SectionHeading';
import sustainabilityImg from '../../assets/images/sustainability.jpg';

const STATS = [
  {
    label: 'Meals Served',
    value: '--',
    unit: 'meals',
    caption: 'Campus Pilot Baseline',
    icon: Utensils,
  },
  {
    label: 'Meals Donated',
    value: '--',
    unit: 'portions',
    caption: 'Target NGO Redistribution',
    icon: HeartHandshake,
  },
  {
    label: 'Food Waste Reduced',
    value: '--',
    unit: 'kg rescued',
    caption: 'Zero-Waste Goal',
    icon: Scale,
  },
  {
    label: 'Happy Students',
    value: '--',
    unit: 'enrolled',
    caption: 'Community Onboarding',
    icon: Users,
  },
];

export default function ImpactSection() {
  return (
    <section
      id="impact"
      className="relative py-20 sm:py-24 lg:py-28 bg-[#164B38] text-white overflow-hidden"
    >
      {/* Background Photograph with subtle overlay */}
      <div className="absolute inset-0 z-0">
        <img
          src={sustainabilityImg}
          alt="Hands gently planting a seedling in fertile earth under soft sunlight"
          className="w-full h-full object-cover opacity-20 filter saturate-75 brightness-75 mix-blend-luminosity"
        />
        {/* Dark forest gradient overlay for maximum readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#164B38] via-[#164B38]/90 to-[#164B38]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Heading */}
        <SectionHeading
          badge="Live Sustainability Metrics"
          title="Our Impact"
          subtitle="Together, we can create a healthier, more sustainable future."
          inverted={true}
        />

        {/* Transparent DB Data Notice */}
        <div className="mt-8 max-w-xl mx-auto flex items-center justify-center gap-2 text-xs text-[#E6EFE7]/80 bg-white/5 border border-white/10 rounded-full py-1.5 px-4 backdrop-blur-xs text-center">
          <Info className="w-3.5 h-3.5 text-[#E99A55] flex-shrink-0" />
          <span>
            Database Integration Placeholder: Metrics will display real-time live data upon DBMS backend launch.
          </span>
        </div>

        {/* 4 Impact Statistics Grid */}
        <div className="mt-12 sm:mt-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          {STATS.map((stat, idx) => {
            const IconComponent = stat.icon;
            return (
              <div
                key={idx}
                className="relative bg-white/10 backdrop-blur-md rounded-2xl p-7 border border-white/15 hover:border-white/30 transition-all duration-300 group flex flex-col justify-between"
              >
                <div>
                  {/* Icon Header */}
                  <div className="w-11 h-11 rounded-xl bg-[#245C45] border border-white/10 text-[#E6EFE7] flex items-center justify-center mb-5 group-hover:scale-105 transition-transform">
                    <IconComponent className="w-5 h-5 text-[#E99A55]" />
                  </div>

                  {/* Main Metric Value */}
                  <div className="flex items-baseline gap-2">
                    <span className="font-serif text-4xl sm:text-5xl font-bold tracking-tight text-white">
                      {stat.value}
                    </span>
                    <span className="text-sm font-medium text-[#E6EFE7]/70">
                      {stat.unit}
                    </span>
                  </div>

                  {/* Stat Label */}
                  <h3 className="mt-3 text-lg font-medium text-white tracking-wide">
                    {stat.label}
                  </h3>
                </div>

                {/* Subtitle / Status tag */}
                <div className="mt-5 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-[#E6EFE7]/70">
                  <span>{stat.caption}</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#E99A55]" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Ecosystem Bottom Pillar */}
        <div className="mt-14 p-6 sm:p-8 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xs flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4 text-left">
            <div className="w-12 h-12 rounded-full bg-[#E99A55]/20 text-[#E99A55] flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-serif text-lg font-semibold text-white">
                Zero-Waste Campus Pledge
              </h4>
              <p className="text-sm text-[#E6EFE7]/80 mt-0.5">
                Every pre-booked meal directly curbs cafeteria overcooking and prevents landfill methane emissions.
              </p>
            </div>
          </div>
          <div className="flex-shrink-0">
            <span className="inline-flex items-center px-4 py-2 rounded-xl bg-[#245C45] text-xs font-semibold uppercase tracking-wider text-white border border-[#E6EFE7]/20">
              Nashik Campus Pilot
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
