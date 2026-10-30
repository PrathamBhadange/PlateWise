import { Smartphone, Store, HeartHandshake } from 'lucide-react';
import SectionHeading from '../common/SectionHeading';

const STEPS = [
  {
    stepNumber: '01',
    title: 'Order Your Meal',
    description:
      'Browse the menu, choose your preferred meal and place an order through the app.',
    icon: Smartphone,
    highlight: 'Real-time daily menu & meal options',
  },
  {
    stepNumber: '02',
    title: 'Collect at Cafeteria',
    description:
      'Pick up your freshly prepared meal at the campus cafeteria without waiting in line.',
    icon: Store,
    highlight: 'Quick counter pickup with order token',
  },
  {
    stepNumber: '03',
    title: 'Reduce Waste & Help',
    description:
      'Surplus food is redirected to NGOs and those in need, ensuring no food goes to waste.',
    icon: HeartHandshake,
    highlight: 'Verified NGO community redistribution',
  },
];

export default function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="py-16 sm:py-20 lg:py-24 bg-white/60 border-y border-[#245C45]/10 relative"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Heading */}
        <SectionHeading
          badge="Seamless Flow"
          title="How PlateWise Works"
          subtitle="A simple way to enjoy meals and make a positive impact."
        />

        {/* Steps Grid with Visual Progression */}
        <div className="mt-14 lg:mt-18 relative">
          {/* Subtle Desktop Connector Line */}
          <div
            className="hidden lg:block absolute top-1/2 left-[15%] right-[15%] h-0.5 border-t-2 border-dashed border-[#245C45]/20 -translate-y-8 z-0 pointer-events-none"
            aria-hidden="true"
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
            {STEPS.map((step, idx) => {
              const IconComponent = step.icon;
              return (
                <div
                  key={idx}
                  className="group relative bg-[#F8F7F2] rounded-2xl p-7 sm:p-8 border border-[#245C45]/15 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between"
                >
                  <div>
                    {/* Top row: Icon & Step Number */}
                    <div className="flex items-center justify-between mb-6">
                      <div className="w-13 h-13 rounded-xl bg-[#245C45] text-white flex items-center justify-center shadow-xs group-hover:scale-105 group-hover:bg-[#164B38] transition-transform duration-300">
                        <IconComponent className="w-6 h-6 text-[#E6EFE7]" />
                      </div>
                      <span className="font-serif text-3xl font-bold text-[#6B8F71]/30 group-hover:text-[#245C45]/50 transition-colors">
                        {step.stepNumber}
                      </span>
                    </div>

                    {/* Step Title */}
                    <h3 className="font-serif text-xl sm:text-2xl font-semibold text-[#252A27] tracking-tight">
                      Step {idx + 1} — {step.title}
                    </h3>

                    {/* Description */}
                    <p className="mt-3 text-[#252A27]/75 text-sm sm:text-base leading-relaxed">
                      {step.description}
                    </p>
                  </div>

                  {/* Bottom micro-pill */}
                  <div className="mt-6 pt-4 border-t border-[#245C45]/10 flex items-center gap-2 text-xs font-medium text-[#245C45]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#E99A55]" />
                    <span>{step.highlight}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
