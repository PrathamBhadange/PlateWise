import { Route } from 'react-router-dom';
import KitchenLayout from '../components/kitchen/KitchenLayout';
import KitchenDashboard from '../pages/Kitchen/KitchenDashboard';
import KitchenQueueView from '../pages/Kitchen/KitchenQueueView';
import KitchenReadyView from '../pages/Kitchen/KitchenReadyView';
import KitchenMenuView from '../pages/Kitchen/KitchenMenuView';
import KitchenProfileView from '../pages/Kitchen/KitchenProfileView';
import KitchenHelpView from '../pages/Kitchen/KitchenHelpView';
import CashierLayout from '../components/cashier/CashierLayout';
import CashierDashboard from '../pages/Cashier/CashierDashboard';
import CashierVerifyView from '../pages/Cashier/CashierVerifyView';
import CashierOrdersView from '../pages/Cashier/CashierOrdersView';
import CashierReportsView from '../pages/Cashier/CashierReportsView';
import CashierProfileView from '../pages/Cashier/CashierProfileView';
import CashierHelpView from '../pages/Cashier/CashierHelpView';
import CashierUnavailableView from '../pages/Cashier/CashierUnavailableView';
import NgoDashboard from '../pages/NGO/NgoDashboard';
import AdminDashboard from '../pages/Admin/AdminDashboard';
import AdminKitchen from '../pages/Admin/AdminKitchen';
import AdminComplaints from '../pages/Complaints/AdminComplaints';
import NewComplaint from '../pages/Complaints/NewComplaint';
import DevIndex from '../pages/Dev/DevIndex';
import ProtectedRoute from '../components/common/ProtectedRoute';

export default function getMember4Routes() {
  return [
    <Route
      key="kitchen"
      path="/kitchen"
      element={
        <ProtectedRoute allowedRoles={['kitchen', 'admin']}>
          <KitchenLayout />
        </ProtectedRoute>
      }
    >
      <Route index element={<KitchenDashboard />} />
      <Route path="queue" element={<KitchenQueueView />} />
      <Route path="ready" element={<KitchenReadyView />} />
      <Route path="menu" element={<KitchenMenuView />} />
      <Route path="orders" element={<KitchenQueueView />} />
      <Route path="demand" element={<KitchenDashboard />} />
      <Route path="sales" element={<KitchenDashboard />} />
      <Route path="inventory" element={<KitchenDashboard />} />
      <Route path="profile" element={<KitchenProfileView />} />
      <Route path="help" element={<KitchenHelpView />} />
    </Route>,
    <Route
      key="cashier"
      path="/cashier"
      element={
        <ProtectedRoute allowedRoles={['cashier', 'admin']}>
          <CashierLayout />
        </ProtectedRoute>
      }
    >
      <Route index element={<CashierDashboard />} />
      <Route path="verify-token" element={<CashierVerifyView />} />
      <Route path="orders" element={<CashierOrdersView />} />
      <Route path="reports" element={<CashierReportsView />} />
      <Route path="profile" element={<CashierProfileView />} />
      <Route path="help" element={<CashierHelpView />} />
      <Route path="new-order" element={<CashierUnavailableView moduleKey="new-order" />} />
      <Route path="payments" element={<CashierUnavailableView moduleKey="payments" />} />
      <Route path="credits" element={<CashierUnavailableView moduleKey="credits" />} />
    </Route>,
    <Route
      key="ngo"
      path="/ngo"
      element={
        <ProtectedRoute allowedRoles={['ngo', 'admin']}>
          <NgoDashboard />
        </ProtectedRoute>
      }
    />,
    <Route
      key="admin"
      path="/admin"
      element={
        <ProtectedRoute allowedRoles={['admin']}>
          <AdminDashboard />
        </ProtectedRoute>
      }
    />,
    <Route
      key="admin-kitchen"
      path="/admin/kitchen"
      element={
        <ProtectedRoute allowedRoles={['admin']}>
          <AdminKitchen />
        </ProtectedRoute>
      }
    />,
    <Route
      key="admin-complaints"
      path="/admin/complaints"
      element={
        <ProtectedRoute allowedRoles={['admin']}>
          <AdminComplaints />
        </ProtectedRoute>
      }
    />,
    <Route
      key="complaints-new"
      path="/complaints/new"
      element={
        <ProtectedRoute allowedRoles={['student', 'admin']}>
          <NewComplaint />
        </ProtectedRoute>
      }
    />,
    <Route key="dev" path="/dev" element={<DevIndex />} />,
  ];
}
