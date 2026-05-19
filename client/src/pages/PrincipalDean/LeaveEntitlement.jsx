import LeaveEntitlementBase from '../leave_management/LeaveEntitlementBase';
import PrincipalDeansidebar from '../../components/layout/PrincipalDeansidebar';
import { getLeaveEntitlementMeta, getLeaveEntitlements } from '../../api/leaveEntitlementApi';

export default function PrincipalDeanLeaveEntitlementPage() {
  return (
    <LeaveEntitlementBase
      Sidebar={PrincipalDeansidebar}
      headerTitle="Principal/Dean"
      fetchMeta={getLeaveEntitlementMeta}
      fetchRows={getLeaveEntitlements}
      showDepartmentSelector={true}
    />
  );
}
