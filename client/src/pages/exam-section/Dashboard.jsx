import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Chart from 'chart.js/auto';
import Header from '../../components/layout/Header';
import SidebarExamSection from '../../components/layout/SidebarExamSection';
import { getExamSectionDashboard } from '../../api/examSectionApi';
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

const INSTANCE_STATUS_STYLES = {
  Upcoming: 'bg-blue-100 text-blue-800',
  Ongoing: 'bg-green-100 text-green-800',
  Completed: 'bg-slate-100 text-slate-700',
};

const ALL_YEARS = 'all';

function formatCurrency(value) {
  return `₹${Number(value || 0).toLocaleString('en-IN')}`;
}

function formatDate(ymd) {
  if (!ymd) return '--';
  const [y, m, d] = String(ymd).slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return '--';
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function todayYmd() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function instanceStatus(instance, today) {
  if (instance.start_date && today < instance.start_date) return 'Upcoming';
  if (instance.end_date && today > instance.end_date) return 'Completed';
  return 'Ongoing';
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

function Panel({ title, link, linkLabel = 'view all', action, children }) {
  return (
    <div className="h-full rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        <div className="flex items-center gap-3">
          {action}
          {link ? <Link to={link} className="text-sm text-blue-600 hover:underline">{linkLabel}</Link> : null}
        </div>
      </div>
      {children}
    </div>
  );
}

function Muted({ children }) {
  return <p className="text-sm text-slate-500">{children}</p>;
}

const identity = (v) => v;

function BarChart({ labels, values, color = '#3b82f6', horizontal = false, formatValue = identity, height = 'h-72' }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || labels.length === 0) return undefined;
    const valueAxis = {
      beginAtZero: true,
      ticks: { precision: 0, callback: (v) => formatValue(v) },
    };
    const chart = new Chart(canvasRef.current.getContext('2d'), {
      type: 'bar',
      data: { labels, datasets: [{ data: values, backgroundColor: color, borderRadius: 4 }] },
      options: {
        indexAxis: horizontal ? 'y' : 'x',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: (ctx) => formatValue(horizontal ? ctx.parsed.x : ctx.parsed.y) } },
        },
        scales: horizontal ? { x: valueAxis } : { y: valueAxis },
      },
    });
    return () => chart.destroy();
  }, [labels, values, color, horizontal, formatValue]);

  return <div className={height}><canvas ref={canvasRef} /></div>;
}

