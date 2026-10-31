import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import StaffHeader from './StaffHeader';
import StaffSidebar from './StaffSidebar';
import StaffMobileNav from './StaffMobileNav';

export default function StaffDashboardLayout({ children, role }) {
  const location = useLocation();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const isKitchen = role === 'kitchen' || location.pathname.startsWith('/staff/kitchen');

  return (
    <div className="min-h-screen bg-[#F8F7F2] text-[#252A27] flex flex-col antialiased">
      {/* Top Header */}
      <StaffHeader
        mobileSidebarOpen={mobileSidebarOpen}
        onToggleMobileSidebar={() => setMobileSidebarOpen(!mobileSidebarOpen)}
        currentRole={isKitchen ? 'kitchen' : 'cashier'}
      />

      {/* Main Body */}
      <div className="flex-1 flex max-w-7xl mx-auto w-full relative">
        <StaffSidebar
          mobileOpen={mobileSidebarOpen}
          onCloseMobile={() => setMobileSidebarOpen(false)}
          isKitchen={isKitchen}
        />

        <main className="flex-1 w-full min-w-0 px-4 sm:px-6 lg:px-8 py-5 sm:py-7 pb-20 md:pb-8">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <StaffMobileNav isKitchen={isKitchen} />
    </div>
  );
}
