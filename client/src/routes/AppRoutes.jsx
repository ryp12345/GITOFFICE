import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Login from '../pages/auth/Login';
import Register from '../pages/auth/Register';
import SuperAdminDashboard from '../pages/super-admin/Dashboard';
import SuperAdminUsersPage from '../pages/super-admin/Users';
import SuperAdminCoordinatorsPage from '../pages/super-admin/Coordinators';
import SuperAdminLeaveEntitlementPage from '../pages/super-admin/LeaveEntitlement';
import SuperAdminHolidayRHListPage from '../pages/super-admin/HolidayRHList';
import EstablishmentDashboard from '../pages/establishment/Dashboard';
import HODDashboard from '../pages/hod/Dashboard';
import PrincipalDeanDashboard from '../pages/PrincipalDean/Dashboard';
import PrincipalDeanLeaveEntitlementPage from '../pages/PrincipalDean/LeaveEntitlement';
import HODDepartmentOverviewPage from '../pages/hod/DepartmentOverview';
import HODMyStaffPage from '../pages/hod/MyStaff';
import HODLeaveEntitlementPage from '../pages/hod/LeaveEntitlement';
import LeaveApplicationPage from '../pages/leave_management/LeaveApplication';
import LeaveListPage from '../pages/leave_management/LeaveList';
import SidebarHOD from '../components/layout/SidebarHOD';
import StaffDashboard from '../pages/staff/StaffDashboard';
import AssociationsPage from '../pages/establishment/Associations';
import DepartmentPage from '../pages/establishment/Departments';
import DesignationsPage from '../pages/establishment/Designations';
import InstitutionsPage from '../pages/establishment/Institutions';
import QualificationsPage from '../pages/establishment/Qualifications';
import ReligionsPage from '../pages/establishment/Religions';
import CasteCategoriesPage from '../pages/establishment/CasteCategories';
import DailyDataPage from '../pages/biometric/DailyData';
import MonthlyDataPage from '../pages/biometric/MonthlyData';
import MusterPage from '../pages/biometric/Muster';
import LeavesPage from '../pages/establishment/leave_management/Leaves';
import HolidayRHListPage from '../pages/establishment/leave_management/HolidayRHList';
import ProtectedRoute from './ProtectedRoute';
import RoleRoute from './RoleRoute';
import { useAuth } from '../context/AuthContext';
import { getDashboardPathByRole } from '../utils/role';
import DepartmentsPage from '../pages/establishment/Departments';
import DepartmentHistory from '../pages/staff/DepartmentHistory';
import DesignationPayscale from '../pages/staff/DesignationPayscale';
import AssociationPage from '../pages/staff/AssociationPage';
import QualificationPage from '../pages/staff/QualificationPage';
import StaffPage from '../pages/establishment/Staff';
import StaffViewPage from '../pages/establishment/StaffViewPage';
import StaffStatisticsPage from '../pages/establishment/StaffStatistics';
import StaffInformation from '../pages/establishment/StaffInformation';
import { useParams } from 'react-router-dom';
import { useMemo } from 'react';
import LeaveRulesPage from '../pages/establishment/leave_management/LeaveRules';
import LeaveEntitlementPage from '../pages/establishment/leave_management/leave_entitlement';
import StaffLeavesPage from '../pages/staff/leaves';
import ChangePassword from '../pages/auth/ChangePassword';
import ForgotPassword from '../pages/auth/ForgotPassword';
import ResetPassword from '../pages/auth/ResetPassword';
import AssoProRecruitmentPage from '../pages/Faculty Recruitment/asso_pro_recruitment';
import ProRecruitmentPage from '../pages/Faculty Recruitment/pro_recruitment';

// StaffViewPage now fetches its own data from API using id
function StaffViewPageWrapper() {
  return <StaffViewPage />;
}

