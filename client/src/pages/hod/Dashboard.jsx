import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Chart from 'chart.js/auto';
import Header from '../../components/layout/Header';
import Sidebar from '../../components/layout/Sidebar';
import Notification from '../../components/common/Notification';
import { EventsPanel, NoticesPanel } from '../../components/dashboard/ActivityDashboardWidgets';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import { getHodDashboard, getHodLeaveApplications, getMyStaff } from '../../api/hodApi';
import { getErrorMessage } from '../../utils/errors';

// Same tinted stat-card style as the Establishment / Principal / Registrar dashboards.
// Full class names are listed so Tailwind keeps them in the build.
const TILE_TONES = {
  blue: { card: 'bg-blue-50 border-blue-200', value: 'text-blue-700', label: 'text-blue-900' },
  green: { card: 'bg-green-50 border-green-200', value: 'text-green-700', label: 'text-green-900' },
  yellow: { card: 'bg-yellow-50 border-yellow-200', value: 'text-yellow-700', label: 'text-yellow-900' },
  purple: { card: 'bg-purple-50 border-purple-200', value: 'text-purple-700', label: 'text-purple-900' },
  red: { card: 'bg-red-50 border-red-200', value: 'text-red-700', label: 'text-red-900' },
};

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#9ca3af'];

const ACTIVITY_GROUPS = [
  {
    label: 'Professional Activity – Teaching',
    tone: 'blue',
    items: [
      { label: 'Attended', key: 'pa-attended-teaching', path: '/hod/teaching/professional-activities/attended' },
      { label: 'Conducted', key: 'pa-conducted-teaching', path: '/hod/teaching/professional-activities/conducted' },
    ],
  },
  {
    label: 'Professional Activity – Non-Teaching',
    tone: 'green',
    items: [
      { label: 'Attended', key: 'pa-attended-nonteaching', path: '/hod/nonteaching/professional-activities/attended' },
      { label: 'Conducted', key: 'pa-conducted-nonteaching', path: '/hod/nonteaching/professional-activities/conducted' },
    ],
  },
  {
    label: 'Conferences',
    tone: 'yellow',
    items: [
      { label: 'Attended', key: 'conference-attended', path: '/hod/research/conference/attended' },
      { label: 'Conducted', key: 'conference-conducted', path: '/hod/research/conference/conducted' },
    ],
  },
];

const RESEARCH_CARDS = [
  { label: 'Publications', key: 'publication', path: '/hod/research/publication', tone: 'purple' },
  { label: 'Funded Projects', key: 'funded-project', path: '/hod/research/funded-project', tone: 'blue' },
  { label: 'Book Chapters', key: 'book-chapter', path: '/hod/research/book-chapters', tone: 'green' },
  { label: 'Consultancy', key: 'consultancy', path: '/hod/research/consultancy', tone: 'yellow' },
  { label: 'Patents', key: 'patent', path: '/hod/research/patents', tone: 'purple' },
  { label: 'Copyrights', key: 'copyright', path: '/hod/research/copyrights', tone: 'blue' },
  { label: 'Achievements', key: 'achievement', path: '/hod/research/achievements', tone: 'green' },
];

const LEAVE_STATUS_STYLES = {
  pending: 'bg-yellow-100 text-yellow-800',
  recommended: 'bg-blue-100 text-blue-800',
  approved: 'bg-green-100 text-green-800',
};

