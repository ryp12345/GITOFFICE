import LeaveEntitlementBase from '../leave_management/LeaveEntitlementBase';
import Sidebar from '../../components/layout/Sidebar';
import { getLeaveEntitlementMeta, getLeaveEntitlements } from '../../api/leaveEntitlementApi';

export default function SuperAdminLeaveEntitlementPage() {
  return (
    <LeaveEntitlementBase
      Sidebar={Sidebar}
      headerTitle="Super Admin"
      fetchMeta={getLeaveEntitlementMeta}
      fetchRows={getLeaveEntitlements}
      showDepartmentSelector
    />
  );
}
