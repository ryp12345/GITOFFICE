import { useEffect, useState, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import Chart from 'chart.js/auto';
import Header from '../../components/layout/Header';
import Sidebar from '../../components/layout/Sidebar';
import api from '../../api/axios';
import { getEstablishmentDashboard } from '../../api/establishmentApi';
import { getErrorMessage } from '../../utils/errors';

// Same tinted stat-card style as the other dashboards.
// Full class names are listed so Tailwind keeps them in the build.
const TILE_TONES = {
  blue: { card: 'bg-blue-50 border-blue-200', value: 'text-blue-700', label: 'text-blue-900' },
  green: { card: 'bg-green-50 border-green-200', value: 'text-green-700', label: 'text-green-900' },
  yellow: { card: 'bg-yellow-50 border-yellow-200', value: 'text-yellow-700', label: 'text-yellow-900' },
  purple: { card: 'bg-purple-50 border-purple-200', value: 'text-purple-700', label: 'text-purple-900' },
  red: { card: 'bg-red-50 border-red-200', value: 'text-red-700', label: 'text-red-900' },
};

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899', '#9ca3af'];

// Records Establishment maintains; each row counts staff in service missing that item.
const DATA_QUALITY_CHECKS = [
  { key: 'no_department', label: 'No department assigned' },
  { key: 'no_designation', label: 'No designation assigned' },
  { key: 'no_association', label: 'No association (Confirmed / Probationary …)' },
  { key: 'no_employee_code', label: 'No biometric employee code' },
  { key: 'duplicate_employee_code', label: 'Employee code shared with another staff' },
  { key: 'no_leave_entitlement', label: 'No leave entitlement for this year' },
  { key: 'no_superannuation_date', label: 'No superannuation date' },
  { key: 'no_increment_date', label: 'No increment date' },
  { key: 'no_qualification', label: 'No qualification recorded' },
];

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

function formatDate(ymd, withYear = true) {
  if (!ymd) return '--';
  const [y, m, d] = String(ymd).slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return '--';
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', withYear
    ? { day: '2-digit', month: 'short', year: 'numeric' }
    : { day: '2-digit', month: 'short' });
}

function StatTile({ label, value, sub, tone = 'blue', to }) {
  const t = TILE_TONES[tone] || TILE_TONES.blue;
  const className = `rounded-lg p-4 shadow flex h-full flex-col items-center justify-center text-center border ${t.card}`;
  const body = (
    <>
      <span className={`text-3xl font-bold ${t.value}`}>{value}</span>
      <span className={`mt-2 ${t.label}`}>{label}</span>
      {sub ? <span className="mt-1 text-xs text-slate-600">{sub}</span> : null}
    </>
  );
  return to
    ? <Link to={to} className={`${className} transition hover:-translate-y-0.5`}>{body}</Link>
    : <div className={className}>{body}</div>;
}

function Panel({ title, link, linkLabel = 'view all', children }) {
  return (
    <div className="h-full rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        {link ? <Link to={link} className="text-sm text-blue-600 hover:underline">{linkLabel}</Link> : null}
      </div>
      {children}
    </div>
  );
}

function Muted({ children }) {
  return <p className="text-sm text-slate-500">{children}</p>;
}

