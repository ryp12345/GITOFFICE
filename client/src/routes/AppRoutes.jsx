import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Login from '../pages/auth/Login';
import Register from '../pages/auth/Register';
import SuperAdminDashboard from '../pages/super-admin/Dashboard';
import SuperAdminUsersPage from '../pages/super-admin/Users';
import EstablishmentDashboard from '../pages/establishment/Dashboard';
import HODDashboard from '../pages/hod/Dashboard';
import TeachingDashboard from '../pages/teaching/Dashboard';
import NonTeachingDashboard from '../pages/nonteaching/Dashboard';
import AssociationsPage from '../pages/establishment/Associations';
import DepartmentPage from '../pages/establishment/Departments';
import DesignationsPage from '../pages/establishment/Designations';
import InstitutionsPage from '../pages/establishment/Institutions';
import QualificationsPage from '../pages/establishment/Qualifications';
import ReligionsPage from '../pages/establishment/Religions';
import CasteCategoriesPage from '../pages/establishment/CasteCategories';
import LeavesPage from '../pages/establishment/leave_management/Leaves';
import HolidayRHListPage from '../pages/establishment/leave_management/HolidayRHList';
import ProtectedRoute from './ProtectedRoute';
import RoleRoute from './RoleRoute';
import { useAuth } from '../context/AuthContext';
import { getDashboardPathByRole } from '../utils/role';
import DepartmentsPage from '../pages/establishment/Departments';
// ...existing code...
import StaffPage from '../pages/establishment/Staff';
import StaffViewPage from '../pages/establishment/StaffViewPage';
import { useParams } from 'react-router-dom';
import { useMemo } from 'react';
import LeaveRulesPage from '../pages/establishment/leave_management/LeaveRules';

// StaffViewPage now fetches its own data from API using id
function StaffViewPageWrapper() {
  return <StaffViewPage />;
}

function HomeRedirect() {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={getDashboardPathByRole(user?.role)} replace />;
}

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/" element={<HomeRedirect />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<RoleRoute role="Super Admin" />}>
            <Route path="/super-admin" element={<SuperAdminDashboard />} />
            <Route path="/super-admin/users" element={<SuperAdminUsersPage />} />
          </Route>
          <Route element={<RoleRoute role="Establishment" />}>
            <Route path="/establishment" element={<EstablishmentDashboard />} />
            <Route path="/associations" element={<AssociationsPage />} />
            <Route path="/departments" element={<DepartmentsPage />} />
            <Route path="/designations" element={<DesignationsPage />} />
            <Route path="/institutions" element={<InstitutionsPage />} />
            <Route path="/qualifications" element={<QualificationsPage />} />
            <Route path="/religions" element={<ReligionsPage />} />
            <Route path="/caste-categories" element={<CasteCategoriesPage />} />
            <Route path="/religions-and-castes" element={<ReligionsPage />} />
              <Route path="/leave-management/leaves" element={<LeavesPage />} />
              <Route path="/leave-management/holiday-rh" element={<HolidayRHListPage />} />
              <Route path="/leave-management/leave-rules" element={<LeaveRulesPage />} />
            {/* RemunerationHeadsPage removed */}
              <Route path="/staff" element={<StaffPage />} />
              <Route path="/establishment/staff/:id" element={<StaffViewPageWrapper />} />
          </Route>
        </Route>
        <Route element={<RoleRoute role="Head of Department" />}>
          <Route path="/hod" element={<HODDashboard />} />
        </Route>
        <Route element={<RoleRoute role="Teaching" />}>
          <Route path="/teaching" element={<TeachingDashboard />} />
        </Route>
        <Route element={<RoleRoute role="Non-Teaching" />}>
          <Route path="/nonteaching" element={<NonTeachingDashboard />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
