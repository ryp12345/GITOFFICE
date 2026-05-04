import LeaveEntitlementBase from '../leave_management/LeaveEntitlementBase';
import SidebarHOD from '../../components/layout/SidebarHOD';
import { getLeaveEntitlementMeta, getLeaveEntitlementsForHod } from '../../api/leaveEntitlementApi';

export default function HODLeaveEntitlementPage() {
  return (
    <LeaveEntitlementBase
      Sidebar={SidebarHOD}
      headerTitle="HOD"
      fetchMeta={getLeaveEntitlementMeta}
      fetchRows={getLeaveEntitlementsForHod}
      showDepartmentSelector={false}
    />
  );
}
