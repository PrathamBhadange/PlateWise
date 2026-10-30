import { Mail, Phone, MapPin, Heart } from 'lucide-react';
import BrandLogo from '../common/BrandLogo';

// Clean standard SVG icons for social platforms
function InstagramIcon({ className = 'w-4 h-4' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

function LinkedinIcon({ className = 'w-4 h-4' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect width="4" height="12" x="2" y="9" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  );
}

function GithubIcon({ className = 'w-4 h-4' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  );
}

export default function Footer({ onOpenAuth, onOpenMenuHelp }) {
  const handleNavClick = (e, href) => {
    e.preventDefault();
    const targetElement = document.querySelector(href);
    if (targetElement) {
      const headerOffset = 80;
      const elementPosition = targetElement.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      });
    }
  };

  return (
    <footer className="bg-[#164B38] text-white pt-16 pb-12 border-t border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 lg:gap-8 pb-12 border-b border-white/15">
          {/* Column 1 & 2: Brand Information */}
          <div className="lg:col-span-2 flex flex-col justify-between">
            <div>
              <BrandLogo inverted={true} size="lg" />
              <p className="mt-4 text-sm text-[#E6EFE7]/80 max-w-sm leading-relaxed">
                PlateWise is an AI-powered smart canteen & zero-waste food ecosystem developed to empower colleges with fresh meals, reduced food waste, and community nourishment.
              </p>
              <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 rounded-md bg-white/10 text-xs text-[#E6EFE7]/90 border border-white/10">
                <span className="w-2 h-2 rounded-full bg-[#E99A55]" />
                <span>Order Smart. Waste Less. Feed More.</span>
              </div>
            </div>

            {/* Social Icons */}
            <div className="mt-6 flex items-center gap-3">
              <a
                href="#social-instagram-placeholder"
                onClick={(e) => {
                  e.preventDefault();
                  alert('Instagram profile placeholder: Will connect to official PlateWise campus handle.');
                }}
                className="w-9 h-9 rounded-lg bg-white/10 hover:bg-[#245C45] text-white flex items-center justify-center transition-colors border border-white/10"
                aria-label="Instagram profile placeholder"
              >
                <InstagramIcon className="w-4 h-4" />
              </a>
              <a
                href="#social-linkedin-placeholder"
                onClick={(e) => {
                  e.preventDefault();
                  alert('LinkedIn profile placeholder: Will connect to official PlateWise project page.');
                }}
                className="w-9 h-9 rounded-lg bg-white/10 hover:bg-[#245C45] text-white flex items-center justify-center transition-colors border border-white/10"
                aria-label="LinkedIn profile placeholder"
              >
                <LinkedinIcon className="w-4 h-4" />
              </a>
              <a
                href="#social-github-placeholder"
                onClick={(e) => {
                  e.preventDefault();
                  alert('GitHub repository placeholder: Connected to College DBMS PlateWise project.');
                }}
                className="w-9 h-9 rounded-lg bg-white/10 hover:bg-[#245C45] text-white flex items-center justify-center transition-colors border border-white/10"
                aria-label="GitHub repository placeholder"
              >
                <GithubIcon className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Column 3: Quick Links */}
          <div>
            <h3 className="font-serif text-base font-semibold text-white tracking-wide mb-4">
              Quick Links
            </h3>
            <ul className="space-y-2.5 text-sm text-[#E6EFE7]/80">
              <li>
                <a
                  href="#home"
                  onClick={(e) => handleNavClick(e, '#home')}
                  className="hover:text-white transition-colors"
                >
                  Home
                </a>
              </li>
              <li>
                <a
                  href="#features"
                  onClick={(e) => handleNavClick(e, '#features')}
                  className="hover:text-white transition-colors"
                >
                  Features
                </a>
              </li>
              <li>
                <a
                  href="#how-it-works"
                  onClick={(e) => handleNavClick(e, '#how-it-works')}
                  className="hover:text-white transition-colors"
                >
                  How It Works
                </a>
              </li>
              <li>
                <a
                  href="#impact"
                  onClick={(e) => handleNavClick(e, '#impact')}
                  className="hover:text-white transition-colors"
                >
                  Impact
                </a>
              </li>
              <li>
                <a
                  href="#about"
                  onClick={(e) => handleNavClick(e, '#about')}
                  className="hover:text-white transition-colors"
                >
                  About
                </a>
              </li>
            </ul>
          </div>

          {/* Column 4: For Users */}
          <div>
            <h3 className="font-serif text-base font-semibold text-white tracking-wide mb-4">
              For Users
            </h3>
            <ul className="space-y-2.5 text-sm text-[#E6EFE7]/80">
              <li>
                <button
                  type="button"
                  onClick={() => onOpenAuth?.('login')}
                  className="hover:text-white transition-colors text-left cursor-pointer"
                >
                  Login
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onOpenAuth?.('signup')}
                  className="hover:text-white transition-colors text-left cursor-pointer"
                >
                  Sign Up
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onOpenMenuHelp?.('menu')}
                  className="hover:text-white transition-colors text-left cursor-pointer"
                >
                  Menu
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onOpenMenuHelp?.('support')}
                  className="hover:text-white transition-colors text-left cursor-pointer"
                >
                  Help & Support
                </button>
              </li>
            </ul>
          </div>

          {/* Column 5: Contact Placeholders */}
          <div>
            <h3 className="font-serif text-base font-semibold text-white tracking-wide mb-4">
              Contact
            </h3>
            <ul className="space-y-3 text-sm text-[#E6EFE7]/80">
              <li className="flex items-start gap-2.5">
                <Mail className="w-4 h-4 text-[#E99A55] flex-shrink-0 mt-0.5" />
                <span className="break-all font-mono text-xs">
                  contact@platewise.campus.in
                  <span className="block text-[10px] text-[#E6EFE7]/60">(Placeholder)</span>
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <Phone className="w-4 h-4 text-[#E99A55] flex-shrink-0 mt-0.5" />
                <span className="font-mono text-xs">
                  +91 (0) 253-XXXXXXX
                  <span className="block text-[10px] text-[#E6EFE7]/60">(Placeholder)</span>
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-[#E99A55] flex-shrink-0 mt-0.5" />
                <span>
                  Nashik, Maharashtra
                  <span className="block text-xs text-[#E6EFE7]/60">India — 422005</span>
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar: Copyright & Attribution */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#E6EFE7]/70">
          <p>© 2026 PlateWise. All rights reserved.</p>
          <p className="flex items-center gap-1.5">
            <span>Built with care for sustainable campus dining</span>
            <Heart className="w-3.5 h-3.5 text-[#E99A55] fill-[#E99A55]" />
          </p>
        </div>
      </div>
    </footer>
  );
}
