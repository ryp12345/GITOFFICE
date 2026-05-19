
import { useAuth } from '../../context/AuthContext';

import SidebarSuperAdmin from './SidebarSuperAdmin';
import SidebarEstablishment from './SidebarEstablishment';
import SidebarHOD from './SidebarHOD';
import StaffSidebar from './StaffSidebar';
import PrincipalDeansidebar from './PrincipalDeansidebar';
import { ROLE_SUPER_ADMIN, ROLE_ESTABLISHMENT, ROLE_HOD, ROLE_PRINCIPAL, ROLE_DEAN_ADMIN, ROLE_TEACHING, ROLE_NON_TEACHING, isRoleMatch } from '../../utils/role';

export default function Sidebar() {
  const { user } = useAuth();

  if (isRoleMatch(user?.role, ROLE_SUPER_ADMIN)) return <SidebarSuperAdmin />;
  if (isRoleMatch(user?.role, ROLE_ESTABLISHMENT)) return <SidebarEstablishment />;
  if (isRoleMatch(user?.role, ROLE_HOD)) return <SidebarHOD />;
  if (isRoleMatch(user?.role, ROLE_PRINCIPAL)) return <PrincipalDeansidebar />;
  if (isRoleMatch(user?.role, ROLE_DEAN_ADMIN)) return <PrincipalDeansidebar />;
  if (isRoleMatch(user?.role, ROLE_TEACHING)) return <StaffSidebar />;
  if (isRoleMatch(user?.role, ROLE_NON_TEACHING)) return <StaffSidebar />;
  return null;
}