export default function ExamSectionDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // One academic-year filter drives every section; the server applies it to all queries.
  const [academicYear, setAcademicYear] = useState(ALL_YEARS);
  const [academicYears, setAcademicYears] = useState([]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    getExamSectionDashboard(academicYear === ALL_YEARS ? {} : { academic_year: academicYear })
      .then((res) => {
        if (!active) return;
        const payload = res?.data || res || {};
        setData(payload);
        if (Array.isArray(payload.academic_years)) setAcademicYears(payload.academic_years);
      })
      .catch((err) => {
        if (active) setError(getErrorMessage(err, 'Failed to load dashboard data'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [academicYear]);

  const claims = data?.claim_status || {};
  const instances = useMemo(() => (Array.isArray(data?.instances) ? data.instances : []), [data]);
  const expenses = useMemo(() => (Array.isArray(data?.expenses) ? data.expenses : []), [data]);
  const courseTypes = Array.isArray(data?.ft_course_statistic) ? data.ft_course_statistic : [];
  const coursesByDept = useMemo(() => (Array.isArray(data?.courses_by_department) ? data.courses_by_department : []), [data]);

  // Expense totals per head (already filtered to the selected year by the server).
  const expenseChart = useMemo(() => ({
    labels: expenses.map((e) => e.title || 'Unknown'),
    values: expenses.map((e) => Number(e.total_amount) || 0),
    total: expenses.reduce((sum, e) => sum + (Number(e.total_amount) || 0), 0),
  }), [expenses]);

  const yearLabel = academicYear === ALL_YEARS ? 'all academic years' : academicYear;

  const deptChart = useMemo(() => ({
    labels: coursesByDept.map((d) => d.department),
    values: coursesByDept.map((d) => d.courses),
  }), [coursesByDept]);

  const today = todayYmd();
  const ongoingCount = instances.filter((i) => instanceStatus(i, today) === 'Ongoing').length;
  const show = (value, format = (v) => v) => (loading ? '…' : data ? format(value ?? 0) : '--');

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <Header />
      <div className="flex flex-1 min-h-0">
        <SidebarExamSection />
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-slate-900">Exam Section Dashboard</h2>
                <p className="mt-1 text-slate-600">Fastrack instances, courses, staff claims and finances for {yearLabel}.</p>
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <span className="font-medium">Academic Year</span>
                <select
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  disabled={loading && academicYears.length === 0}
                >
                  <option value={ALL_YEARS}>All years</option>
                  {academicYears.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </label>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">{error}</div>
            )}

            {/* Headline numbers */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              <StatTile
                label="Fastrack Instances"
                value={show(data?.ft_instance_count)}
                sub={data && !loading ? `${ongoingCount} ongoing` : null}
                tone="blue"
                to="/exam-section/fastrack-instance"
              />
              <StatTile label="Fastrack Courses" value={show(data?.ft_courses_count)} tone="green" to="/exam-section/fastrack" />
              <StatTile
                label="Schemes"
                value={show(data?.ft_scheme_count)}
                sub={data && !loading
                  ? `${data.ft_active_scheme_count ?? 0} active${academicYear !== ALL_YEARS ? ' · all years' : ''}`
                  : null}
                tone="yellow"
                to="/exam-section/fastrack-scheme-config"
              />
              <StatTile label="Fees Collected" value={show(data?.fees_collected_total, formatCurrency)} tone="purple" to="/exam-section/fastrack-instance" />
              <StatTile label="Fastrack Expenses" value={show(data?.fastrack_expense_total, formatCurrency)} tone="red" to="/exam-section/fastrack-expenses" />
            </div>

            {/* Staff claim workflow */}
            <Panel title="Staff Claims" link="/exam-section/fastrack-insights" linkLabel="insights">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatTile label="Pending Verification" value={show(claims.pending)} sub="awaiting coordinator" tone={claims.pending ? 'yellow' : 'green'} />
                <StatTile label="Awaiting HOD Approval" value={show(claims.verified)} sub="verified by coordinator" tone={claims.verified ? 'yellow' : 'green'} />
                <StatTile label="Approved" value={show(claims.approved)} sub="ready for remuneration" tone="green" />
                <StatTile label="Courses Without Claim" value={show(claims.courses_without_claim)} sub="no staff submission yet" tone={claims.courses_without_claim ? 'red' : 'green'} to="/exam-section/fastrack" />
              </div>
            </Panel>

            {/* Instances */}
            <Panel title="Fastrack Instances" link="/exam-section/fastrack-instance">
              {loading ? <Muted>Loading…</Muted> : instances.length === 0 ? <Muted>No instances configured.</Muted> : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        <th className="py-2 pr-4">Instance</th>
                        <th className="py-2 pr-4">Dates</th>
                        <th className="py-2 pr-4">Status</th>
                        <th className="py-2 pr-4 text-right">Courses</th>
                        <th className="py-2 pr-4 text-right">Students</th>
                        <th className="py-2 pr-4 text-right">Fees</th>
                        <th className="py-2 min-w-[150px]">Claims approved</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {instances.map((i) => {
                        const status = instanceStatus(i, today);
                        const pct = i.claims ? Math.round((i.approved / i.claims) * 100) : 0;
                        return (
                          <tr key={i.id} className="align-top">
                            <td className="py-2 pr-4">
                              <p className="font-medium text-slate-800">{i.ft_instance_name}</p>
                              <p className="text-xs text-slate-500">{[i.academic_year, i.scheme_name].filter(Boolean).join(' · ')}</p>
                            </td>
                            <td className="py-2 pr-4 whitespace-nowrap text-slate-700">{formatDate(i.start_date)} – {formatDate(i.end_date)}</td>
                            <td className="py-2 pr-4">
                              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${INSTANCE_STATUS_STYLES[status]}`}>{status}</span>
                            </td>
                            <td className="py-2 pr-4 text-right tabular-nums">{i.courses}</td>
                            <td className="py-2 pr-4 text-right tabular-nums">{i.students}</td>
                            <td className="py-2 pr-4 text-right tabular-nums whitespace-nowrap">{formatCurrency(i.total_fees_collected)}</td>
                            <td className="py-2">
                              {i.claims ? (
                                <>
                                  <div className="h-2 w-full rounded-full bg-slate-100">
                                    <div className="h-2 rounded-full bg-green-500" style={{ width: `${pct}%` }} />
                                  </div>
                                  <p className="mt-1 text-xs text-slate-500">{i.approved} of {i.claims} ({pct}%)</p>
                                </>
                              ) : <span className="text-xs text-slate-400">No claims yet</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>

            {/* Expenses & course types */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <Panel title="Expenses by Head" link="/exam-section/fastrack-expenses">
                  {loading ? <Muted>Loading…</Muted> : expenseChart.labels.length === 0 ? <Muted>No expense data available.</Muted> : (
                    <>
                      <p className="mb-3 text-sm text-slate-600">
                        Total: <span className="font-semibold text-slate-900">{formatCurrency(expenseChart.total)}</span>
                        {academicYear !== ALL_YEARS ? ` in ${academicYear}` : ''}
                      </p>
                      <BarChart labels={expenseChart.labels} values={expenseChart.values} formatValue={formatCurrency} />
                    </>
                  )}
                </Panel>
              </div>

              <Panel title="Course Types & Remuneration" link="/exam-section/fastcourse-setup">
                {loading ? <Muted>Loading…</Muted> : courseTypes.length === 0 ? <Muted>No course types configured.</Muted> : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        <th className="py-2 pr-2">Course Type</th>
                        <th className="py-2 pr-2 text-right">Courses</th>
                        <th className="py-2 text-right">Paid</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {courseTypes.map((ct) => {
                        const paid = String(ct.is_remunerated || '').toLowerCase() === 'yes';
                        return (
                          <tr key={ct.id}>
                            <td className="py-2 pr-2 capitalize text-slate-800">{ct.course_type || 'N/A'}</td>
                            <td className="py-2 pr-2 text-right tabular-nums">{ct.courses ?? 0}</td>
                            <td className="py-2 text-right">
                              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${paid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                {ct.is_remunerated || 'N/A'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                      {data?.untyped_courses ? (
                        <tr>
                          <td className="py-2 pr-2 text-amber-700">Type not set</td>
                          <td className="py-2 pr-2 text-right tabular-nums text-amber-700">{data.untyped_courses}</td>
                          <td className="py-2 text-right text-xs text-slate-400">—</td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                )}
              </Panel>
            </div>

            {/* Courses by department */}
            <Panel title="Courses by Department" link="/exam-section/fastrack-insights" linkLabel="insights">
              {loading ? <Muted>Loading…</Muted> : deptChart.labels.length === 0 ? <Muted>No courses configured.</Muted> : (
                <BarChart labels={deptChart.labels} values={deptChart.values} color="#10b981" />
              )}
            </Panel>
          </div>
        </main>
      </div>
    </div>
  );
}