function toYmd(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function ymdToDate(ymd) {
  const [y, m, d] = String(ymd || '').slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function formatDate(ymd) {
  const d = ymdToDate(ymd);
  if (!d) return '--';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

function formatRange(start, end) {
  return end && end !== start ? `${formatDate(start)} – ${formatDate(end)}` : formatDate(start);
}

// Institute weekly offs: every Sunday plus the 1st and 3rd Saturday of the month.
function isWeeklyOff(date) {
  const dow = date.getDay();
  if (dow === 0) return true;
  if (dow !== 6) return false;
  const weekOfMonth = Math.floor((date.getDate() - 1) / 7) + 1;
  return weekOfMonth === 1 || weekOfMonth === 3;
}

function statusOf(row) {
  return String(row?.appl_status || row?.status || 'pending').trim().toLowerCase();
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
      <div className="mb-4 flex items-center justify-between">
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

function DoughnutChart({ series, loading, emptyText }) {
  const canvasRef = useRef(null);
  const total = series.reduce((sum, s) => sum + s.value, 0);

  useEffect(() => {
    if (loading || !total || !canvasRef.current) return undefined;
    const chart = new Chart(canvasRef.current.getContext('2d'), {
      type: 'doughnut',
      data: {
        labels: series.map((s) => s.label),
        datasets: [{ data: series.map((s) => s.value), backgroundColor: series.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]), hoverOffset: 6 }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { color: '#374151' } },
          tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${ctx.parsed}` } },
        },
      },
    });
    return () => chart.destroy();
  }, [series, loading, total]);

  if (loading) return <Muted>Loading…</Muted>;
  if (!total) return <Muted>{emptyText}</Muted>;
  return <div className="h-64"><canvas ref={canvasRef} /></div>;
}

// Count rows by a field (case-insensitive, since master data mixes "Confirmed" / "contractual"),
// largest group first; blank values go to "Not set".
function groupCounts(rows, field) {
  const counts = new Map();
  rows.forEach((row) => {
    const raw = String(row?.[field] || '').trim();
    const key = raw.toLowerCase() || 'not set';
    const entry = counts.get(key) || { label: raw ? raw.charAt(0).toUpperCase() + raw.slice(1) : 'Not set', value: 0 };
    entry.value += 1;
    counts.set(key, entry);
  });
  return [...counts.values()].sort((a, b) => b.value - a.value);
}

export default function Dashboard() {
  const { token } = useAuth() || {};
  const [department, setDepartment] = useState(null);
  const [teachingStaff, setTeachingStaff] = useState([]);
  const [nonTeachingStaff, setNonTeachingStaff] = useState([]);
  const [staffLoading, setStaffLoading] = useState(true);
  // Sections below are undefined while loading and null when their request failed.
  const [applications, setApplications] = useState(undefined);
  const [attendance, setAttendance] = useState(undefined);
  const [overview, setOverview] = useState(undefined);
  const [notification, setNotification] = useState({ show: false, message: '', type: 'info' });

  useEffect(() => {
    if (!token) {
      setStaffLoading(false);
      return undefined;
    }
    let active = true;

    getMyStaff(token)
      .then((res) => {
        if (!active) return;
        const payload = res?.data?.data || {};
        const dept = payload.department || null;
        setDepartment(dept);
        setTeachingStaff(Array.isArray(payload.teachingStaff) ? payload.teachingStaff : []);
        setNonTeachingStaff(Array.isArray(payload.nonTeachingStaff) ? payload.nonTeachingStaff : []);

        // Today's department attendance needs the department id from this response.
        if (!dept?.id) {
          setAttendance(null);
          return;
        }
        api.get('/biometric/daily', { params: { date: toYmd(new Date()), department_id: dept.id } })
          .then((r) => {
            if (!active) return;
            const d = r?.data || {};
            setAttendance({
              present: Number(d.Totalpresent) || 0,
              onLeave: Number(d.TotalLeave) || 0,
              missing: Number(d.Totalmissing) || 0,
            });
          })
          .catch(() => { if (active) setAttendance(null); });
      })
      .catch((err) => {
        if (!active) return;
        setNotification({ show: true, message: getErrorMessage(err, 'Failed to load department staff'), type: 'error' });
        setAttendance(null);
      })
      .finally(() => { if (active) setStaffLoading(false); });

    getHodLeaveApplications(token)
      .then((res) => {
        if (!active) return;
        const rows = res?.data?.data?.applications;
        setApplications(Array.isArray(rows) ? rows : []);
      })
      .catch(() => { if (active) setApplications(null); });

    getHodDashboard(token)
      .then((res) => {
        if (!active) return;
        const payload = res?.data?.data || {};
        setOverview({
          totals: payload.totals || {},
          events: Array.isArray(payload.events) ? payload.events : [],
          notices: Array.isArray(payload.notices) ? payload.notices : [],
        });
      })
      .catch(() => { if (active) setOverview(null); });

    return () => { active = false; };
  }, [token]);

  const stats = useMemo(() => ({
    teaching: teachingStaff.length,
    nonTeaching: nonTeachingStaff.length,
    total: teachingStaff.length + nonTeachingStaff.length,
  }), [teachingStaff, nonTeachingStaff]);

  const designationSeries = useMemo(() => groupCounts(teachingStaff, 'designation_name'), [teachingStaff]);
  const associationSeries = useMemo(
    () => groupCounts([...teachingStaff, ...nonTeachingStaff], 'association_name'),
    [teachingStaff, nonTeachingStaff]
  );

  const leave = useMemo(() => {
    if (!applications) return null;
    const today = new Date();
    const todayYmd = toYmd(today);
    const weekAhead = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7);
    const weekAheadYmd = toYmd(weekAhead);
    const live = applications.filter((a) => !['rejected', 'cancelled'].includes(statusOf(a)));

    const toAct = applications.filter((a) => a.can_recommend);
    const onLeaveToday = live.filter((a) => a.start_date <= todayYmd && a.end_date >= todayYmd);
    const upcoming = live
      .filter((a) => a.start_date > todayYmd && a.start_date <= weekAheadYmd)
      .sort((a, b) => a.start_date.localeCompare(b.start_date));
    return { toAct, onLeaveToday, upcoming };
  }, [applications]);

  const todayIsOff = isWeeklyOff(new Date());
  const title = department?.dept_name ? `${department.dept_name} Dashboard` : 'Head of Department Dashboard';
  const totals = overview?.totals || {};
  const overviewLoading = overview === undefined;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <Header />
      <div className="flex flex-1 min-h-0">
        <Sidebar />
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            <Notification show={notification.show} message={notification.message} type={notification.type} onClose={() => setNotification({ show: false, message: '', type: '' })} />

            <div>
              <h2 className="text-2xl font-semibold text-slate-900">{title}</h2>
              <p className="mt-1 text-slate-600">Overview of staff, leave, attendance and activities in your department.</p>
            </div>

            {/* Headcount & action needed */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatTile label="Total Employees" value={staffLoading ? '—' : stats.total} tone="blue" to="/hod/my-staff" />
              <StatTile label="Teaching Employees" value={staffLoading ? '—' : stats.teaching} tone="green" to="/hod/my-staff" />
              <StatTile label="Non-Teaching Employees" value={staffLoading ? '—' : stats.nonTeaching} tone="purple" to="/hod/my-staff" />
              <StatTile
                label="Leave Requests to Recommend"
                value={leave ? leave.toAct.length : (applications === null ? '--' : '—')}
                tone={leave?.toAct.length ? 'red' : 'yellow'}
                to="/hod/leave-application"
              />
            </div>

            {/* Today's attendance & leave */}
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <Panel title="Today's Attendance" link="/biometric/daily" linkLabel="details">
                {attendance === undefined ? (
                  <Muted>Loading…</Muted>
                ) : !attendance ? (
                  <Muted>Biometric data is not available right now.</Muted>
                ) : (
                  <>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <StatTile label="Present" value={attendance.present} tone="green" />
                      <StatTile label="On Leave" value={attendance.onLeave} tone="yellow" />
                      <StatTile
                        label="Punch Missing"
                        value={todayIsOff ? '--' : attendance.missing}
                        tone={!todayIsOff && attendance.missing ? 'red' : 'green'}
                      />
                    </div>
                    <p className="mt-3 text-xs text-slate-500">
                      {todayIsOff
                        ? 'Today is a weekly off (Sunday / 1st or 3rd Saturday), so missing punches are not counted.'
                        : 'Confirmed, probationary, contractual and temporary staff of the department who have no punch today and no leave application.'}
                    </p>
                  </>
                )}
              </Panel>

              <Panel title="Staff on Leave" link="/hod/leave-application">
                {applications === undefined ? (
                  <Muted>Loading…</Muted>
                ) : !leave ? (
                  <Muted>Leave applications could not be loaded.</Muted>
                ) : (
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div>
                      <p className="mb-2 text-sm font-semibold text-slate-700">Today ({leave.onLeaveToday.length})</p>
                      {leave.onLeaveToday.length === 0 ? <Muted>No one is on leave today.</Muted> : (
                        <ul className="divide-y divide-slate-100">
                          {leave.onLeaveToday.slice(0, 6).map((a) => (
                            <li key={a.id} className="py-1.5 text-sm">
                              <p className="font-medium text-slate-800">{a.staff_name}</p>
                              <p className="text-xs text-slate-500">{a.title || a.leave_shortname} · {formatRange(a.start_date, a.end_date)}</p>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div>
                      <p className="mb-2 text-sm font-semibold text-slate-700">Next 7 days ({leave.upcoming.length})</p>
                      {leave.upcoming.length === 0 ? <Muted>No upcoming leave.</Muted> : (
                        <ul className="divide-y divide-slate-100">
                          {leave.upcoming.slice(0, 6).map((a) => (
                            <li key={a.id} className="py-1.5 text-sm">
                              <p className="font-medium text-slate-800">{a.staff_name}</p>
                              <p className="text-xs text-slate-500">{a.title || a.leave_shortname} · {formatRange(a.start_date, a.end_date)}</p>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                )}
              </Panel>
            </div>

            {/* Pending requests & staff composition */}
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
              <Panel title="Awaiting Your Recommendation" link="/hod/leave-application">
                {applications === undefined ? (
                  <Muted>Loading…</Muted>
                ) : !leave ? (
                  <Muted>Leave applications could not be loaded.</Muted>
                ) : leave.toAct.length === 0 ? (
                  <Muted>Nothing waiting for you.</Muted>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {leave.toAct.slice(0, 6).map((a) => (
                      <li key={a.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                        <div className="min-w-0">
                          <p className="truncate font-medium text-slate-800">{a.staff_name}</p>
                          <p className="text-xs text-slate-500">
                            {a.title || a.leave_shortname} · {Number(a.no_of_days) || 0} day{Number(a.no_of_days) === 1 ? '' : 's'} · {formatRange(a.start_date, a.end_date)}
                          </p>
                        </div>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${LEAVE_STATUS_STYLES[statusOf(a)] || 'bg-slate-100 text-slate-700'}`}>
                          {statusOf(a)}
                        </span>
                      </li>
                    ))}
                    {leave.toAct.length > 6 ? (
                      <li className="pt-2 text-xs text-slate-500">+{leave.toAct.length - 6} more</li>
                    ) : null}
                  </ul>
                )}
              </Panel>

              <Panel title="Teaching Staff by Designation" link="/hod/my-staff">
                <DoughnutChart series={designationSeries} loading={staffLoading} emptyText="No teaching staff found." />
              </Panel>

              <Panel title="Staff by Association" link="/hod/my-staff">
                <DoughnutChart series={associationSeries} loading={staffLoading} emptyText="No staff found." />
              </Panel>
            </div>

            {/* Department activities & research */}
            {overview === null ? (
              <Panel title="Department Activities & Research">
                <Muted>Activity totals could not be loaded.</Muted>
              </Panel>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  {ACTIVITY_GROUPS.map((group) => (
                    <div key={group.label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                      <p className="text-sm font-bold text-slate-700">{group.label}</p>
                      <div className="mt-3 grid grid-cols-2 gap-3">
                        {group.items.map((item) => (
                          <StatTile
                            key={item.key}
                            label={item.label}
                            value={overviewLoading ? '—' : (totals[item.key] ?? 0)}
                            tone={group.tone}
                            to={item.path}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 xl:grid-cols-7">
                  {RESEARCH_CARDS.map((card) => (
                    <StatTile
                      key={card.key}
                      label={card.label}
                      value={overviewLoading ? '—' : (totals[card.key] ?? 0)}
                      tone={card.tone}
                      to={card.path}
                    />
                  ))}
                </div>

                <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                  <EventsPanel events={overview?.events || []} loading={overviewLoading} />
                  <NoticesPanel notices={overview?.notices || []} loading={overviewLoading} />
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