function HomeRedirect() {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div className="p-4">Loading...</div>;
  }

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
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/" element={<HomeRedirect />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/change-password" element={<ChangePassword />} />
          <Route element={<RoleRoute role="Super Admin" />}>
            <Route path="/super-admin" element={<SuperAdminDashboard />} />
            <Route path="/super-admin/users" element={<SuperAdminUsersPage />} />
            <Route path="/super-admin/coordinators" element={<SuperAdminCoordinatorsPage />} />
            <Route path="/super-admin/leave-management/entitlement" element={<SuperAdminLeaveEntitlementPage />} />
            <Route path="/super-admin/leave-management/holiday-rh" element={<SuperAdminHolidayRHListPage />} />

            <Route path="/super-admin/biometric/daily" element={<DailyDataPage />} />
            <Route path="/super-admin/biometric/monthly" element={<MonthlyDataPage />} />
            <Route path="/super-admin/biometric/muster" element={<MusterPage />} />

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
            <Route path="/establishment/biometric/daily" element={<DailyDataPage />} />
            <Route path="/establishment/biometric/monthly" element={<MonthlyDataPage />} />
            <Route path="/establishment/biometric/muster" element={<MusterPage />} />
              <Route path="/leave-management/leaves" element={<LeavesPage />} />
              <Route path="/leave-management/entitlement" element={<LeaveEntitlementPage />} />
              <Route path="/leave-management/holiday-rh" element={<HolidayRHListPage />} />
              <Route path="/leave-management/leave-rules" element={<LeaveRulesPage />} />
            {/* RemunerationHeadsPage removed */}
              <Route path="/staff" element={<StaffPage />} />
              <Route path="/establishment/staff/statistics" element={<StaffStatisticsPage />} />
              <Route path="/establishment/staff-information" element={<StaffInformation />} />
              <Route path="/establishment/staff/:id" element={<StaffViewPageWrapper />} />
          </Route>
        </Route>
        <Route element={<RoleRoute role="Head of Department" />}>
          <Route path="/hod" element={<HODDashboard />} />
          <Route path="/hod/department-overview" element={<HODDepartmentOverviewPage />} />
          <Route path="/hod/my-staff" element={<HODMyStaffPage />} />
          <Route path="/hod/leave-entitlement" element={<HODLeaveEntitlementPage />} />
          <Route path="/hod/leave-application" element={<LeaveApplicationPage />} />
          <Route path="/Faculty Recruitment/asso_pro_recruitment" element={<AssoProRecruitmentPage />} />
          <Route path="/Faculty Recruitment/pro_recruitment" element={<ProRecruitmentPage />} />



          <Route path="/hod/holidays" element={<HolidayRHListPage SidebarComponent={SidebarHOD} />} />

          {/* HOD biometric routes (sidebar uses /biometric/* paths) */}
          <Route path="/biometric/daily" element={<DailyDataPage />} />
          <Route path="/biometric/monthly" element={<MonthlyDataPage />} />
          <Route path="/biometric/muster" element={<MusterPage />} />
        </Route>
        <Route element={<RoleRoute role="Principal" />}>
          <Route path="/principal" element={<PrincipalDeanDashboard />} />
          <Route path="/principal/biometric/daily" element={<DailyDataPage />} />
          <Route path="/principal/biometric/monthly" element={<MonthlyDataPage />} />
          <Route path="/principal/biometric/muster" element={<MusterPage />} />
          <Route path="/principal/leave-entitlement" element={<PrincipalDeanLeaveEntitlementPage />} />
          <Route path="/principal/leave-application" element={<LeaveApplicationPage />} />
          <Route path="/principal/leave-list" element={<LeaveListPage />} />
        </Route>
        <Route element={<RoleRoute role="Dean_admin" />}>
          <Route path="/dean_admin" element={<PrincipalDeanDashboard />} />
          <Route path="/dean_admin/biometric/daily" element={<DailyDataPage />} />
          <Route path="/dean_admin/biometric/monthly" element={<MonthlyDataPage />} />
          <Route path="/dean_admin/biometric/muster" element={<MusterPage />} />
          <Route path="/dean_admin/leave-entitlement" element={<PrincipalDeanLeaveEntitlementPage />} />
          <Route path="/dean_admin/leave-application" element={<LeaveApplicationPage />} />
          <Route path="/dean_admin/leave-list" element={<LeaveListPage />} />
          <Route path="/dean_admin/holidays" element={<HolidayRHListPage SidebarComponent={SidebarHOD} />} />
        </Route>
        <Route element={<RoleRoute role="Teaching" />}>
          <Route path="/teaching" element={<StaffDashboard />} />
          <Route path="/teaching/department-history" element={<DepartmentHistory />} />
          <Route path="/teaching/designation-payscale" element={<DesignationPayscale />} />
          <Route path="/teaching/association" element={<AssociationPage />} />
          <Route path="/teaching/qualification" element={<QualificationPage />} />
          <Route path="/teaching/leave-application" element={<StaffLeavesPage />} />
          <Route path="/teaching/biometric/daily" element={<DailyDataPage />} />
          <Route path="/teaching/biometric/monthly" element={<MonthlyDataPage />} />
        </Route>
        <Route element={<RoleRoute role="Non-Teaching" />}>
          <Route path="/nonteaching" element={<StaffDashboard />} />
          <Route path="/nonteaching/department-history" element={<DepartmentHistory />} />
          <Route path="/nonteaching/designation-payscale" element={<DesignationPayscale />} />
          <Route path="/nonteaching/association" element={<AssociationPage />} />
          <Route path="/nonteaching/qualification" element={<QualificationPage />} />
          <Route path="/nonteaching/leave-application" element={<StaffLeavesPage />} />
          <Route path="/nonteaching/biometric/daily" element={<DailyDataPage />} />
          <Route path="/nonteaching/biometric/monthly" element={<MonthlyDataPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
