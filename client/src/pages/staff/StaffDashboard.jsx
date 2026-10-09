import Header from '../../components/layout/Header';
import Sidebar from '../../components/layout/Sidebar';
import { useAuth } from '../../context/AuthContext';
import { ROLE_NON_TEACHING, isRoleMatch } from '../../utils/role';
import api from '../../api/axios';
import { getMyLeaveEntitlements } from '../../api/leaveEntitlementApi';
import { getTicketDashboard } from '../../api/ticketApi';
import { getResearchRecords } from '../../api/researchApi';
import { getProfessionalActivities } from '../../api/professionalActivityApi';
import { Chart, ArcElement, Tooltip, Legend } from 'chart.js';
import React from 'react';

// Research resources grouped into the tiles shown on the dashboard (keys match research.model RESOURCES).
const RESEARCH_GROUPS = [
  { label: 'Publications', resources: ['publication'], path: '/teaching/research/publication' },
  { label: 'Conferences', resources: ['conference-attended', 'conference-conducted'], path: '/teaching/research/conference' },
  { label: 'Books & Chapters', resources: ['book-chapter'], path: '/teaching/research/book-chapters' },
  { label: 'Funding & Consultancy', resources: ['funded-project', 'consultancy'], path: '/teaching/research/funding-consultancy' },
  { label: 'Patents & Copyrights', resources: ['patent', 'copyright'], path: '/teaching/research/copyright-patents' },
  { label: 'Achievements', resources: ['achievement'], path: '/teaching/research/achievement' },
];

const LEAVE_STATUS_STYLES = {
  pending: 'bg-yellow-100 text-yellow-800',
  recommended: 'bg-blue-100 text-blue-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-600',
};

