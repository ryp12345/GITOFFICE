import { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';

// Panels shared by the e-Governance and Dean R&D dashboards, which Laravel built from the
// same blade blocks: Upcoming Events, Notice Board and an Overview bar chart.

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function dayMonth(value) {
  if (!value) return '-';
  const date = new Date(value.length === 10 ? `${value}T00:00:00` : value);
  if (Number.isNaN(date.getTime())) return '-';
  return `${String(date.getDate()).padStart(2, '0')} ${MONTHS[date.getMonth()]}`;
}

function timeOfDay(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function CountValue({ value, loading, format = (v) => v }) {
  return <span className="text-2xl font-semibold text-slate-900">{loading ? '—' : format(value ?? 0)}</span>;
}

// series: [{ label, value }]
export function OverviewChart({ series, loading, title = 'Overview' }) {
  const chartRef = useRef(null);
  const chartInstanceRef = useRef(null);

  useEffect(() => {
    if (loading || !chartRef.current) return undefined;

    chartInstanceRef.current?.destroy();
    chartInstanceRef.current = new Chart(chartRef.current.getContext('2d'), {
      type: 'bar',
      data: {
        labels: series.map((item) => item.label),
        datasets: [{ label: 'Records', data: series.map((item) => item.value || 0), backgroundColor: '#3b82f6', borderRadius: 4 }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: '#374151', autoSkip: false, maxRotation: 45, minRotation: 0 } },
          y: { beginAtZero: true, ticks: { precision: 0, color: '#374151' } },
        },
      },
    });

    return () => {
      chartInstanceRef.current?.destroy();
      chartInstanceRef.current = null;
    };
  }, [loading, series]);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-semibold text-slate-900">{title}</h3>
      <div className="h-72">
        <canvas ref={chartRef} />
      </div>
    </div>
  );
}

export function EventsPanel({ events, loading }) {
  return (
    <div className="flex max-h-[450px] flex-col rounded-xl border border-slate-200 bg-white shadow-sm">
      <h3 className="border-b border-slate-200 px-5 py-4 text-lg font-semibold text-slate-900">Upcoming Events</h3>
      <ul className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
        {!loading && events.length === 0 && <li className="text-sm text-slate-500">No events.</li>}
        {events.map((event) => (
          <li key={event.id} className="flex gap-4">
            <div className="w-14 shrink-0 text-center text-sm font-semibold text-slate-700">{dayMonth(event.start_date)}</div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900">{event.event_name}</p>
              <p className="mt-1 text-xs text-slate-500">
                {timeOfDay(event.start_date)}
                {event.organizers && <span className="ml-2 rounded bg-blue-100 px-1.5 py-0.5 text-blue-700">{event.organizers}</span>}
              </p>
              {event.location && (
                <p className="mt-1 text-xs text-slate-700">
                  <span className="text-green-600">Location:</span> {event.location}
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function NoticesPanel({ notices, loading }) {
  return (
    <div className="flex max-h-[450px] flex-col rounded-xl border border-slate-200 bg-white shadow-sm">
      <h3 className="border-b border-slate-200 px-5 py-4 text-lg font-semibold text-slate-900">Notice Board</h3>
      <ul className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
        {!loading && notices.length === 0 && <li className="text-sm text-slate-500">No notices.</li>}
        {notices.map((notice) => (
          <li key={notice.id} className="flex gap-3">
            <div className="h-fit shrink-0 rounded bg-blue-100 px-2 py-1.5 text-center text-xs font-medium text-blue-700">
              {dayMonth(notice.date)}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900">{notice.title}</p>
              <p className="text-xs text-slate-500">{notice.description}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
