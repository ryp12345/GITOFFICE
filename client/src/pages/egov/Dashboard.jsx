import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Chart from 'chart.js/auto';

import Header from '../../components/layout/Header';
import Sidebar from '../../components/layout/Sidebar';
import Notification from '../../components/common/Notification';
import { useAuth } from '../../context/AuthContext';
import { getEgovDashboard } from '../../api/egovApi';

// Mirrors resources/views/egov/dashboard.blade.php: a department welcome, the record totals
// per menu, Upcoming Events and the Notice Board. Laravel's "Overview" chart rendered fixed
// sample numbers from the theme's index-8.js; this one plots the department's real totals.

const GROUPED_CARDS = [
  {
    label: 'Professional Activity Teaching',
    items: [
      { label: 'Attended', key: 'pa-attended-teaching', path: '/egov-admin/teaching/professional-activities/attended' },
      { label: 'Conducted', key: 'pa-conducted-teaching', path: '/egov-admin/teaching/professional-activities/conducted' },
    ],
  },
  {
    label: 'Professional Activity Non-Teaching',
    items: [
      { label: 'Attended', key: 'pa-attended-nonteaching', path: '/egov-admin/nonteaching/professional-activities/attended' },
      { label: 'Conducted', key: 'pa-conducted-nonteaching', path: '/egov-admin/nonteaching/professional-activities/conducted' },
    ],
  },
  {
    label: 'Conferences',
    items: [
      { label: 'Attended', key: 'conference-attended', path: '/egov-admin/research/conference/attended' },
      { label: 'Conducted', key: 'conference-conducted', path: '/egov-admin/research/conference/conducted' },
    ],
  },
];

const SINGLE_CARDS = [
  { label: 'Publications', key: 'publication', path: '/egov-admin/research/publication' },
  { label: 'Funded Projects', key: 'funded-project', path: '/egov-admin/research/funded-project' },
  { label: 'Patents', key: 'patent', path: '/egov-admin/research/patents' },
  { label: 'Copyrights', key: 'copyright', path: '/egov-admin/research/copyrights' },
  { label: 'Achievements', key: 'achievement', path: '/egov-admin/research/achievements' },
];

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

function Count({ value, loading }) {
  return <span className="text-2xl font-semibold text-slate-900">{loading ? '—' : value ?? 0}</span>;
}

export default function EgovDashboard() {
  const { token } = useAuth() || {};
  const [data, setData] = useState({ department: null, totals: {}, events: [], notices: [] });
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState({ show: false, message: '', type: 'info' });
  const chartRef = useRef(null);
  const chartInstanceRef = useRef(null);

  useEffect(() => {
    let active = true;
    getEgovDashboard(token)
      .then((response) => {
        if (!active) return;
        const payload = response?.data?.data || {};
        setData({
          department: payload.department || null,
          totals: payload.totals || {},
          events: Array.isArray(payload.events) ? payload.events : [],
          notices: Array.isArray(payload.notices) ? payload.notices : [],
        });
      })
      .catch((error) => {
        if (!active) return;
        setNotification({
          show: true,
          message: error?.response?.data?.message || 'Failed to load the dashboard.',
          type: 'error',
        });
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [token]);

  useEffect(() => {
    if (loading || !chartRef.current) return undefined;

    const series = [
      ...GROUPED_CARDS.flatMap((group) =>
        group.items.map((item) => ({ label: `${group.label.replace('Professional Activity', 'PA')} ${item.label}`, key: item.key }))
      ),
      ...SINGLE_CARDS,
    ];

    chartInstanceRef.current?.destroy();
    chartInstanceRef.current = new Chart(chartRef.current.getContext('2d'), {
      type: 'bar',
      data: {
        labels: series.map((item) => item.label),
        datasets: [
          {
            label: 'Records',
            data: series.map((item) => data.totals[item.key] || 0),
            backgroundColor: '#3b82f6',
            borderRadius: 4,
          },
        ],
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
  }, [loading, data.totals]);

  const departmentName = data.department?.dept_name;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <Header />
      <div className="flex flex-1 min-h-0">
        <Sidebar />
        <main className="flex-1 overflow-auto p-6">
          <div className="mx-auto max-w-7xl space-y-6">
            <Notification
              show={notification.show}
              message={notification.message}
              type={notification.type}
              onClose={() => setNotification({ show: false, message: '', type: 'info' })}
            />

            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <h2 className="text-2xl font-semibold text-blue-700">
                Welcome E-Governance Admin{departmentName ? `, ${departmentName}` : ''}
              </h2>
              <span className="text-sm font-semibold text-blue-700">My Dashboard</span>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {GROUPED_CARDS.map((group) => (
                <div key={group.label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-sm font-bold text-slate-700">{group.label}</p>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    {group.items.map((item) => (
                      <Link key={item.key} to={item.path} className="rounded-lg bg-slate-50 p-3 hover:bg-blue-50">
                        <span className="block text-xs text-slate-500">{item.label}</span>
                        <Count value={data.totals[item.key]} loading={loading} />
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {SINGLE_CARDS.map((card) => (
                <Link
                  key={card.key}
                  to={card.path}
                  className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:border-blue-300"
                >
                  <span className="block text-sm font-bold text-slate-700">{card.label}</span>
                  <Count value={data.totals[card.key]} loading={loading} />
                </Link>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm xl:col-span-2">
                <h3 className="mb-4 text-lg font-semibold text-slate-900">Overview</h3>
                <div className="h-72">
                  <canvas ref={chartRef} />
                </div>
              </div>

              <div className="flex max-h-[450px] flex-col rounded-xl border border-slate-200 bg-white shadow-sm">
                <h3 className="border-b border-slate-200 px-5 py-4 text-lg font-semibold text-slate-900">Upcoming Events</h3>
                <ul className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
                  {!loading && data.events.length === 0 && <li className="text-sm text-slate-500">No events.</li>}
                  {data.events.map((event) => (
                    <li key={event.id} className="flex gap-4">
                      <div className="w-14 shrink-0 text-center text-sm font-semibold text-slate-700">{dayMonth(event.start_date)}</div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900">{event.event_name}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {timeOfDay(event.start_date)}
                          {event.organizers && (
                            <span className="ml-2 rounded bg-blue-100 px-1.5 py-0.5 text-blue-700">{event.organizers}</span>
                          )}
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

              <div className="flex max-h-[450px] flex-col rounded-xl border border-slate-200 bg-white shadow-sm">
                <h3 className="border-b border-slate-200 px-5 py-4 text-lg font-semibold text-slate-900">Notice Board</h3>
                <ul className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
                  {!loading && data.notices.length === 0 && <li className="text-sm text-slate-500">No notices.</li>}
                  {data.notices.map((notice) => (
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
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
