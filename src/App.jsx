import { useState } from 'react';
import { Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import Home from './pages/Home/Home';
import LoginPage from './pages/Auth/LoginPage';
import SignUpPlaceholder from './pages/Auth/SignUpPlaceholder';
import ForgotPasswordPlaceholder from './pages/Auth/ForgotPasswordPlaceholder';
import DemoModal from './components/common/DemoModal';

// Module 2: Student Dashboard Components & Views
import StudentDashboardLayout from './components/dashboard/StudentDashboardLayout';
import StudentDashboard from './pages/Student/StudentDashboard';
import OrderFoodView from './pages/Student/OrderFoodView';
import MyOrdersView from './pages/Student/MyOrdersView';
import MealCreditsView from './pages/Student/MealCreditsView';
import ImpactView from './pages/Student/ImpactView';
import ProfileView from './pages/Student/ProfileView';
import HelpSupportView from './pages/Student/HelpSupportView';

function LandingLayout({ onOpenAuth, onOpenDemo }) {
  return (
    <div className="min-h-screen flex flex-col bg-[#F8F7F2] text-[#252A27]">
      {/* Sticky Navbar */}
      <Navbar onOpenAuth={onOpenAuth} />

      {/* Main Landing Page Content */}
      <Home onOpenAuth={onOpenAuth} onWatchDemo={onOpenDemo} />

      {/* Footer */}
      <Footer onOpenAuth={onOpenAuth} onOpenMenuHelp={onOpenDemo} />
    </div>
  );
}

function App() {
  const navigate = useNavigate();
  const [demoModalOpen, setDemoModalOpen] = useState(false);

  const handleOpenAuth = (mode = 'login') => {
    if (mode === 'signup') {
      navigate('/signup');
    } else {
      navigate('/login');
    }
  };

  const handleOpenDemo = () => {
    setDemoModalOpen(true);
  };

  const handleCloseDemo = () => {
    setDemoModalOpen(false);
  };

  return (
    <>
      <Routes>
        {/* Landing Page Route */}
        <Route
          path="/"
          element={
            <LandingLayout
              onOpenAuth={handleOpenAuth}
              onOpenDemo={handleOpenDemo}
            />
          }
        />

        {/* Dedicated Login Page Route */}
        <Route
          path="/login"
          element={
            <LoginPage
              onBackToHome={() => navigate('/')}
              onNavigateSignUp={() => navigate('/signup')}
              onNavigateForgotPassword={() => navigate('/forgot-password')}
            />
          }
        />

        {/* Sign Up Placeholder Route */}
        <Route
          path="/signup"
          element={
            <SignUpPlaceholder
              onBackToHome={() => navigate('/')}
              onNavigateLogin={() => navigate('/login')}
            />
          }
        />

        {/* Forgot Password Placeholder Route */}
        <Route
          path="/forgot-password"
          element={
            <ForgotPasswordPlaceholder
              onBackToHome={() => navigate('/')}
              onNavigateLogin={() => navigate('/login')}
            />
          }
        />

        {/* Module 2: Student Dashboard Routes */}
        <Route
          path="/student"
          element={<Navigate to="/student/dashboard" replace />}
        />
        <Route
          path="/student/dashboard"
          element={
            <StudentDashboardLayout>
              <StudentDashboard />
            </StudentDashboardLayout>
          }
        />
        <Route
          path="/student/order"
          element={
            <StudentDashboardLayout>
              <OrderFoodView />
            </StudentDashboardLayout>
          }
        />
        <Route
          path="/student/orders"
          element={
            <StudentDashboardLayout>
              <MyOrdersView />
            </StudentDashboardLayout>
          }
        />
        <Route
          path="/student/credits"
          element={
            <StudentDashboardLayout>
              <MealCreditsView />
            </StudentDashboardLayout>
          }
        />
        <Route
          path="/student/impact"
          element={
            <StudentDashboardLayout>
              <ImpactView />
            </StudentDashboardLayout>
          }
        />
        <Route
          path="/student/profile"
          element={
            <StudentDashboardLayout>
              <ProfileView />
            </StudentDashboardLayout>
          }
        />
        <Route
          path="/student/help"
          element={
            <StudentDashboardLayout>
              <HelpSupportView />
            </StudentDashboardLayout>
          }
        />

        {/* Catch-all Fallback */}
        <Route
          path="*"
          element={
            <LandingLayout
              onOpenAuth={handleOpenAuth}
              onOpenDemo={handleOpenDemo}
            />
          }
        />
      </Routes>

      {/* Interactive Ecosystem Walkthrough Modal */}
      <DemoModal isOpen={demoModalOpen} onClose={handleCloseDemo} />
    </>
  );
}

export default App;
