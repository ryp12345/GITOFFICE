import LeaveEntitlementBase from '../leave_management/LeaveEntitlementBase';
import Sidebar from '../../components/layout/Sidebar';
import { getLeaveEntitlementMeta, getLeaveEntitlementsForHod } from '../../api/leaveEntitlementApi';

export default function HODLeaveEntitlementPage() {
  return (
    <LeaveEntitlementBase
      Sidebar={Sidebar}
      headerTitle="HOD"
      fetchMeta={getLeaveEntitlementMeta}
      fetchRows={getLeaveEntitlementsForHod}
      showDepartmentSelector={false}
    />
  );
}
