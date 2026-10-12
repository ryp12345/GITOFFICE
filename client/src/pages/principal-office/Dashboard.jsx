import { useEffect, useMemo, useState } from 'react';
import Header from '../../components/layout/Header';
import SidebarPrincipalOffice from '../../components/layout/SidebarPrincipalOffice';
import { getPrincipalOfficeDashboard } from '../../api/principalOfficeApi';
import { getErrorMessage } from '../../utils/errors';
import { ChartCanvas, Muted, Panel, StatTile, staffByDepartmentConfig } from '../../components/dashboard/DashboardUI';
import { EventsPanel } from '../../components/dashboard/ActivityDashboardWidgets';
import NoticeFeedPanel from '../../components/dashboard/NoticeFeedPanel';

// Laravel's Principal Office dashboard: employee totals, every event and the notice board.
export default function PrincipalOfficeDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    getPrincipalOfficeDashboard()
      .then((res) => {
        if (active) setData(res?.data?.data || null);
      })
      .catch((err) => {
        if (active) setError(getErrorMessage(err, 'Failed to load the dashboard'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const staff = data?.staff;
  const events = data?.events || [];
  const show = (value) => (loading ? '...' : value ?? '--');
  const deptConfig = useMemo(() => staffByDepartmentConfig(staff?.by_department || []), [staff]);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <Header />
      <div className="flex flex-1 min-h-0">
        <SidebarPrincipalOffice />
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">Principal Office Dashboard</h2>
              <p className="mt-1 text-slate-600">Staff strength, upcoming events and the institution notice board.</p>
            </div>

            {error && <div className="p-4 rounded border border-red-200 text-red-700 bg-red-50">{error}</div>}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <StatTile label="Total Employees" value={show(staff?.total)} tone="blue" />
              <StatTile label="Teaching Staff" value={show(staff?.teaching)} tone="green" />
              <StatTile label="Non-Teaching Staff" value={show(staff?.non_teaching)} tone="purple" />
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <EventsPanel events={events} loading={loading} />
              <NoticeFeedPanel />
            </div>

            <Panel title="Staff by Department">
              {loading ? <Muted>Loading…</Muted> : !deptConfig ? <Muted>No staff found.</Muted> : <ChartCanvas config={deptConfig} />}
            </Panel>
          </div>
        </main>
      </div>
    </div>
  );
}
