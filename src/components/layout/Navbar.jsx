import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, X, ArrowRight, UserCheck, Sparkles, LogOut } from 'lucide-react';
import BrandLogo from '../common/BrandLogo';
import { useAuth } from '../../context/useAuth';

const NAV_LINKS = [
  { label: 'Home', href: '#home', id: 'home' },
  { label: 'Features', href: '#features', id: 'features' },
  { label: 'How It Works', href: '#how-it-works', id: 'how-it-works' },
  { label: 'Impact', href: '#impact', id: 'impact' },
  { label: 'About', href: '#about', id: 'about' },
];

export default function Navbar({ onOpenAuth }) {
  const [activeSection, setActiveSection] = useState('home');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/', { replace: true });
  };

  // Monitor scroll for shadow and active section spy
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);

      const sections = NAV_LINKS.map((link) =>
        document.getElementById(link.id)
      );

      const scrollPosition = window.scrollY + 140;

      for (let i = sections.length - 1; i >= 0; i--) {
        const section = sections[i];
        if (section && section.offsetTop <= scrollPosition) {
          setActiveSection(NAV_LINKS[i].id);
          break;
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Prevent background scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [mobileMenuOpen]);

  const handleNavClick = (e, href) => {
    e.preventDefault();
    setMobileMenuOpen(false);
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
    <header
      className={`sticky top-0 z-40 transition-all duration-300 ${
        isScrolled
          ? 'bg-[#F8F7F2]/95 backdrop-blur-md shadow-sm border-b border-[#245C45]/10 py-3'
          : 'bg-[#F8F7F2] py-4 sm:py-5 border-b border-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Left: Brand Logo & Tagline */}
          <div className="flex-shrink-0">
            <BrandLogo onClick={(e) => handleNavClick(e, '#home')} />
          </div>

          {/* Center: Desktop Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1 lg:space-x-2 bg-[#E6EFE7]/50 px-3 py-1.5 rounded-full border border-[#245C45]/10">
            {NAV_LINKS.map((link) => {
              const isActive = activeSection === link.id;
              return (
                <a
                  key={link.id}
                  href={link.href}
                  onClick={(e) => handleNavClick(e, link.href)}
                  className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-[#245C45] text-white shadow-xs font-semibold'
                      : 'text-[#252A27]/80 hover:text-[#245C45] hover:bg-white/60'
                  }`}
                >
                  {link.label}
                </a>
              );
            })}
          </nav>

          {/* Right: Desktop Action Buttons */}
          <div className="hidden md:flex items-center space-x-3">
            {user ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const r = String(user.role || '').toLowerCase();
                    if (r === 'cashier') navigate('/cashier');
                    else if (r === 'kitchen') navigate('/kitchen');
                    else if (r === 'ngo') navigate('/ngo');
                    else if (r === 'admin') navigate('/admin');
                    else navigate('/student');
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#E6EFE7] hover:bg-[#245C45]/10 border border-[#245C45]/20 rounded-full text-xs font-medium text-[#245C45] transition-all cursor-pointer"
                  title="Go to your dashboard"
                >
                  <span className="w-2 h-2 rounded-full bg-[#245C45]" />
                  <span>{user.full_name || user.email}</span>
                  <span className="px-1.5 py-0.2 rounded bg-[#245C45] text-white text-[10px] uppercase font-bold">
                    {user.role}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  title="Logout"
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-[#252A27]/70 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => onOpenAuth?.('login')}
                  className="px-4 py-2 text-sm font-medium text-[#245C45] hover:text-[#164B38] hover:bg-[#E6EFE7]/60 rounded-lg transition-colors cursor-pointer"
                >
                  Login
                </button>
                <button
                  type="button"
                  onClick={() => onOpenAuth?.('signup')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-[#245C45] hover:bg-[#164B38] rounded-lg shadow-sm hover:shadow transition-all duration-200 cursor-pointer active:scale-[0.98]"
                >
                  <span>Sign Up</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>

          {/* Mobile Hamburger Button */}
          <div className="flex md:hidden items-center">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-[#252A27] hover:text-[#245C45] hover:bg-[#E6EFE7]/60 focus:outline-none focus:ring-2 focus:ring-[#245C45]"
              aria-expanded={mobileMenuOpen}
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 top-[65px] z-50 md:hidden bg-[#252A27]/40 backdrop-blur-xs transition-opacity animate-fade-in">
          <div className="bg-[#F8F7F2] border-b border-[#245C45]/15 px-5 py-6 shadow-xl space-y-5 max-h-[calc(100vh-65px)] overflow-y-auto">
            {/* Tagline reminder on mobile */}
            <div className="flex items-center gap-2 px-2 py-1 text-xs font-medium text-[#245C45] bg-[#E6EFE7] rounded-md">
              <Sparkles className="w-3.5 h-3.5 text-[#E99A55]" />
              <span>Good Food. Less Waste. Brighter Tomorrow.</span>
            </div>

            <nav className="flex flex-col space-y-1">
              {NAV_LINKS.map((link) => {
                const isActive = activeSection === link.id;
                return (
                  <a
                    key={link.id}
                    href={link.href}
                    onClick={(e) => handleNavClick(e, link.href)}
                    className={`px-4 py-3 rounded-lg text-base font-medium transition-colors ${
                      isActive
                        ? 'bg-[#245C45] text-white font-semibold'
                        : 'text-[#252A27] hover:bg-[#E6EFE7]/80 hover:text-[#245C45]'
                    }`}
                  >
                    {link.label}
                  </a>
                );
              })}
            </nav>

            <div className="pt-4 border-t border-[#245C45]/10 flex flex-col gap-2.5">
              {user ? (
                <>
                  <div className="px-3 py-2 bg-[#E6EFE7] rounded-lg text-xs text-[#245C45] flex items-center justify-between">
                    <span className="font-semibold">{user.full_name || user.email}</span>
                    <span className="px-2 py-0.5 bg-[#245C45] text-white rounded text-[10px] uppercase font-bold">
                      {user.role}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      handleLogout();
                    }}
                    className="w-full py-2 px-4 text-center text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Logout</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onOpenAuth?.('login');
                    }}
                    className="w-full py-2.5 px-4 text-center text-sm font-medium text-[#245C45] border border-[#245C45]/30 rounded-lg hover:bg-[#E6EFE7]/50 transition-colors"
                  >
                    Login
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onOpenAuth?.('signup');
                    }}
                    className="w-full py-2.5 px-4 text-center text-sm font-medium text-white bg-[#245C45] hover:bg-[#164B38] rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2"
                  >
                    <UserCheck className="w-4 h-4" />
                    <span>Sign Up</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
