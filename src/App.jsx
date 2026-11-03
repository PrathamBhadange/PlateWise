import { useState } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import Home from './pages/Home/Home';
import AuthModal from './components/common/AuthModal';
import DemoModal from './components/common/DemoModal';
import getMember4Routes from './routes/member4Routes';
import getStudentRoutes from './routes/studentRoutes';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';

function LandingLayout() {
  const location = useLocation();
  const [authModal, setAuthModal] = useState({
    isOpen: false,
    mode: 'login',
  });
  const [demoModalOpen, setDemoModalOpen] = useState(false);

  // Sync openAuth state from protected route redirects without overriding downstream navigation
  const [lastOpenAuthKey, setLastOpenAuthKey] = useState(null);
  const currentOpenAuthKey = location.state?.openAuth ? location.key : null;

  if (currentOpenAuthKey && currentOpenAuthKey !== lastOpenAuthKey) {
    setLastOpenAuthKey(currentOpenAuthKey);
    setAuthModal({ isOpen: true, mode: 'login' });
  }

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

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <Routes>
            <Route path="/" element={<LandingLayout />} />
            {getMember4Routes()}
            {getStudentRoutes()}
          </Routes>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
