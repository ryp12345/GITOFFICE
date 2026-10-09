import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '../../components/layout/Header';
import Sidebar from '../../components/layout/Sidebar';
import { getSuperAdminDashboard } from '../../api/superAdminDashboardApi';
import { getErrorMessage } from '../../utils/errors';
import { Muted, Panel, StatTile, formatDate } from '../../components/dashboard/DashboardUI';
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
  staff: '/super-admin/staff',
  biometric: '/super-admin/biometric/daily',
  holidays: '/super-admin/leave-management/holiday-rh',
};

const TICKET_STATUS_STYLES = {
  new: 'bg-blue-100 text-blue-800',
  pending: 'bg-yellow-100 text-yellow-800',
  resolved: 'bg-green-100 text-green-800',
};

function formatDateTime(value) {
  if (!value) return '--';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '--';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function SuperAdminDashboard() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    getSuperAdminDashboard()
      .then((res) => { if (active) setSummary(res?.data?.data || null); })
      .catch((err) => { if (active) setError(getErrorMessage(err, 'Failed to load the dashboard summary.')); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const accounts = summary?.accounts;
  const tickets = summary?.tickets;
  const ent = summary?.entitlements;
  const show = (v) => (loading ? '…' : summary ? (v ?? 0) : '--');
  const openTickets = tickets ? tickets.new_count + tickets.pending_count : null;
  const coveragePct = ent?.staff_in_service ? Math.round((ent.covered_this_year / ent.staff_in_service) * 100) : 0;

  const ticketsPanel = (
    <Panel title="Support Tickets" link="/super-admin/tickets">
      {loading ? <Muted>Loading…</Muted> : !tickets ? <Muted>Tickets could not be loaded.</Muted> : (
        <>
          <div className="mb-4 grid grid-cols-3 gap-2">
            <StatTile label="New" value={tickets.new_count} tone="blue" />
            <StatTile label="Pending" value={tickets.pending_count} tone="yellow" />
            <StatTile label="Resolved" value={tickets.resolved_count} tone="green" />
          </div>
          {tickets.latest.length === 0 ? <Muted>No tickets yet.</Muted> : (
            <ul className="divide-y divide-slate-100">
              {tickets.latest.map((t) => (
                <li key={t.id} className="py-2 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <Link to={`/super-admin/tickets/${t.id}`} className="min-w-0 break-words font-medium text-blue-700 hover:underline">{t.title}</Link>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${TICKET_STATUS_STYLES[String(t.status).toLowerCase()] || 'bg-slate-100 text-slate-700'}`}>{t.status}</span>
                  </div>
                  <p className="text-xs text-slate-500">{t.staff_name || t.email} · {formatDateTime(t.created_at)}</p>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
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
                <h2 className="text-2xl font-semibold text-slate-900">Super Admin Dashboard</h2>
                <p className="mt-1 text-slate-600">Institute overview, user accounts and support tickets.</p>
              </div>
              {summary?.date ? <span className="text-sm font-medium text-slate-500">{formatDate(summary.date)}</span> : null}
            </div>

            {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">{error}</div>}

            <TodayTiles summary={summary} loading={loading} links={LINKS} />

            {/* Accounts, tickets & entitlements */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <StatTile
                label="User Accounts"
                value={show(accounts?.total)}
                sub={accounts ? `${accounts.active} active` : null}
                tone="blue"
                to="/super-admin/users"
              />
              <StatTile
                label="Open Tickets"
                value={openTickets ?? show(null)}
                sub={tickets ? `${tickets.new_count} new · ${tickets.pending_count} pending` : null}
                tone={openTickets ? 'yellow' : 'green'}
                to="/super-admin/tickets"
              />
              <StatTile
                label="Leave Entitlements"
                value={ent ? `${coveragePct}%` : show(null)}
                sub={ent ? `${ent.covered_this_year} of ${ent.staff_in_service} staff for ${summary.year}` : null}
                tone={ent && ent.covered_this_year < ent.staff_in_service ? 'yellow' : 'green'}
                to="/super-admin/leave-management/entitlement"
              />
            </div>

            {/* Institute overview */}
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
                  staffBasePath="/super-admin/staff"
                  manageLink="/super-admin/staff"
                />
              </div>
              <HolidaysPanel summary={summary} loading={loading} links={LINKS} />
            </div>

            <StaffCompositionCharts summary={summary} loading={loading} links={LINKS} extra={ticketsPanel} />

            <DailyAttendanceTable />
          </div>
        </main>
      </div>
    </div>
  );
}
