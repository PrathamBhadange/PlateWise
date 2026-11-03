import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import StudentSidebar from './StudentSidebar';
import StudentHeader from './StudentHeader';

export default function StudentLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#F8F7F2] text-[#252A27] flex">
      {/* Desktop Sidebar */}
      <div className="hidden md:block w-64 shrink-0 h-screen sticky top-0">
        <StudentSidebar />
      </div>

      {/* Mobile Drawer Backdrop */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden backdrop-blur-xs transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Mobile Drawer */}
      <div
        className={`fixed inset-y-0 left-0 w-64 z-50 transform md:hidden transition-transform duration-200 ease-in-out ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <StudentSidebar onClose={() => setIsSidebarOpen(false)} />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <StudentHeader
          onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
          isSidebarOpen={isSidebarOpen}
        />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
