import { useState } from 'react';
import DashboardHeader from './DashboardHeader';
import DashboardSidebar from './DashboardSidebar';
import MobileBottomNav from './MobileBottomNav';

export default function StudentDashboardLayout({ children }) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#F8F7F2] text-[#252A27] flex flex-col antialiased">
      {/* Sticky Top Header */}
      <DashboardHeader
        mobileSidebarOpen={mobileSidebarOpen}
        onToggleMobileSidebar={() => setMobileSidebarOpen(!mobileSidebarOpen)}
      />

      {/* Main Body Area: Sidebar + Scrollable Content */}
      <div className="flex-1 flex max-w-7xl mx-auto w-full relative">
        {/* Left Sidebar (Desktop fixed, Tablet compact, Mobile drawer) */}
        <DashboardSidebar
          mobileOpen={mobileSidebarOpen}
          onCloseMobile={() => setMobileSidebarOpen(false)}
        />

        {/* Center / Right Content Area */}
        <main className="flex-1 w-full min-w-0 px-4 sm:px-6 lg:px-8 py-5 sm:py-7 pb-20 md:pb-8">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (< 768px) */}
      <MobileBottomNav />
    </div>
  );
}
