import Header from '../../components/layout/Header';
import Sidebar from '../../components/layout/Sidebar';
import { useAuth } from '../../context/AuthContext';
import { ROLE_NON_TEACHING, isRoleMatch } from '../../utils/role';
import api from '../../api/axios';
import React from 'react';

export default function StaffDashboard() {
  const { user } = useAuth();
  const isNonTeaching = isRoleMatch(user?.role, ROLE_NON_TEACHING);
  const panelLabel = isNonTeaching ? 'Non-Teaching' : 'Teaching';

  const fullNameParts = [user?.fname, user?.mname, user?.lname].filter(Boolean);
  const fallbackName = user?.name || user?.full_name || (fullNameParts.length ? fullNameParts.join(' ') : '') || user?.username || user?.email || '';

  const [resolvedName, setResolvedName] = React.useState(null);

  React.useEffect(() => {
    let mounted = true;

    async function resolveName() {
      try {
        if (user?.staff_id) {
          const res = await api.get(`/staff/${user.staff_id}`);
          const s = res?.data?.data || res?.data || null;
          if (!mounted) return;
          if (s) {
            const parts = [s.fname, s.mname, s.lname].filter(Boolean);
            setResolvedName(s.name || (parts.length ? parts.join(' ') : null) || null);
            return;
          }
        }

        if (user?.id) {
          const listRes = await api.get('/staff');
          const rows = Array.isArray(listRes?.data?.data) ? listRes.data.data : [];
          const row = rows.find((item) => Number(item?.user_id) === Number(user.id));
          if (!mounted) return;
          if (row) {
            const parts = [row.fname, row.mname, row.lname].filter(Boolean);
            setResolvedName(row.name || (parts.length ? parts.join(' ') : null) || null);
            return;
          }
        }
      } catch (e) {
        // ignore
      }
    }

    resolveName();
    return () => { mounted = false; };
  }, [user?.id, user?.staff_id]);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <Header />
      <div className="flex flex-1 min-h-0">
        <Sidebar />
        <main className="flex-1 overflow-auto p-6">
          <div className="min-h-full rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-semibold text-slate-900">Staff Dashboard</h2>
            <p className="mt-1 text-lg font-medium text-blue-700">Welcome{(resolvedName || fallbackName) ? `, ${resolvedName || fallbackName}` : ''}</p>
            {/* <p className="mt-2 text-slate-600">Welcome to the {panelLabel} panel.</p> */}
          </div>
        </main>
      </div>
    </div>
  );
}
