import { useState } from 'react';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import Home from './pages/Home/Home';
import AuthModal from './components/common/AuthModal';
import DemoModal from './components/common/DemoModal';

function App() {
  const [authModal, setAuthModal] = useState({
    isOpen: false,
    mode: 'login',
  });
  const [demoModalOpen, setDemoModalOpen] = useState(false);

  const handleOpenAuth = (mode = 'login') => {
    setAuthModal({
      isOpen: true,
      mode,
    });
  };

  const handleCloseAuth = () => {
    setAuthModal((prev) => ({
      ...prev,
      isOpen: false,
    }));
  };

  const handleOpenDemo = () => {
    setDemoModalOpen(true);
  };

  const handleCloseDemo = () => {
    setDemoModalOpen(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F7F2] text-[#252A27]">
      {/* Sticky Navbar */}
      <Navbar onOpenAuth={handleOpenAuth} />

      {/* Main Landing Page Content */}
      <Home
        onOpenAuth={handleOpenAuth}
        onWatchDemo={handleOpenDemo}
      />

      {/* Footer */}
      <Footer
        onOpenAuth={handleOpenAuth}
        onOpenMenuHelp={() => handleOpenDemo()}
      />

      {/* Interactive Authentication Preview Modal */}
      <AuthModal
        key={`${authModal.isOpen}-${authModal.mode}`}
        isOpen={authModal.isOpen}
        initialMode={authModal.mode}
        onClose={handleCloseAuth}
      />

      {/* Interactive Ecosystem Walkthrough Modal */}
      <DemoModal
        isOpen={demoModalOpen}
        onClose={handleCloseDemo}
      />
    </div>
  );
}

export default App;
