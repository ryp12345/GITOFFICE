import Header from '../../components/layout/Header';
import Sidebar from '../../components/layout/Sidebar';
import { useAuth } from '../../context/AuthContext';
import { ROLE_NON_TEACHING, isRoleMatch } from '../../utils/role';

export default function StaffDashboard() {
  const { user } = useAuth();
  const isNonTeaching = isRoleMatch(user?.role, ROLE_NON_TEACHING);
  const panelLabel = isNonTeaching ? 'Non-Teaching' : 'Teaching';

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <Header />
      <div className="flex flex-1 min-h-0">
        <Sidebar />
        <main className="flex-1 overflow-auto p-6">
          <div className="min-h-full rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-semibold text-slate-900">Staff Dashboard</h2>
            <p className="mt-2 text-slate-600">Welcome to the {panelLabel} panel.</p>
          </div>
        </main>
      </div>
    </div>
  );
}
