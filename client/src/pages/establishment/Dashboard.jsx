import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '../../components/layout/Header';
import Sidebar from '../../components/layout/Sidebar';
import { getEstablishmentDashboard } from '../../api/establishmentApi';
import { getErrorMessage } from '../../utils/errors';
import { Panel, formatDate } from '../../components/dashboard/DashboardUI';
import {
  HolidaysPanel,
  LeavePipelinePanel,
  ServiceCalendarPanel,
  StaffCompositionCharts,
  TodayTiles,
} from '../../components/dashboard/InstituteSections';
import StaffRecordsPanel from '../../components/dashboard/StaffRecordsPanel';
import DailyAttendanceTable from '../../components/dashboard/DailyAttendanceTable';

const LINKS = {
  staff: '/staff',
  biometric: '/establishment/biometric/daily',
  leaveList: '/leave-management/establishment-leave-list',
  holidays: '/leave-management/holiday-rh',
  departments: '/departments',
  associations: '/associations',
  designations: '/designations',
};

const QUICK_LINKS = [
  { label: 'Manage Staff', to: '/staff' },
  { label: 'Departments', to: '/departments' },
  { label: 'Designations', to: '/designations' },
  { label: 'Institutions', to: '/institutions' },
  { label: 'Qualifications', to: '/qualifications' },
  { label: 'Leaves', to: '/leave-management/leaves' },
  { label: 'Leave Entitlement', to: '/leave-management/entitlement' },
  { label: 'Holiday RH', to: '/leave-management/holiday-rh' },
];

export default function EstablishmentDashboard() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    getEstablishmentDashboard()
      .then((res) => { if (active) setSummary(res?.data?.data || null); })
      .catch((err) => { if (active) setError(getErrorMessage(err, 'Failed to load the dashboard summary.')); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const quickAccess = (
    <Panel title="Quick Access">
      <div className="grid grid-cols-2 gap-3">
        {QUICK_LINKS.map((l) => (
          <Link key={l.to} to={l.to} className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2.5 px-3 rounded-lg flex items-center justify-center text-center shadow transition">
            {l.label}
          </Link>
        ))}
      </div>
    </Panel>
  );

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <Header />
      <div className="flex flex-1 min-h-0">
        <Sidebar />
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-slate-900">Establishment Dashboard</h2>
                <p className="mt-1 text-slate-600">Staff, attendance, leave and service records across the institute.</p>
              </div>
              {summary?.date ? <span className="text-sm font-medium text-slate-500">{formatDate(summary.date)}</span> : null}
            </div>

            {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">{error}</div>}

            <TodayTiles summary={summary} loading={loading} links={LINKS} />

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
              <div className="xl:col-span-2">
                <ServiceCalendarPanel summary={summary} loading={loading} links={LINKS} />
              </div>
              <LeavePipelinePanel summary={summary} loading={loading} links={LINKS} />
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
              <div className="xl:col-span-2">
                <StaffRecordsPanel
                  quality={summary?.data_quality}
                  loading={loading}
                  staffBasePath="/establishment/staff"
                  manageLink="/staff"
                />
              </div>
              <HolidaysPanel summary={summary} loading={loading} links={LINKS} />
            </div>

            <StaffCompositionCharts summary={summary} loading={loading} links={LINKS} extra={quickAccess} />

            <DailyAttendanceTable />
          </div>
        </main>
      </div>
    </div>
  );
}
