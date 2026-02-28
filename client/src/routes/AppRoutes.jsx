import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Login from '../pages/auth/Login';
import Register from '../pages/auth/Register';
import SuperAdminDashboard from '../pages/super-admin/Dashboard';
import EstablishmentDashboard from '../pages/establishment/Dashboard';
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
import RemunerationHeadsPage from '../pages/establishment/RemunerationHeads';

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
            <Route path="/establishment/remuneration-heads" element={<RemunerationHeadsPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
