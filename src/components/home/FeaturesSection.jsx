import {
  UtensilsCrossed,
  RotateCcw,
  HeartHandshake,
  BarChart3,
  CheckCircle2,
} from 'lucide-react';
import SectionHeading from '../common/SectionHeading';

const FEATURES = [
  {
    icon: UtensilsCrossed,
    title: 'Smart Meal Ordering',
    description:
      'Quick and easy ordering with real-time menu updates.',
    details: [
      'Live cafeteria menu updates',
      'Contactless token generation',
      'Reduced queue waiting times',
    ],
    accent: 'bg-[#245C45]',
  },
  {
    icon: RotateCcw,
    title: 'Zero Food Waste',
    description:
      'Track surplus food and support redistribution.',
    details: [
      'Surplus inventory tracking',
      'Automated portion forecasting',
      'Direct NGO pickup notifications',
    ],
    accent: 'bg-[#164B38]',
  },
  {
    icon: HeartHandshake,
    title: 'Meal Sponsorship',
    description:
      'Support meals for students who need assistance.',
    details: [
      'Anonymous meal grant credits',
      'Campus micro-donations',
      'Dignified and inclusive support',
    ],
    accent: 'bg-[#245C45]',
  },
  {
    icon: BarChart3,
    title: 'Impact Tracking',
    description:
      'See how your participation makes a difference.',
    details: [
      'Personal eco-savings metric',
      'Campus-wide food rescued logs',
      'Transparent community reports',
    ],
    accent: 'bg-[#164B38]',
  },
];

export default function FeaturesSection() {
  return (
    <section id="features" className="py-16 sm:py-20 lg:py-24 bg-[#F8F7F2]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Heading */}
        <SectionHeading
          badge="Platform Capabilities"
          title="Our Key Features"
          subtitle="Smart solutions for a sustainable and inclusive campus."
        />

        {/* 4 Feature Cards Grid */}
        <div className="mt-14 lg:mt-18 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-7">
          {FEATURES.map((feature, idx) => {
            const IconComponent = feature.icon;
            return (
              <div
                key={idx}
                className="group bg-white rounded-2xl p-7 border border-[#245C45]/15 shadow-xs hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  {/* Icon Header */}
                  <div className="w-12 h-12 rounded-xl bg-[#E6EFE7] text-[#245C45] flex items-center justify-center mb-6 group-hover:bg-[#245C45] group-hover:text-white transition-colors duration-300">
                    <IconComponent className="w-6 h-6 transition-transform group-hover:scale-105" />
                  </div>

                  {/* Feature Title */}
                  <h3 className="font-serif text-xl font-semibold text-[#252A27] tracking-tight mb-2.5">
                    {feature.title}
                  </h3>

                  {/* Feature Description */}
                  <p className="text-sm text-[#252A27]/75 leading-relaxed mb-5">
                    {feature.description}
                  </p>

                  {/* Bullet points for clarity and human-crafted feel */}
                  <ul className="space-y-2 border-t border-[#245C45]/10 pt-4">
                    {feature.details.map((detail, dIdx) => (
                      <li
                        key={dIdx}
                        className="flex items-center gap-2 text-xs text-[#252A27]/80"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#245C45] flex-shrink-0" />
                        <span>{detail}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Subtle bottom indicator */}
                <div className="mt-6 pt-3 flex items-center justify-between text-[11px] font-semibold text-[#6B8F71] uppercase tracking-wider">
                  <span>Feature {idx + 1}</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#E99A55]" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
