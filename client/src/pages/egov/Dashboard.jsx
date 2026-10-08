import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import Header from '../../components/layout/Header';
import Sidebar from '../../components/layout/Sidebar';
import Notification from '../../components/common/Notification';
import { CountValue, EventsPanel, NoticesPanel, OverviewChart, statTone } from '../../components/dashboard/ActivityDashboardWidgets';
import { useAuth } from '../../context/AuthContext';
import { getEgovDashboard } from '../../api/egovApi';

// Mirrors resources/views/egov/dashboard.blade.php: a department welcome, the record totals
// per menu, Upcoming Events and the Notice Board. Laravel's "Overview" chart rendered fixed
// sample numbers from the theme's index-8.js; this one plots the department's real totals.

const GROUPED_CARDS = [
  {
    label: 'Professional Activity Teaching',
    short: 'PA Teaching',
    items: [
      { label: 'Attended', key: 'pa-attended-teaching', path: '/egov-admin/teaching/professional-activities/attended' },
      { label: 'Conducted', key: 'pa-conducted-teaching', path: '/egov-admin/teaching/professional-activities/conducted' },
    ],
  },
  {
    label: 'Professional Activity Non-Teaching',
    short: 'PA Non-Teaching',
    items: [
      { label: 'Attended', key: 'pa-attended-nonteaching', path: '/egov-admin/nonteaching/professional-activities/attended' },
      { label: 'Conducted', key: 'pa-conducted-nonteaching', path: '/egov-admin/nonteaching/professional-activities/conducted' },
    ],
  },
  {
    label: 'Conferences',
    short: 'Conferences',
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

export default function EgovDashboard() {
  const { token } = useAuth() || {};
  const [data, setData] = useState({ department: null, totals: {}, events: [], notices: [] });
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState({ show: false, message: '', type: 'info' });

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

  const chartSeries = useMemo(
    () => [
      ...GROUPED_CARDS.flatMap((group) =>
        group.items.map((item) => ({ label: `${group.short} ${item.label}`, value: data.totals[item.key] }))
      ),
      ...SINGLE_CARDS.map((card) => ({ label: card.label, value: data.totals[card.key] })),
    ],
    [data.totals]
  );

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
              {GROUPED_CARDS.map((group, groupIndex) => (
                <div key={group.label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-sm font-bold text-slate-700">{group.label}</p>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    {group.items.map((item) => (
                      <Link key={item.key} to={item.path} className={`rounded-lg border p-3 ${statTone(groupIndex)}`}>
                        <span className="block text-xs text-slate-500">{item.label}</span>
                        <CountValue value={data.totals[item.key]} loading={loading} />
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {SINGLE_CARDS.map((card, index) => (
                <Link
                  key={card.key}
                  to={card.path}
                  className={`rounded-xl border p-5 shadow-sm ${statTone(index + GROUPED_CARDS.length)}`}
                >
                  <span className="block text-sm font-bold text-slate-700">{card.label}</span>
                  <CountValue value={data.totals[card.key]} loading={loading} />
                </Link>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-4">
              <div className="xl:col-span-2">
                <OverviewChart series={chartSeries} loading={loading} />
              </div>
              <EventsPanel events={data.events} loading={loading} />
              <NoticesPanel notices={data.notices} loading={loading} />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
