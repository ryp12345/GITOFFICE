import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Chart from 'chart.js/auto';
import Header from '../../components/layout/Header';
import Sidebar from '../../components/layout/Sidebar';
import { useAuth } from '../../context/AuthContext';
import { getPrincipalDashboard } from '../../api/principalApi';
import { isRoleMatch, ROLE_DEAN_ADMIN } from '../../utils/role';
import { getErrorMessage } from '../../utils/errors';

// Same tinted stat-card style as the Establishment / Registrar / HOD dashboards.
// Full class names are listed so Tailwind keeps them in the build.
const TILE_TONES = {
  blue: { card: 'bg-blue-50 border-blue-200', value: 'text-blue-700', label: 'text-blue-900' },
  green: { card: 'bg-green-50 border-green-200', value: 'text-green-700', label: 'text-green-900' },
  yellow: { card: 'bg-yellow-50 border-yellow-200', value: 'text-yellow-700', label: 'text-yellow-900' },
  purple: { card: 'bg-purple-50 border-purple-200', value: 'text-purple-700', label: 'text-purple-900' },
  red: { card: 'bg-red-50 border-red-200', value: 'text-red-700', label: 'text-red-900' },
};

const ATTENDANCE_PAGE_SIZE = 10;

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899', '#9ca3af'];

const LEAVE_STATUS_STYLES = {
  pending: 'bg-yellow-100 text-yellow-800',
  recommended: 'bg-blue-100 text-blue-800',
  approved: 'bg-green-100 text-green-800',
};

function formatDate(ymd, withYear = false) {
  if (!ymd) return '--';
  const [y, m, d] = String(ymd).slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return '--';
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', withYear
    ? { day: '2-digit', month: 'short', year: 'numeric' }
    : { day: '2-digit', month: 'short' });
}

function formatRange(start, end) {
  return end && end !== start ? `${formatDate(start)} – ${formatDate(end)}` : formatDate(start);
}