// pg DATE columns arrive as UTC timestamps (e.g. 2026-10-01T18:30:00Z for 2 Oct IST),
// so parse into a local date instead of slicing the string.
function toLocalDate(value) {
  if (!value) return null;
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function formatDate(value) {
  const d = value instanceof Date ? value : toLocalDate(value);
  if (!d) return '--';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatTime(value) {
  if (!value) return '--';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

// Whole years and remaining months between two dates (from <= to).
function diffYearsMonths(from, to) {
  let months = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
  if (to.getDate() < from.getDate()) months -= 1;
  months = Math.max(months, 0);
  return { years: Math.floor(months / 12), months: months % 12 };
}

function formatYearsMonths({ years, months }) {
  const parts = [];
  if (years) parts.push(`${years} yr${years === 1 ? '' : 's'}`);
  if (months || !years) parts.push(`${months} mo`);
  return parts.join(' ');
}

// date_of_increment holds the increment anniversary; roll it forward to the next upcoming one.
function nextAnniversary(date, today) {
  if (!date) return null;
  if (date >= today) return date;
  const next = new Date(today.getFullYear(), date.getMonth(), date.getDate());
  if (next < today) next.setFullYear(next.getFullYear() + 1);
  return next;
}

function daysBetween(from, to) {
  return Math.round((to - from) / 86400000);
}

function StatTile({ label, value, sub, accent = 'text-slate-900' }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${accent}`}>{value}</p>
      {sub ? <p className="mt-0.5 text-xs text-slate-500">{sub}</p> : null}
    </div>
  );
}

function Panel({ title, link, linkLabel = 'view all', children }) {
  return (
    <div className="rounded-xl border border-blue-100 bg-white p-5 shadow">
      <div className="mb-4 flex items-center justify-between">
        <h5 className="text-lg font-bold text-blue-700">{title}</h5>
        {link ? <a href={link} className="text-sm text-blue-600 hover:underline">{linkLabel}</a> : null}
      </div>
      {children}
    </div>
  );
}

function Unavailable({ children = 'Data unavailable' }) {
  return <p className="text-sm text-slate-500">{children}</p>;
}

export default function StaffDashboard() {
  const { user, token } = useAuth() || {};
  const isNonTeaching = isRoleMatch(user?.role, ROLE_NON_TEACHING);
  const basePath = isNonTeaching ? '/nonteaching' : '/teaching';

  const fullNameParts = [user?.fname, user?.mname, user?.lname].filter(Boolean);
  const fallbackName = user?.name || user?.full_name || (fullNameParts.length ? fullNameParts.join(' ') : '') || user?.username || user?.email || '';

  const [resolvedName, setResolvedName] = React.useState(null);
  const [staff, setStaff] = React.useState(null);
  const [leaveBalance, setLeaveBalance] = React.useState({ CL: '--', EL: '--', RH: '--' });
  const [leavePieData, setLeavePieData] = React.useState([]);
  // Each section below is undefined while loading and null when its request failed.
  const [applications, setApplications] = React.useState(undefined);
  const [attendance, setAttendance] = React.useState(undefined);
  const [tickets, setTickets] = React.useState(undefined);
  const [holidays, setHolidays] = React.useState(undefined);
  const [research, setResearch] = React.useState(undefined);
  const [activities, setActivities] = React.useState(undefined);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    let mounted = true;

    async function resolveStaff() {
      if (user?.staff_id) {
        const res = await api.get(`/staff/${user.staff_id}`);
        const s = res?.data?.data || res?.data || null;
        if (s) return s;
      }
      if (user?.id) {
        const listRes = await api.get('/staff');
        const rows = Array.isArray(listRes?.data?.data) ? listRes.data.data : [];
        return rows.find((item) => Number(item?.user_id) === Number(user.id)) || null;
      }
      return null;
    }

    async function loadLeaveBalance(s) {
      const year = new Date().getFullYear();
      const entRes = await getMyLeaveEntitlements({ year }, token);
      const payload = entRes?.data?.data || {};
      const rows = payload.data || [];

      const staffRow = rows.find((r) => (s && Number(r.id) === Number(s.id)) || (user && Number(r.user_id) === Number(user.id)));
      if (!staffRow || !mounted) return;

      const leaves = staffRow.leaves || {};
      const compute = (short) => {
        const key = String(short || '').toUpperCase();
        const v = leaves[key];
        if (!v) return 0;
        if (v.balance !== undefined && v.balance !== null) {
          const n = Number(v.balance);
          return Number.isFinite(n) ? Math.max(n, 0) : 0;
        }
        const entitled = Number(v.entitled_accumulated ?? v.entitled_curr_year ?? 0) || 0;
        const availed = Number(v.availed ?? v.consumed ?? v.consumed_curr_year ?? 0) || 0;
        const encashed = Number(v.encashed_curr_year ?? v.encashed ?? 0) || 0;
        const val = entitled - availed - encashed;
        return Number.isFinite(val) ? Math.max(val, 0) : 0;
      };

      setLeaveBalance({ CL: compute('CL'), EL: compute('EL'), RH: compute('RH') });

      // Mirror server-side Blade `allLeaveTypes` so the pie shows the same categories
      const allLeaveTypes = ['CL', 'DL-Other', 'EL', 'RH', 'DL-GIT', 'DL-VTU'];
      const colors = {
        CL: '#3b82f6',
        EL: '#10b981',
        RH: '#f59e42',
        'DL-Other': '#8b5cf6',
        'DL-GIT': '#ef4444',
        'DL-VTU': '#06b6d4',
      };
      setLeavePieData(allLeaveTypes.map((t) => ({ label: t, value: Number(compute(t) || 0), color: colors[t] || '#9ca3af' })));
    }

    async function loadApplications() {
      const res = await api.get('/leave-calendar/applications', { params: { staff_id: user.id } });
      return Array.isArray(res?.data?.data) ? res.data.data : [];
    }

    async function loadAttendance(s) {
      if (!s?.employeecode) return null;
      const now = new Date();
      const res = await api.get('/biometric/monthly', {
        params: { employee: String(s.employeecode), month: now.getMonth() + 1, year: now.getFullYear() },
      });
      const data = res?.data || {};
      const today = startOfToday();
      const logs = data.employeeLogs || {};
      const leaveDates = new Set(Array.isArray(data.leave_dates) ? data.leave_dates : []);

      const presentDays = Object.keys(logs).length;
      const todayKey = Object.keys(logs).find((k) => {
        const d = toLocalDate(k);
        return d && d.getTime() === today.getTime();
      });
      const todayLog = todayKey ? logs[todayKey] : null;

      // Server already drops Sundays and holidays; also ignore days covered by a leave application.
      const missing = (Array.isArray(data.missinglog_array) ? data.missinglog_array : []).filter((m) => {
        const d = toLocalDate(m);
        if (!d || d > today) return false;
        const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        return !leaveDates.has(iso);
      });
      const leaveDaysSoFar = [...leaveDates].filter((iso) => {
        const d = toLocalDate(iso);
        return d && d <= today;
      }).length;

      const avg = data.averageDurations?.[String(s.employeecode)] || null;
      return {
        presentDays,
        missingDays: missing.length,
        leaveDays: leaveDaysSoFar,
        averageDuration: avg ? avg.slice(0, 5) : null,
        todayIn: todayLog?.entryLog?.LogDate || null,
        todayOut: todayLog?.exitLog?.LogDate || null,
      };
    }

    async function loadTickets() {
      const res = await getTicketDashboard();
      const counts = res?.data?.data?.counts || {};
      return {
        newCount: Number(counts.new_count) || 0,
        pendingCount: Number(counts.pending_count) || 0,
        resolvedCount: Number(counts.resolved_count) || 0,
      };
    }

    async function loadHolidays() {
      const res = await api.get('/holidayrhs');
      const rows = Array.isArray(res?.data?.data) ? res.data.data : Array.isArray(res?.data) ? res.data : [];
      const today = startOfToday();
      return rows
        .map((h) => ({ title: h.title, type: h.type, date: toLocalDate(h.start || h.holidayrh_date) }))
        .filter((h) => h.date && h.date >= today)
        .sort((a, b) => a.date - b.date)
        .slice(0, 5);
    }

    async function loadResearch() {
      const keys = [...new Set(RESEARCH_GROUPS.flatMap((g) => g.resources))];
      const results = await Promise.allSettled(keys.map((k) => getResearchRecords(k)));
      if (results.every((r) => r.status === 'rejected')) throw new Error('Research data unavailable');
      const counts = {};
      keys.forEach((k, i) => {
        const r = results[i];
        counts[k] = r.status === 'fulfilled' && Array.isArray(r.value?.data) ? r.value.data.length : null;
      });
      return RESEARCH_GROUPS.map((g) => {
        const values = g.resources.map((k) => counts[k]);
        const known = values.filter((v) => v !== null);
        return { ...g, count: known.length ? known.reduce((a, b) => a + b, 0) : null };
      });
    }

    async function loadActivities() {
      const res = await getProfessionalActivities();
      const data = res?.data || {};
      return {
        attended: Array.isArray(data.attended) ? data.attended.length : 0,
        conducted: Array.isArray(data.conducted) ? data.conducted.length : 0,
      };
    }

    // Run a section loader and store its result, or null on failure, without blocking the others.
    const settle = (promise, setter) => promise
      .then((value) => { if (mounted) setter(value); })
      .catch(() => { if (mounted) setter(null); });

    async function loadDashboard() {
      setError('');

      // These do not depend on the staff record.
      if (user?.id) settle(loadApplications(), setApplications);
      else setApplications(null);
      settle(loadTickets(), setTickets);
      settle(loadHolidays(), setHolidays);
      settle(loadActivities(), setActivities);
      if (!isNonTeaching) settle(loadResearch(), setResearch);

      let s = null;
      try {
        s = await resolveStaff();
      } catch (e) {
        if (mounted) setError('Failed to load dashboard data');
      }
      if (!mounted) return;

      if (s) {
        setStaff(s);
        const parts = [s.fname, s.mname, s.lname].filter(Boolean);
        setResolvedName(s.name || (parts.length ? parts.join(' ') : null) || null);
      }

      loadLeaveBalance(s).catch(() => {});
      settle(loadAttendance(s), setAttendance);
    }

    loadDashboard();
    return () => { mounted = false; };
  }, [user?.id, user?.staff_id, token, isNonTeaching]);

  // Chart.js setup for pie chart
  const chartRef = React.useRef(null);
  React.useEffect(() => {
    Chart.register(ArcElement, Tooltip, Legend);
    const ctx = chartRef.current?.getContext?.('2d');
    if (!ctx) return;

    const data = {
      labels: leavePieData.map((d) => d.label),
      datasets: [
        {
          data: leavePieData.map((d) => d.value),
          backgroundColor: leavePieData.map((d) => d.color),
        },
      ],
    };

    const chart = new Chart(ctx, {
      type: 'pie',
      data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom' },
        },
      },
    });

    return () => {
      chart.destroy();
    };
  }, [leavePieData]);

  const department = staff?.department_name || staff?.dept_shortname || staff?.department || '';
  const designation = staff?.designation_name || staff?.designation || '';
  const payscale = staff?.payscale_title || staff?.payscale || '';
  const association = staff
    ? (Array.isArray(staff.latestassociation) ? staff.latestassociation[0]?.asso_name : staff.latestassociation?.asso_name)
      || staff.association_name || ''
    : '';

  // Service milestones derived from the staff record.
  const service = React.useMemo(() => {
    const today = startOfToday();
    const doj = toLocalDate(staff?.doj);
    const increment = nextAnniversary(toLocalDate(staff?.date_of_increment), today);
    const retirement = toLocalDate(staff?.date_of_superanuation);
    return {
      doj,
      tenure: doj && doj <= today ? diffYearsMonths(doj, today) : null,
      increment,
      incrementInDays: increment ? daysBetween(today, increment) : null,
      retirement,
      untilRetirement: retirement && retirement > today ? diffYearsMonths(today, retirement) : null,
    };
  }, [staff]);

  const leaveSummary = React.useMemo(() => {
    if (!applications) return null;
    const year = new Date().getFullYear();
    const statusOf = (a) => String(a.status || a.appl_status || 'pending').trim().toLowerCase();
    const awaiting = applications.filter((a) => ['pending', 'recommended'].includes(statusOf(a))).length;
    const approvedDaysThisYear = applications
      .filter((a) => statusOf(a) === 'approved' && toLocalDate(a.start_date)?.getFullYear() === year)
      .reduce((sum, a) => sum + (Number(a.no_of_days) || 0), 0);
    return {
      awaiting,
      approvedDaysThisYear,
      recent: applications.slice(0, 4).map((a) => ({ ...a, statusKey: statusOf(a) })),
    };
  }, [applications]);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <Header />
      <div className="flex flex-1 min-h-0">
        <Sidebar />
        <main className="flex-1 overflow-auto p-6">
          <div className="min-h-full rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-semibold text-slate-900">Staff Dashboard</h2>
            <p className="mt-1 text-lg font-medium text-blue-700">Welcome{(resolvedName || fallbackName) ? `, ${resolvedName || fallbackName}` : ''}</p>
            {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}

            {/* Statistic Cards - Blade-style layout */}
            <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
              {/* Department Card */}
              <div className="rounded-xl bg-blue-50 p-5 shadow flex flex-col border border-blue-200">
                <div className="flex items-center mb-2">
                  <div className="avatar rounded-sm text-primary p-2.5 bg-blue-100 flex items-center justify-center mr-3">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32" fill="currentColor">
                      <path d="M12 2L2 6V10L12 14L22 10V6L12 2ZM12 15L2 10V14L12 19L22 14V10L12 15ZM12 18L4 13L12 17L20 13L12 18Z"></path>
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold">Department</p>
                    <h5 className="mb-0 text-2xl font-semibold text-gray-800">{department}</h5>
                    <a href={`${basePath}/department-history`} className="text-blue-600 text-sm hover:underline">view</a>
                  </div>
                </div>
              </div>
              {/* Designation & Payscale Card */}
              <div className="rounded-xl bg-yellow-50 p-5 shadow flex flex-col border border-yellow-200">
                <div className="flex items-center mb-2">
                  <div className="avatar rounded-sm text-yellow-600 p-2.5 bg-yellow-100 flex items-center justify-center mr-3">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32" fill="currentColor">
                      <path d="M12 2C13.1 2 14 2.9 14 4V6H20C21.1 6 22 6.9 22 8V20C22 21.1 21.1 22 20 22H4C2.9 22 2 21.1 2 20V8C2 6.9 2.9 6 4 6H10V4C10 2.9 10.9 2 12 2ZM12 4H10V6H14V4H12ZM4 8V20H20V8H4Z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold">Designation & Payscale</p>
                    <h5 className="mb-0 text-2xl font-semibold text-gray-800">{designation}</h5>
                    <div className="text-sm text-gray-600">{payscale}</div>
                    <a href={`${basePath}/designation-payscale`} className="text-yellow-700 text-sm hover:underline">view</a>
                  </div>
                </div>
              </div>
              {/* Association Card */}
              <div className="rounded-xl bg-pink-50 p-5 shadow flex flex-col border border-pink-200">
                <div className="flex items-center mb-2">
                  <div className="avatar rounded-sm text-pink-600 p-2.5 bg-pink-100 flex items-center justify-center mr-3">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5v-5h-1v-2h1V8c0-.55.45-1 1-1h2v2h-1v1.5h1v2h-1v5h-2zm6 0h-2v-2h2v2zm-6-9c-.83 0-1.5-.67-1.5-1.5S10.17 5.5 11 5.5 12.5 6.17 12.5 7 11.83 7.5 11 7.5z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold">Association</p>
                    <h5 className="mb-0 text-2xl font-semibold text-gray-800">{association}</h5>
                    <a href={`${basePath}/association`} className="text-pink-700 text-sm hover:underline">view</a>
                  </div>
                </div>
              </div>
              {/* Leave Statistics Card */}
              <div className="rounded-xl bg-green-50 p-5 shadow flex flex-col border border-green-200">
                <div className="flex items-center mb-2">
                  <div className="avatar rounded-sm text-green-600 p-2.5 bg-green-100 flex items-center justify-center mr-3">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32" fill="currentColor">
                      <path d="M16.5 3a6.5 6.5 0 1 0-9 9H3v9h18v-9h-4.5a6.5 6.5 0 0 0-9-9zM9 6a3 3 0 1 1 6 0 3 3 0 0 1-6 0zm9 9H6v6h12v-6z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold">Leaves</p>
                    <div className="flex gap-2 mt-1">
                      <span className="text-sm mr-2">CL: <span className="font-semibold">{leaveBalance.CL}</span></span>
                      <span className="text-sm mr-2">EL: <span className="font-semibold">{leaveBalance.EL}</span></span>
                      <span className="text-sm mr-2">RH: <span className="font-semibold">{leaveBalance.RH}</span></span>
                    </div>
                    <a href={`${basePath}/leave-application`} className="text-green-700 text-sm hover:underline">apply</a>
                  </div>
                </div>
              </div>
            </div>

            {/* Service milestones & leave requests */}
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatTile
                label="Years of Service"
                value={service.tenure ? formatYearsMonths(service.tenure) : '--'}
                sub={service.doj ? `Joined ${formatDate(service.doj)}` : null}
              />
              <StatTile
                label="Next Increment"
                value={service.increment ? formatDate(service.increment) : '--'}
                sub={service.incrementInDays !== null ? (service.incrementInDays === 0 ? 'Today' : `in ${service.incrementInDays} day${service.incrementInDays === 1 ? '' : 's'}`) : null}
              />
              <StatTile
                label="Superannuation"
                value={service.retirement ? formatDate(service.retirement) : '--'}
                sub={service.untilRetirement ? `${formatYearsMonths(service.untilRetirement)} remaining` : null}
              />
              <StatTile
                label="Leave Requests Awaiting"
                value={leaveSummary ? leaveSummary.awaiting : '--'}
                sub={leaveSummary ? `${leaveSummary.approvedDaysThisYear} day${leaveSummary.approvedDaysThisYear === 1 ? '' : 's'} approved this year` : null}
                accent={leaveSummary?.awaiting ? 'text-amber-600' : 'text-slate-900'}
              />
            </div>

            {/* Leave balance pie & attendance */}
            <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-2">
              <Panel title="Overview of Leave Balance">
                <div className="flex flex-col items-center gap-6 sm:flex-row">
                  <div className="w-72 h-56">
                    <canvas ref={chartRef} />
                  </div>
                  <div className="flex-1 text-sm text-blue-700">
                    {leavePieData.length ? leavePieData.map((item) => (
                      <div key={item.label} className="flex items-center gap-2 mb-2">
                        <span style={{ background: item.color }} className="inline-block w-3 h-3 rounded-full"></span>
                        <span className="font-medium">{item.label}:</span>
                        <span className="ml-1">{item.value}</span>
                      </div>
                    )) : (
                      <div>No leave data available</div>
                    )}
                  </div>
                </div>
              </Panel>

              <Panel
                title={`Attendance – ${new Date().toLocaleString('en-IN', { month: 'long', year: 'numeric' })}`}
                link={`${basePath}/biometric/monthly`}
                linkLabel="details"
              >
                {attendance === undefined ? (
                  <Unavailable>Loading…</Unavailable>
                ) : !attendance ? (
                  <Unavailable>Biometric data is not available right now.</Unavailable>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <StatTile label="Days Present" value={attendance.presentDays} accent="text-green-700" />
                      <StatTile label="Punch Missing" value={attendance.missingDays} accent={attendance.missingDays ? 'text-red-600' : 'text-slate-900'} />
                      <StatTile label="On Leave" value={attendance.leaveDays} />
                      <StatTile label="Avg. Hours" value={attendance.averageDuration || '--'} sub="hh:mm per day" />
                    </div>
                    <div className="mt-4 rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-700">
                      <span className="font-semibold">Today:</span>{' '}
                      {attendance.todayIn
                        ? <>In {formatTime(attendance.todayIn)}{attendance.todayOut ? <> · Last punch {formatTime(attendance.todayOut)}</> : null}</>
                        : 'No punch recorded yet'}
                    </div>
                  </>
                )}
              </Panel>
            </div>

            {/* Recent leave applications, holidays, tickets */}
            <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
              <Panel title="Recent Leave Applications" link={`${basePath}/leave-application`}>
                {applications === undefined ? (
                  <Unavailable>Loading…</Unavailable>
                ) : !leaveSummary ? (
                  <Unavailable />
                ) : leaveSummary.recent.length === 0 ? (
                  <Unavailable>No leave applications yet.</Unavailable>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {leaveSummary.recent.map((a) => (
                      <li key={a.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                        <div className="min-w-0">
                          <p className="font-medium text-slate-800">
                            {a.leave_shortname || a.leave_longname || 'Leave'}
                            <span className="ml-1 font-normal text-slate-500">· {Number(a.no_of_days) || 0} day{Number(a.no_of_days) === 1 ? '' : 's'}</span>
                          </p>
                          <p className="text-xs text-slate-500">
                            {formatDate(a.start_date)}{a.end_date && a.end_date !== a.start_date ? ` – ${formatDate(a.end_date)}` : ''}
                          </p>
                        </div>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${LEAVE_STATUS_STYLES[a.statusKey] || 'bg-slate-100 text-slate-700'}`}>
                          {a.statusKey}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>

              <Panel title="Upcoming Holidays">
                {holidays === undefined ? (
                  <Unavailable>Loading…</Unavailable>
                ) : !holidays ? (
                  <Unavailable />
                ) : holidays.length === 0 ? (
                  <Unavailable>No upcoming holidays listed.</Unavailable>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {holidays.map((h) => (
                      <li key={`${h.title}-${h.date.getTime()}`} className="flex items-center justify-between gap-3 py-2 text-sm">
                        <div className="min-w-0">
                          <p className="truncate font-medium text-slate-800">{h.title}</p>
                          <p className="text-xs text-slate-500">
                            {formatDate(h.date)} · {h.date.toLocaleDateString('en-IN', { weekday: 'short' })}
                          </p>
                        </div>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${String(h.type).toLowerCase() === 'holiday' ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'}`}>
                          {h.type}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>

              <Panel title="My Tickets" link="/tickets">
                {tickets === undefined ? (
                  <Unavailable>Loading…</Unavailable>
                ) : !tickets ? (
                  <Unavailable />
                ) : (
                  <div className="grid grid-cols-3 gap-3">
                    <StatTile label="New" value={tickets.newCount} accent="text-blue-700" />
                    <StatTile label="Pending" value={tickets.pendingCount} accent="text-amber-600" />
                    <StatTile label="Resolved" value={tickets.resolvedCount} accent="text-green-700" />
                  </div>
                )}
              </Panel>
            </div>

            {/* Research (teaching only) & professional activities */}
            <div className={`mt-6 grid grid-cols-1 gap-6 ${isNonTeaching ? '' : 'xl:grid-cols-3'}`}>
              {!isNonTeaching ? (
                <div className="xl:col-span-2">
                  <Panel title="Research Summary">
                    {research === undefined ? (
                      <Unavailable>Loading…</Unavailable>
                    ) : !research ? (
                      <Unavailable />
                    ) : (
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                        {research.map((g) => (
                          <a key={g.label} href={g.path} className="block transition hover:-translate-y-0.5">
                            <StatTile label={g.label} value={g.count ?? '--'} accent="text-indigo-700" />
                          </a>
                        ))}
                      </div>
                    )}
                  </Panel>
                </div>
              ) : null}

              <Panel title="Professional Activities" link={`${basePath}/professional-activities`}>
                {activities === undefined ? (
                  <Unavailable>Loading…</Unavailable>
                ) : !activities ? (
                  <Unavailable />
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <StatTile label="Attended" value={activities.attended} accent="text-teal-700" />
                    <StatTile label="Conducted" value={activities.conducted} accent="text-teal-700" />
                  </div>
                )}
              </Panel>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
