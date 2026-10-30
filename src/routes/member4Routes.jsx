import { Route } from 'react-router-dom';
import KitchenDashboard from '../pages/Kitchen/KitchenDashboard';
import AdminDashboard from '../pages/Admin/AdminDashboard';
import AdminComplaints from '../pages/Complaints/AdminComplaints';
import NewComplaint from '../pages/Complaints/NewComplaint';
import DevIndex from '../pages/Dev/DevIndex';

export default function getMember4Routes() {
  return [
    <Route key="kitchen" path="/kitchen" element={<KitchenDashboard />} />,
    <Route key="admin" path="/admin" element={<AdminDashboard />} />,
    <Route key="admin-complaints" path="/admin/complaints" element={<AdminComplaints />} />,
    <Route key="complaints-new" path="/complaints/new" element={<NewComplaint />} />,
    <Route key="dev" path="/dev" element={<DevIndex />} />,
  ];
}

