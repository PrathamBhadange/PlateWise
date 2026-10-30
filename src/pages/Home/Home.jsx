import HeroSection from '../../components/home/HeroSection';
import HowItWorks from '../../components/home/HowItWorks';
import FeaturesSection from '../../components/home/FeaturesSection';
import ImpactSection from '../../components/home/ImpactSection';
import AboutSection from '../../components/home/AboutSection';
import CallToAction from '../../components/home/CallToAction';

export default function Home({ onOpenAuth, onWatchDemo }) {
  const handleScrollTo = (selector) => {
    const el = document.querySelector(selector);
    if (el) {
      const headerOffset = 80;
      const elementPosition = el.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      });
    }
  };

  return (
    <main className="flex-1">
      {/* 1. Hero Section */}
      <HeroSection
        onOrderClick={() => onOpenAuth('signup')}
        onLearnMoreClick={() => handleScrollTo('#how-it-works')}
      />

      {/* 2. How PlateWise Works */}
      <HowItWorks />

      {/* 3. Key Features */}
      <FeaturesSection />

      {/* 4. Impact Section */}
      <ImpactSection />

      {/* 5. About & Campus Ecosystem */}
      <AboutSection />

      {/* 6. Call to Action */}
      <CallToAction
        onGetStarted={() => onOpenAuth('signup')}
        onWatchDemo={onWatchDemo}
      />
    </main>
  );
}
