import { Route } from 'react-router-dom';
import ProtectedRoute from '../components/common/ProtectedRoute';
import StudentLayout from '../components/student/StudentLayout';
import StudentDashboard from '../pages/Student/StudentDashboard';
import StudentMenu from '../pages/Student/StudentMenu';
import StudentCart from '../pages/Student/StudentCart';
import StudentOrders from '../pages/Student/StudentOrders';
import StudentComplaints from '../pages/Student/StudentComplaints';
import StudentProfile from '../pages/Student/StudentProfile';
import StudentPayItForward from '../pages/Student/StudentPayItForward';
import StudentSurplus from '../pages/Student/StudentSurplus';
import StudentImpact from '../pages/Student/StudentImpact';

export default function getStudentRoutes() {
  return [
    <Route
      key="student-root"
      path="/student"
      element={
        <ProtectedRoute allowedRoles={['student']}>
          <StudentLayout />
        </ProtectedRoute>
      }
    >
      <Route index element={<StudentDashboard />} />
      <Route path="menu" element={<StudentMenu />} />
      <Route path="cart" element={<StudentCart />} />
      <Route path="orders" element={<StudentOrders />} />
      <Route path="complaints" element={<StudentComplaints />} />
      <Route path="profile" element={<StudentProfile />} />
      <Route path="pay-it-forward" element={<StudentPayItForward />} />
      <Route path="surplus" element={<StudentSurplus />} />
      <Route path="impact" element={<StudentImpact />} />
    </Route>,
  ];
}
