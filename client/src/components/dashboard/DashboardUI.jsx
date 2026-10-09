import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Chart from 'chart.js/auto';

// Building blocks shared by the Establishment and Super Admin dashboards.

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

export function formatDate(ymd, withYear = true) {
  if (!ymd) return '--';
  const [y, m, d] = String(ymd).slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return '--';
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', withYear
    ? { day: '2-digit', month: 'short', year: 'numeric' }
    : { day: '2-digit', month: 'short' });
}

export function StatTile({ label, value, sub, tone = 'blue', to }) {
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

export function Panel({ title, link, linkLabel = 'view all', children }) {
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

export function Muted({ children }) {
  return <p className="text-sm text-slate-500">{children}</p>;
}

export function Pager({ start, pageSize, total, current, pages, onPage, compact = false }) {
  if (pages <= 1) return null;
  const btn = compact
    ? 'rounded border border-slate-300 bg-white px-2 py-0.5 text-slate-700 hover:bg-slate-50 disabled:opacity-50'
    : 'rounded border border-slate-300 bg-white px-3 py-1 text-slate-700 hover:bg-slate-50 disabled:opacity-50';
  return (
    <div className={`flex flex-wrap items-center justify-between gap-2 text-slate-600 ${compact ? 'mt-2 border-t border-slate-100 pt-2 text-xs' : 'text-sm'}`}>
      <span>{compact ? '' : 'Showing '}{start + 1}–{Math.min(start + pageSize, total)} of {total}</span>
      <div className="flex items-center gap-1">
        <button type="button" className={btn} onClick={() => onPage(current - 1)} disabled={current === 1}>Prev</button>
        <span className="px-1">{compact ? `${current}/${pages}` : `Page ${current} of ${pages}`}</span>
        <button type="button" className={btn} onClick={() => onPage(current + 1)} disabled={current === pages}>Next</button>
      </div>
    </div>
  );
}

// Names and details wrap instead of being cut off, since the columns are narrow.
// Paginated so every person can be reached, not just the first page.
export function PeopleList({ rows, emptyText, pageSize = 5 }) {
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
      <Pager start={start} pageSize={pageSize} total={rows.length} current={current} pages={pages} onPage={setPage} compact />
    </>
  );
}

// Compact column heading with a coloured count.
const COUNT_PILL_TONES = {
  blue: 'bg-blue-100 text-blue-800',
  green: 'bg-green-100 text-green-800',
  purple: 'bg-purple-100 text-purple-800',
  red: 'bg-red-100 text-red-800',
  yellow: 'bg-yellow-100 text-yellow-800',
};

export function ColumnHeading({ title, count, sub, tone = 'blue' }) {
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

export function ChartCanvas({ config, height = 'h-72' }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    if (!canvasRef.current || !config) return undefined;
    const chart = new Chart(canvasRef.current.getContext('2d'), config);
    return () => chart.destroy();
  }, [config]);
  return <div className={height}><canvas ref={canvasRef} /></div>;
}

// rows: [{ label, count }]
export function doughnutConfig(rows) {
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

// rows: [{ department, teaching, non_teaching }]
export function staffByDepartmentConfig(rows) {
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
}

// Top designations plus an "Other" slice, so the doughnut stays readable.
export function designationConfig(rows, top = 6) {
  const head = rows.slice(0, top).map((r) => ({ label: r.designation, count: r.count }));
  const rest = rows.slice(top).reduce((sum, r) => sum + r.count, 0);
  return doughnutConfig(rest ? [...head, { label: 'Other', count: rest }] : head);
}
