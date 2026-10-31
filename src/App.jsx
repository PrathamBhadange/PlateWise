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

// Module 3: Staff Dashboard Components & Views
import StaffDashboardLayout from './components/staff/StaffDashboardLayout';
import CashierDashboard from './pages/Staff/CashierDashboard';
import KitchenDashboard from './pages/Staff/KitchenDashboard';
import VerifyTokenView from './pages/Staff/VerifyTokenView';
import NewOrderView from './pages/Staff/NewOrderView';
import TodaysOrdersView from './pages/Staff/TodaysOrdersView';
import PaymentsView from './pages/Staff/PaymentsView';
import StaffCreditsView from './pages/Staff/StaffCreditsView';
import StaffReportsView from './pages/Staff/StaffReportsView';
import KitchenQueueView from './pages/Staff/KitchenQueueView';
import KitchenPreparingView from './pages/Staff/KitchenPreparingView';
import KitchenReadyView from './pages/Staff/KitchenReadyView';
import KitchenMenuView from './pages/Staff/KitchenMenuView';
import KitchenInventoryView from './pages/Staff/KitchenInventoryView';
import KitchenReportsView from './pages/Staff/KitchenReportsView';
import StaffProfileView from './pages/Staff/StaffProfileView';
import StaffHelpView from './pages/Staff/StaffHelpView';
import { StaffOrderProvider } from './context/StaffOrderContext';

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
    <StaffOrderProvider>
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

        {/* Module 3: Staff Dashboard Routes */}
        {/* Part A: Cashier Routes */}
        <Route
          path="/staff"
          element={<Navigate to="/staff/dashboard" replace />}
        />
        <Route
          path="/staff/dashboard"
          element={
            <StaffDashboardLayout role="cashier">
              <CashierDashboard />
            </StaffDashboardLayout>
          }
        />
        <Route
          path="/staff/verify-token"
          element={
            <StaffDashboardLayout role="cashier">
              <VerifyTokenView />
            </StaffDashboardLayout>
          }
        />
        <Route
          path="/staff/new-order"
          element={
            <StaffDashboardLayout role="cashier">
              <NewOrderView />
            </StaffDashboardLayout>
          }
        />
        <Route
          path="/staff/orders"
          element={
            <StaffDashboardLayout role="cashier">
              <TodaysOrdersView />
            </StaffDashboardLayout>
          }
        />
        <Route
          path="/staff/payments"
          element={
            <StaffDashboardLayout role="cashier">
              <PaymentsView />
            </StaffDashboardLayout>
          }
        />
        <Route
          path="/staff/credits"
          element={
            <StaffDashboardLayout role="cashier">
              <StaffCreditsView />
            </StaffDashboardLayout>
          }
        />
        <Route
          path="/staff/reports"
          element={
            <StaffDashboardLayout role="cashier">
              <StaffReportsView />
            </StaffDashboardLayout>
          }
        />
        <Route
          path="/staff/profile"
          element={
            <StaffDashboardLayout role="cashier">
              <StaffProfileView />
            </StaffDashboardLayout>
          }
        />
        <Route
          path="/staff/help"
          element={
            <StaffDashboardLayout role="cashier">
              <StaffHelpView />
            </StaffDashboardLayout>
          }
        />

        {/* Part B: Kitchen Staff Routes */}
        <Route
          path="/staff/kitchen"
          element={
            <StaffDashboardLayout role="kitchen">
              <KitchenDashboard />
            </StaffDashboardLayout>
          }
        />
        <Route
          path="/staff/kitchen/queue"
          element={
            <StaffDashboardLayout role="kitchen">
              <KitchenQueueView />
            </StaffDashboardLayout>
          }
        />
        <Route
          path="/staff/kitchen/preparing"
          element={
            <StaffDashboardLayout role="kitchen">
              <KitchenPreparingView />
            </StaffDashboardLayout>
          }
        />
        <Route
          path="/staff/kitchen/ready"
          element={
            <StaffDashboardLayout role="kitchen">
              <KitchenReadyView />
            </StaffDashboardLayout>
          }
        />
        <Route
          path="/staff/kitchen/menu"
          element={
            <StaffDashboardLayout role="kitchen">
              <KitchenMenuView />
            </StaffDashboardLayout>
          }
        />
        <Route
          path="/staff/kitchen/inventory"
          element={
            <StaffDashboardLayout role="kitchen">
              <KitchenInventoryView />
            </StaffDashboardLayout>
          }
        />
        <Route
          path="/staff/kitchen/reports"
          element={
            <StaffDashboardLayout role="kitchen">
              <KitchenReportsView />
            </StaffDashboardLayout>
          }
        />
        <Route
          path="/staff/kitchen/profile"
          element={
            <StaffDashboardLayout role="kitchen">
              <StaffProfileView />
            </StaffDashboardLayout>
          }
        />
        <Route
          path="/staff/kitchen/help"
          element={
            <StaffDashboardLayout role="kitchen">
              <StaffHelpView />
            </StaffDashboardLayout>
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
    </StaffOrderProvider>
  );
}

export default App;