function plural(n, word) {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
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

function LeaveList({ rows, emptyText, showStatus = false }) {
  if (!rows.length) return <Muted>{emptyText}</Muted>;
  return (
    <ul className="divide-y divide-slate-100">
      {rows.map((a) => (
        <li key={a.id} className="flex items-center justify-between gap-3 py-2 text-sm">
          <div className="min-w-0">
            <p className="truncate font-medium text-slate-800">
              {a.staff_name}
              {a.dept_shortname ? <span className="ml-1 font-normal text-slate-500">· {a.dept_shortname}</span> : null}
            </p>
            <p className="text-xs text-slate-500">
              {a.leave_shortname || 'Leave'} · {plural(a.no_of_days, 'day')} · {formatRange(a.start_date, a.end_date)}
            </p>
          </div>
          {showStatus ? (
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${LEAVE_STATUS_STYLES[String(a.appl_status).toLowerCase()] || 'bg-slate-100 text-slate-700'}`}>
              {a.appl_status}
            </span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function StaffByDepartmentChart({ rows }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    if (!canvasRef.current || rows.length === 0) return undefined;
    const chart = new Chart(canvasRef.current.getContext('2d'), {
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
    });
    return () => chart.destroy();
  }, [rows]);
  return <div className="h-80"><canvas ref={canvasRef} /></div>;
}

function DoughnutChart({ rows }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    if (!canvasRef.current || rows.length === 0) return undefined;
    const chart = new Chart(canvasRef.current.getContext('2d'), {
      type: 'doughnut',
      data: {
        labels: rows.map((r) => r.label),
        datasets: [{ data: rows.map((r) => r.value), backgroundColor: rows.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]), hoverOffset: 6 }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom', labels: { color: '#374151' } } },
      },
    });
    return () => chart.destroy();
  }, [rows]);
  return <div className="h-80"><canvas ref={canvasRef} /></div>;
}

export default function PrincipalDeanDashboard() {
  const { user, token } = useAuth() || {};
  const isDeanAdmin = isRoleMatch(user?.role, ROLE_DEAN_ADMIN);
  const base = isDeanAdmin ? '/dean_admin' : '/principal';

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attendancePage, setAttendancePage] = useState(1);

  useEffect(() => {
    let active = true;
    getPrincipalDashboard(token)
      .then((res) => { if (active) setData(res?.data?.data || null); })
      .catch((err) => { if (active) setError(getErrorMessage(err, 'Failed to load the dashboard.')); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [token]);

  const staff = data?.staff;
  const leave = data?.leave;
  const attendance = data?.attendance;
  const recruitment = data?.recruitment || {};

  const designationRows = useMemo(() => {
    const rows = staff?.teaching_by_designation || [];
    // Keep the chart readable: top 6 designations, the rest grouped.
    const top = rows.slice(0, 6).map((r) => ({ label: r.designation, value: r.count }));
    const rest = rows.slice(6).reduce((sum, r) => sum + r.count, 0);
    return rest ? [...top, { label: 'Other', value: rest }] : top;
  }, [staff]);

  const deptRows = useMemo(() => staff?.by_department || [], [staff]);

  const attendanceRows = useMemo(() => attendance?.by_department || [], [attendance]);
  const attendancePages = Math.max(1, Math.ceil(attendanceRows.length / ATTENDANCE_PAGE_SIZE));
  const currentAttendancePage = Math.min(attendancePage, attendancePages);
  const pagedAttendanceRows = attendanceRows.slice(
    (currentAttendancePage - 1) * ATTENDANCE_PAGE_SIZE,
    currentAttendancePage * ATTENDANCE_PAGE_SIZE
  );
  const show = (v) => (loading ? '…' : data ? (v ?? 0) : '--');
  const approverLabel = isDeanAdmin ? 'Dean (Admin)' : 'Principal';

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <Header />
      <div className="flex flex-1 min-h-0">
        <Sidebar />
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-slate-900">Welcome{user?.name ? `, ${user.name}` : ''}</h2>
                <p className="mt-1 text-slate-600">{approverLabel} dashboard: college staff, leave and attendance.</p>
              </div>
              {data?.date ? <span className="text-sm font-medium text-slate-500">{formatDate(data.date, true)}</span> : null}
            </div>

            {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">{error}</div>}

            {/* Headline numbers */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatTile
                label="Total Staff"
                value={show(staff?.total)}
                sub={staff ? `${staff.teaching} teaching · ${staff.non_teaching} non-teaching` : null}
                tone="blue"
                to={`${base}/staff`}
              />
              <StatTile
                label="Leave Awaiting Your Approval"
                value={show(leave?.awaiting_current)}
                sub={leave?.awaiting_backlog ? `+${leave.awaiting_backlog} older, already past` : 'current and upcoming leave'}
                tone={leave?.awaiting_current ? 'red' : 'yellow'}
                to={`${base}/leave-application`}
              />
              <StatTile
                label="Present Today"
                value={attendance?.available === false ? '--' : show(attendance?.present)}
                sub={attendance?.available ? `of ${attendance.expected} expected · ${attendance.on_leave} on leave` : null}
                tone="green"
                to={`${base}/biometric/daily`}
              />
              <StatTile
                label="Punch Missing Today"
                value={attendance?.available === false || attendance?.off_day ? '--' : show(attendance?.missing)}
                sub={attendance?.off_day ? `${attendance.off_day} – not counted` : 'no punch and no leave'}
                tone={attendance?.missing ? 'red' : 'green'}
                to={`${base}/biometric/daily`}
              />
            </div>

            {/* Leave */}
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <Panel title="Awaiting Your Approval" link={`${base}/leave-application`}>
                {loading ? <Muted>Loading…</Muted> : !leave ? <Muted>Leave data could not be loaded.</Muted> : (
                  <>
                    <LeaveList rows={leave.awaiting_list} emptyText="No current or upcoming leave is waiting for you." showStatus />
                    {leave.awaiting_current > leave.awaiting_list.length ? (
                      <p className="mt-2 text-xs text-slate-500">+{leave.awaiting_current - leave.awaiting_list.length} more</p>
                    ) : null}
                    {leave.awaiting_backlog ? (
                      <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                        <span className="font-semibold">{plural(leave.awaiting_backlog, 'older application')}</span> for leave that has already ended
                        {leave.oldest_backlog_date ? ` (since ${formatDate(leave.oldest_backlog_date, true)})` : ''} still {leave.awaiting_backlog === 1 ? 'needs' : 'need'} a decision.
                      </div>
                    ) : null}
                    <p className="mt-3 text-xs text-slate-500">
                      {isDeanAdmin
                        ? 'You approve recommended leave of less than 5 days.'
                        : 'You approve recommended leave of more than 4 days, and leave of staff holding an additional designation.'}
                    </p>
                  </>
                )}
              </Panel>

              <Panel title="Staff on Leave" link={`${base}/leave-application`}>
                {loading ? <Muted>Loading…</Muted> : !leave ? <Muted>Leave data could not be loaded.</Muted> : (
                  <>
                    <div className="mb-4 grid grid-cols-2 gap-3">
                      <StatTile label="On Leave Today" value={leave.on_leave_today} tone="yellow" />
                      <StatTile label="Starting in 7 Days" value={leave.starting_next_7_days} tone="blue" />
                    </div>
                    <LeaveList rows={leave.on_leave_today_list} emptyText="No one is on leave today." />
                    {leave.on_leave_today > leave.on_leave_today_list.length ? (
                      <p className="mt-2 text-xs text-slate-500">+{leave.on_leave_today - leave.on_leave_today_list.length} more</p>
                    ) : null}
                  </>
                )}
              </Panel>
            </div>

            {/* Attendance by department */}
            <Panel title="Today's Attendance by Department" link={`${base}/biometric/daily`} linkLabel="details">
              {loading ? <Muted>Loading…</Muted> : !attendance?.available ? (
                <Muted>Biometric data is not available right now.</Muted>
              ) : (
                <>
                  {attendance.off_day ? (
                    <p className="mb-3 text-sm text-slate-600">Today is a holiday / weekly off ({attendance.off_day}), so missing punches are not counted.</p>
                  ) : null}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                          <th className="py-2 pr-4">Department</th>
                          <th className="py-2 pr-4 text-right">Staff</th>
                          <th className="py-2 pr-4 text-right">Present</th>
                          <th className="py-2 pr-4 text-right">On Leave</th>
                          <th className="py-2 pr-4 text-right">Missing</th>
                          <th className="py-2 min-w-[160px]">Present %</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {pagedAttendanceRows.map((d) => {
                          const pct = d.expected ? Math.round((d.present / d.expected) * 100) : 0;
                          return (
                            <tr key={d.department}>
                              <td className="py-2 pr-4 font-medium text-slate-800">{d.department}</td>
                              <td className="py-2 pr-4 text-right tabular-nums">{d.expected}</td>
                              <td className="py-2 pr-4 text-right tabular-nums text-green-700">{d.present}</td>
                              <td className="py-2 pr-4 text-right tabular-nums text-yellow-700">{d.on_leave}</td>
                              <td className={`py-2 pr-4 text-right tabular-nums ${d.missing ? 'font-semibold text-red-700' : 'text-slate-500'}`}>{d.missing ?? '--'}</td>
                              <td className="py-2">
                                <div className="flex items-center gap-2">
                                  <div className="h-2 flex-1 rounded-full bg-slate-100">
                                    <div className="h-2 rounded-full bg-green-500" style={{ width: `${pct}%` }} />
                                  </div>
                                  <span className="w-10 text-right text-xs tabular-nums text-slate-500">{pct}%</span>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {attendancePages > 1 ? (
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
                      <span>
                        Showing {(currentAttendancePage - 1) * ATTENDANCE_PAGE_SIZE + 1}–
                        {Math.min(currentAttendancePage * ATTENDANCE_PAGE_SIZE, attendanceRows.length)} of {attendanceRows.length} departments
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="rounded border border-slate-300 bg-white px-3 py-1 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                          onClick={() => setAttendancePage(Math.max(1, currentAttendancePage - 1))}
                          disabled={currentAttendancePage === 1}
                        >
                          Prev
                        </button>
                        <span>Page {currentAttendancePage} of {attendancePages}</span>
                        <button
                          type="button"
                          className="rounded border border-slate-300 bg-white px-3 py-1 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                          onClick={() => setAttendancePage(Math.min(attendancePages, currentAttendancePage + 1))}
                          disabled={currentAttendancePage === attendancePages}
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  ) : null}
                  <p className="mt-3 text-xs text-slate-500">
                    Confirmed, probationary, contractual and temporary staff, grouped by their current department. Sorted by most missing punches.
                  </p>
                </>
              )}
            </Panel>

            {/* Staff composition */}
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
              <div className="xl:col-span-2">
                <Panel title="Staff by Department" link={`${base}/staff`}>
                  {loading ? <Muted>Loading…</Muted> : deptRows.length === 0 ? <Muted>No staff found.</Muted> : <StaffByDepartmentChart rows={deptRows} />}
                </Panel>
              </div>
              <Panel title="Teaching Staff by Designation" link={`${base}/staff`}>
                {loading ? <Muted>Loading…</Muted> : designationRows.length === 0 ? <Muted>No teaching staff found.</Muted> : <DoughnutChart rows={designationRows} />}
              </Panel>
            </div>

            {/* Faculty recruitment */}
            <Panel title="Faculty Recruitment">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatTile
                  label="Associate Professor Applications"
                  value={show(recruitment.associate_professor?.total)}
                  tone="purple"
                  to={`${base}/faculty-recruitment/associate-professor`}
                />
                <StatTile
                  label="Eligible (Assoc. Prof.)"
                  value={show(recruitment.associate_professor?.eligible)}
                  tone="green"
                  to={`${base}/faculty-recruitment/associate-professor`}
                />
                <StatTile
                  label="Professor Applications"
                  value={show(recruitment.professor?.total)}
                  tone="purple"
                  to={`${base}/faculty-recruitment/professor`}
                />
                <StatTile
                  label="Eligible (Professor)"
                  value={show(recruitment.professor?.eligible)}
                  tone="green"
                  to={`${base}/faculty-recruitment/professor`}
                />
              </div>
            </Panel>
          </div>
        </main>
      </div>
    </div>
  );
}