// Names and details wrap instead of being cut off, since the columns are narrow.
// Paginated so every person can be reached, not just the first page.
function PeopleList({ rows, emptyText, pageSize = 5 }) {
  const [page, setPage] = useState(1);
  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  const current = Math.min(page, pages);
  const start = (current - 1) * pageSize;

  if (!rows.length) return <Muted>{emptyText}</Muted>;
  return (
    <>
      <ul className="divide-y divide-slate-100">
        {rows.slice(start, start + pageSize).map((r) => (
          <li key={r.id} className="py-2 text-sm">
            <p className="break-words font-medium leading-snug text-slate-800">{r.staff_name}</p>
            <p className="mt-0.5 break-words text-xs leading-snug text-slate-500">
              {[r.dept_shortname, r.design_name].filter(Boolean).join(' · ')}
            </p>
            {r.date ? <p className="text-xs font-medium text-slate-600">{formatDate(r.date)}</p> : null}
          </li>
        ))}
      </ul>
      {pages > 1 ? (
        <div className="mt-2 flex items-center justify-between gap-2 border-t border-slate-100 pt-2 text-xs text-slate-600">
          <span>{start + 1}–{Math.min(start + pageSize, rows.length)} of {rows.length}</span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="rounded border border-slate-300 bg-white px-2 py-0.5 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              onClick={() => setPage(current - 1)}
              disabled={current === 1}
            >
              Prev
            </button>
            <span className="px-1">{current}/{pages}</span>
            <button
              type="button"
              className="rounded border border-slate-300 bg-white px-2 py-0.5 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              onClick={() => setPage(current + 1)}
              disabled={current === pages}
            >
              Next
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}

// Compact column heading with a coloured count, used inside the Service Calendar.
const COUNT_PILL_TONES = {
  blue: 'bg-blue-100 text-blue-800',
  green: 'bg-green-100 text-green-800',
  purple: 'bg-purple-100 text-purple-800',
};

function ColumnHeading({ title, count, sub, tone = 'blue' }) {
  return (
    <div className="mb-2 border-b border-slate-200 pb-2">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-sm font-semibold text-slate-800">{title}</h4>
        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-sm font-bold ${COUNT_PILL_TONES[tone] || COUNT_PILL_TONES.blue}`}>{count}</span>
      </div>
      {sub ? <p className="mt-0.5 text-xs text-slate-500">{sub}</p> : null}
    </div>
  );
}

function ChartCanvas({ config, height = 'h-72' }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    if (!canvasRef.current || !config) return undefined;
    const chart = new Chart(canvasRef.current.getContext('2d'), config);
    return () => chart.destroy();
  }, [config]);
  return <div className={height}><canvas ref={canvasRef} /></div>;
}

function doughnutConfig(rows) {
  if (!rows.length) return null;
  return {
    type: 'doughnut',
    data: {
      labels: rows.map((r) => r.label),
      datasets: [{ data: rows.map((r) => r.count), backgroundColor: rows.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]), hoverOffset: 6 }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom', labels: { color: '#374151' } } },
    },
  };
}

export default function EstablishmentDashboard() {
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState('');

  const [attendance, setAttendance] = useState([]);
  const [attendanceLoading, setAttendanceLoading] = useState(true);
  const [selectedPunches, setSelectedPunches] = useState(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  useEffect(() => {
    let active = true;

    getEstablishmentDashboard()
      .then((res) => { if (active) setSummary(res?.data?.data || null); })
      .catch((err) => { if (active) setSummaryError(getErrorMessage(err, 'Failed to load the dashboard summary.')); })
      .finally(() => { if (active) setSummaryLoading(false); });

    // Daily Employee Attendance (unchanged): today's punches from the biometric report.
    async function fetchAttendance() {
      try {
        setAttendanceLoading(true);
        const res = await api.get('/biometric/daily');

        // Normalize backend shapes: either an array, or an object with combinedData + entry_exit
        const payload = res?.data || {};

        if (payload.combinedData && payload.entry_exit) {
          const combined = Array.isArray(payload.combinedData) ? payload.combinedData : [];
          const entryExit = payload.entry_exit || {};
          const rows = combined.map((d) => {
            const code = d.EmployeeCode || d.employeeCode || (d.EmployeeCode ? String(d.EmployeeCode) : null);
            return {
              ...d,
              EmployeeCode: code,
              entryLogs: entryExit.entryLogs && code ? entryExit.entryLogs[code] ?? null : null,
              exitLogs: entryExit.exitLogs && code ? entryExit.exitLogs[code] ?? null : null,
              employeePunchLogs: entryExit.employeePunchLogs && code ? (entryExit.employeePunchLogs[code] ?? []) : (d.employeePunchLogs || []),
              punchCounts: entryExit.punchCounts && code ? (entryExit.punchCounts[code] ?? (d.punchCounts || d.punchCount || null)) : (d.punchCounts || d.punchCount || null),
              durations: entryExit.durations && code ? (entryExit.durations[code] ?? d.durations ?? d.duration ?? null) : (d.durations || d.duration || null),
            };
          });
          if (active) setAttendance(rows);
        } else {
          const rows = Array.isArray(payload.data) ? payload.data : Array.isArray(payload) ? payload : [];
          if (active) setAttendance(rows);
        }
      } catch (e) {
        if (active) setAttendance([]);
      } finally {
        if (active) setAttendanceLoading(false);
      }
    }

    fetchAttendance();
    return () => { active = false; };
  }, []);

  const filteredAttendance = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return attendance;
    return attendance.filter(r => (
      (r.EmployeeName || r.full_name || r.employeeName || r.EmployeeCode || '').toString().toLowerCase().includes(q) ||
      (r.DepartmentName || r.department || '').toString().toLowerCase().includes(q) ||
      (r.EmployeeCode || '').toString().toLowerCase().includes(q)
    ));
  }, [attendance, search]);

  const totalPages = Math.max(1, Math.ceil(filteredAttendance.length / PAGE_SIZE));

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const paginatedAttendance = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredAttendance.slice(start, start + PAGE_SIZE);
  }, [filteredAttendance, page]);

  const formatDateTime = (value) => {
    if (!value) return '';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';

    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // 0 -> 12
    return `${hours}:${minutes} ${ampm}`;
  };

  const staff = summary?.staff;
  const att = summary?.attendance;
  const leave = summary?.leave;
  const events = summary?.service_events;
  const quality = summary?.data_quality;
  const holidays = summary?.holidays || [];
  const show = (v) => (summaryLoading ? '…' : summary ? (v ?? 0) : '--');

  const deptChart = useMemo(() => {
    const rows = staff?.by_department || [];
    if (!rows.length) return null;
    return {
      type: 'bar',
      data: {
        labels: rows.map((r) => r.department),
        datasets: [
          { label: 'Teaching', data: rows.map((r) => r.teaching), backgroundColor: '#3b82f6', borderRadius: 4 },
          { label: 'Non-Teaching', data: rows.map((r) => r.non_teaching), backgroundColor: '#10b981', borderRadius: 4 },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom', labels: { color: '#374151' } } },
        scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true, ticks: { precision: 0 } } },
      },
    };
  }, [staff]);

  const associationChart = useMemo(() => doughnutConfig(staff?.by_association || []), [staff]);
  const genderChart = useMemo(() => doughnutConfig(staff?.by_gender || []), [staff]);
  const designationChart = useMemo(() => {
    const rows = staff?.teaching_by_designation || [];
    const top = rows.slice(0, 6).map((r) => ({ label: r.designation, count: r.count }));
    const rest = rows.slice(6).reduce((sum, r) => sum + r.count, 0);
    return doughnutConfig(rest ? [...top, { label: 'Other', count: rest }] : top);
  }, [staff]);

  const leaveBacklog = (leave?.pending_past || 0) + (leave?.recommended_past || 0);
  const qualityIssues = quality ? DATA_QUALITY_CHECKS.filter((c) => quality[c.key] > 0).length : 0;

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

            {summaryError && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">{summaryError}</div>}

            {/* Today */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatTile
                label="Staff in Service"
                value={show(staff?.total)}
                sub={staff ? `${staff.teaching} teaching · ${staff.non_teaching} non-teaching` : null}
                tone="blue"
                to="/staff"
              />
              <StatTile
                label="Present Today"
                value={att?.available === false ? '--' : show(att?.present)}
                sub={att?.available ? `of ${att.expected} expected on biometric` : null}
                tone="green"
                to="/establishment/biometric/daily"
              />
              <StatTile
                label="On Leave Today"
                value={show(leave?.on_leave_today)}
                sub={leave ? `${leave.starting_next_7_days} more starting in 7 days` : null}
                tone="yellow"
                to="/leave-management/establishment-leave-list"
              />
              <StatTile
                label="Punch Missing Today"
                value={att?.available === false || att?.off_day ? '--' : show(att?.missing)}
                sub={att?.off_day ? `${att.off_day} – not counted` : 'no punch and no leave'}
                tone={att?.missing ? 'red' : 'green'}
                to="/establishment/biometric/daily"
              />
            </div>

            {/* Service calendar & leave pipeline */}
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
              <div className="xl:col-span-2">
                <Panel title="Service Calendar" link="/staff" linkLabel="staff">
                  {summaryLoading ? <Muted>Loading…</Muted> : !events ? <Muted>Data could not be loaded.</Muted> : (
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                      <div className="min-w-0">
                        <ColumnHeading title="Retiring in 12 Months" count={events.retirements_12_months.length} sub="by superannuation date" tone="purple" />
                        <PeopleList rows={events.retirements_12_months} emptyText="No retirements in the next 12 months." />
                      </div>
                      <div className="min-w-0">
                        <ColumnHeading
                          title="Increments This Month"
                          count={events.increments_this_month.length}
                          sub={`${events.increments_next_month} due next month`}
                          tone="green"
                        />
                        <PeopleList rows={events.increments_this_month} emptyText="No increments due this month." />
                      </div>
                      <div className="min-w-0">
                        <ColumnHeading title={`Joined in ${summary.year}`} count={events.joiners_this_year.length} sub="by date of joining" tone="blue" />
                        <PeopleList rows={events.joiners_this_year} emptyText="No new joiners this year." />
                      </div>
                    </div>
                  )}
                </Panel>
              </div>

              <Panel title="Leave Pipeline" link="/leave-management/establishment-leave-list" linkLabel="leave list">
                {summaryLoading ? <Muted>Loading…</Muted> : !leave ? <Muted>Data could not be loaded.</Muted> : (
                  <>
                    <div className="grid grid-cols-1 gap-3">
                      <StatTile label="Waiting for HOD" value={leave.pending_current} sub="pending, leave not yet over" tone={leave.pending_current ? 'yellow' : 'green'} />
                      <StatTile label="Waiting for Dean / Principal" value={leave.recommended_current} sub="recommended, leave not yet over" tone={leave.recommended_current ? 'yellow' : 'green'} />
                      <StatTile label="Approved Leave Days" value={leave.approved_days_this_month} sub="starting this month" tone="blue" />
                    </div>
                    {leaveBacklog ? (
                      <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                        <span className="font-semibold">{leaveBacklog} applications</span> for leave already over were never decided
                        ({leave.pending_past} at HOD, {leave.recommended_past} at Dean / Principal).
                      </div>
                    ) : null}
                  </>
                )}
              </Panel>
            </div>

            {/* Data quality & holidays */}
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
              <div className="xl:col-span-2">
                <Panel title="Staff Records to Complete" link="/staff" linkLabel="manage staff">
                  {summaryLoading ? <Muted>Loading…</Muted> : !quality ? <Muted>Data could not be loaded.</Muted> : (
                    <>
                      <p className="mb-3 text-sm text-slate-600">
                        {qualityIssues === 0
                          ? 'All staff records are complete.'
                          : `${qualityIssues} of ${DATA_QUALITY_CHECKS.length} checks need attention. Counts are staff in service.`}
                      </p>
                      <ul className="grid grid-cols-1 gap-2 md:grid-cols-2">
                        {DATA_QUALITY_CHECKS.map((c) => {
                          const n = quality[c.key] || 0;
                          return (
                            <li key={c.key} className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm ${n ? 'border-amber-200 bg-amber-50' : 'border-green-200 bg-green-50'}`}>
                              <span className={n ? 'text-amber-900' : 'text-green-900'}>{c.label}</span>
                              <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${n ? 'bg-amber-200 text-amber-900' : 'bg-green-200 text-green-900'}`}>
                                {n ? n : '✓'}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    </>
                  )}
                </Panel>
              </div>

              <Panel title="Upcoming Holidays" link="/leave-management/holiday-rh">
                {summaryLoading ? <Muted>Loading…</Muted> : holidays.length === 0 ? <Muted>No upcoming holidays listed.</Muted> : (
                  <ul className="divide-y divide-slate-100">
                    {holidays.map((h) => (
                      <li key={`${h.title}-${h.date}`} className="flex items-center justify-between gap-3 py-2 text-sm">
                        <div className="min-w-0">
                          <p className="truncate font-medium text-slate-800">{h.title}</p>
                          <p className="text-xs text-slate-500">{formatDate(h.date)}</p>
                        </div>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${String(h.type).toLowerCase() === 'holiday' ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'}`}>
                          {h.type}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>
            </div>

            {/* Staff composition */}
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
              <div className="xl:col-span-2">
                <Panel title="Staff by Department" link="/departments" linkLabel="departments">
                  {summaryLoading ? <Muted>Loading…</Muted> : deptChart ? <ChartCanvas config={deptChart} height="h-80" /> : <Muted>No staff found.</Muted>}
                </Panel>
              </div>
              <Panel title="Staff by Association" link="/associations" linkLabel="associations">
                {summaryLoading ? <Muted>Loading…</Muted> : associationChart ? <ChartCanvas config={associationChart} height="h-80" /> : <Muted>No staff found.</Muted>}
              </Panel>
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
              <Panel title="Teaching Staff by Designation" link="/designations" linkLabel="designations">
                {summaryLoading ? <Muted>Loading…</Muted> : designationChart ? <ChartCanvas config={designationChart} /> : <Muted>No teaching staff found.</Muted>}
              </Panel>
              <Panel title="Staff by Gender">
                {summaryLoading ? <Muted>Loading…</Muted> : genderChart ? <ChartCanvas config={genderChart} /> : <Muted>No staff found.</Muted>}
              </Panel>
              <Panel title="Quick Access">
                <div className="grid grid-cols-2 gap-3">
                  {QUICK_LINKS.map((l) => (
                    <Link key={l.to} to={l.to} className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2.5 px-3 rounded-lg flex items-center justify-center text-center shadow transition">
                      {l.label}
                    </Link>
                  ))}
                </div>
              </Panel>
            </div>

            {/* Daily Employee Attendance */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="grid grid-cols-1 sm:grid-cols-3 items-center gap-4 mb-4">
                  <div className="col-span-1">
                    <div className="relative w-full sm:w-72">
                      <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search attendance..." className="w-full py-2 pl-10 pr-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    </div>
                  </div>
                  <div className="col-span-1 text-center">
                    <h3 className="text-xl font-semibold text-slate-800">Daily Employee Attendance</h3>
                  </div>
                  <div className="col-span-1" />
                </div>
                <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-blue-600">
                        <tr className="text-left text-xs font-semibold text-slate-600 border-b">
                            <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Sl.No</th>
                            <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Employee</th>
                            <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Department</th>
                            <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">PunchIn</th>
                            <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">DeviceIn</th>
                            <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">PunchOut</th>
                            <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">DeviceOut</th>
                            <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">No.of.Punches</th>
                            <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Duration</th>
                            <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                    {attendanceLoading ? (
                        <tr>
                        <td colSpan={10} className="p-6 text-center">Loading...</td>
                        </tr>
                    ) : attendance.length === 0 ? (
                        <tr>
                        <td colSpan={10} className="p-6 text-center">No attendance data available</td>
                        </tr>
                    ) : (
                      paginatedAttendance.map((row, idx) => {
                        const entry = row.entryLogs || row.entryLog || row.entry || row.entryLogs?.[row.EmployeeCode] || null;
                        const exit = row.exitLogs || row.exitLog || row.exit || null;
                        const punches = row.employeePunchLogs || row.punches || row.punches_list || [];
                        return (
                            <tr key={idx} className="border-b last:border-0">
                            <td className="px-3 py-2 align-middle">{(page - 1) * PAGE_SIZE + idx + 1}</td>
                            <td className="px-3 py-2 align-middle">
                                <div className="flex items-center gap-3">
                                <span>{row.EmployeeName || row.employeeName || row.name || row.full_name || row.EmployeeCode}</span>
                                </div>
                            </td>
                            <td className="px-3 py-2 align-middle">{row.DepartmentName || row.department || ''}</td>
                            <td className="px-3 py-2 align-middle text-green-600">{formatDateTime(entry?.LogDate_Time || entry?.LogDate || entry?.logDate || '')}</td>
                            <td className="px-3 py-2 align-middle">{entry?.DeviceFName || entry?.DeviceName || ''}</td>
                            <td className="px-3 py-2 align-middle text-red-600">{formatDateTime(exit?.LogDate_Time || exit?.LogDate || '')}</td>
                            <td className="px-3 py-2 align-middle">{exit?.DeviceFName || exit?.DeviceName || ''}</td>
                            <td className="px-3 py-2 align-middle">{row.punchCounts || row.punchCount || row.punch_count || (Array.isArray(punches) ? punches.length : '')}</td>
                            <td className="px-3 py-2 align-middle">{row.durations || row.duration || ''}</td>
                            <td className="px-3 py-2 align-middle">
                                <button
                                onClick={() => setSelectedPunches({ punches, employee: row.EmployeeName || row.full_name || row.employeeName || row.EmployeeCode })}
                                className="p-2 text-blue-600 transition-colors duration-200 bg-white rounded-lg hover:bg-blue-100 border border-blue-300"
                                >
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                </button>
                            </td>
                            </tr>
                        );
                        })
                    )}
                    </tbody>
                </table>
                </div>

                {/* Pagination Controls */}
                {filteredAttendance.length > PAGE_SIZE && (
                  <div className="flex justify-end items-center gap-2 mt-4">
                    <button
                      className="px-3 py-1 rounded border border-gray-300 bg-white text-gray-700 disabled:opacity-50"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      Prev
                    </button>
                    <span className="text-sm text-gray-700">Page {page} of {totalPages}</span>
                    <button
                      className="px-3 py-1 rounded border border-gray-300 bg-white text-gray-700 disabled:opacity-50"
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                    >
                      Next
                    </button>
                  </div>
                )}

                {/* Modal for punches */}
                {selectedPunches && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="bg-white rounded-lg max-w-2xl w-full p-4">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="font-semibold">Log Details - <span className="text-blue-600 font-semibold">{selectedPunches.employee}</span></h4>
                      <button onClick={() => setSelectedPunches(null)} className="text-slate-600">Close</button>
                    </div>
                    <div className="overflow-auto max-h-80">
                       <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-blue-600">
                            <tr className="text-left text-xs font-semibold text-slate-600 border-b">
                            <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Log Time</th>
                            <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Log Device</th>
                            </tr>
                        </thead>
                        <tbody>
                      {Array.isArray(selectedPunches.punches) && selectedPunches.punches.length > 0 ? (
                      selectedPunches.punches.map((p, i) => (
                        <tr key={i} className="border-b">
                        <td className="px-3 py-2">{formatDateTime(p.LogDate || p.LogDate_Time || p.LogDateTime || p.logDate || p.LogDate_String)}</td>
                        <td className="px-3 py-2">{p.DeviceFName || p.DeviceName || p.DeviceF || ''}</td>
                        </tr>
                      ))
                      ) : (
                      <tr>
                        <td colSpan={2} className="p-4 text-center">No punch records available</td>
                      </tr>
                      )}
                    </tbody>
                        </table>
                    </div>
                    </div>
                </div>
                )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
