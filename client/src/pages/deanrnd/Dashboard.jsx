import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import Header from '../../components/layout/Header';
import Sidebar from '../../components/layout/Sidebar';
import Notification from '../../components/common/Notification';
import { CountValue, EventsPanel, NoticesPanel, OverviewChart, statTone } from '../../components/dashboard/ActivityDashboardWidgets';
import { useAuth } from '../../context/AuthContext';
import { getDeanRndDashboard } from '../../api/deanrndApi';

// Mirrors resources/views/Deanrnd/dashboard.blade.php: the five institution-wide summary
// cards, Upcoming Events and Notice Board, the record totals per menu, and the PhD
// "Scholars" / "Research Scholars" lists. Laravel's "Sales Overview" chart and "Employee
// Salary Details" table were theme demo content with fixed sample data, so the chart here
// plots the real totals and the demo table is left out.

const SUMMARY_CARDS = [
  { label: 'Scholars', key: 'scholars', hint: 'PhD completed' },
  { label: 'Research Scholars', key: 'researchScholars', hint: 'PhD pursuing' },
  { label: 'Research Activities', key: 'researchActivities', hint: 'All research records' },
  { label: 'GIT Events', key: 'gitSponsoredEvents', hint: 'Sponsored by KLS GIT' },
  { label: 'Fund Received', key: 'fundsReceived', hint: 'Funded projects', currency: true },
];

const GROUPED_CARDS = [
  {
    label: 'Professional Activity Teaching',
    short: 'PA Teaching',
    items: [
      { label: 'Attended', key: 'pa-attended-teaching', path: '/dean-rnd/teaching/professional-activities/attended' },
      { label: 'Conducted', key: 'pa-conducted-teaching', path: '/dean-rnd/teaching/professional-activities/conducted' },
    ],
  },
  {
    label: 'Professional Activity Non-Teaching',
    short: 'PA Non-Teaching',
    items: [
      { label: 'Attended', key: 'pa-attended-nonteaching', path: '/dean-rnd/nonteaching/professional-activities/attended' },
      { label: 'Conducted', key: 'pa-conducted-nonteaching', path: '/dean-rnd/nonteaching/professional-activities/conducted' },
    ],
  },
  {
    label: 'Conferences',
    short: 'Conferences',
    items: [
      { label: 'Attended', key: 'conference-attended', path: '/dean-rnd/research/conference/attended' },
      { label: 'Conducted', key: 'conference-conducted', path: '/dean-rnd/research/conference/conducted' },
    ],
  },
];

const SINGLE_CARDS = [
  { label: 'Publications', key: 'publication', path: '/dean-rnd/research/publication' },
  { label: 'Funded Projects', key: 'funded-project', path: '/dean-rnd/research/funded-project' },
  { label: 'Patents', key: 'patent', path: '/dean-rnd/research/patents' },
  { label: 'Copyrights', key: 'copyright', path: '/dean-rnd/research/copyrights' },
  { label: 'Achievements', key: 'achievement', path: '/dean-rnd/research/achievements' },
  { label: 'Book Chapters', key: 'book-chapter', path: '/dean-rnd/research/book-chapters' },
  { label: 'Consultancy', key: 'consultancy', path: '/dean-rnd/research/consultancy' },
  { label: 'Reviewer Editor', key: 'reviewer-editor', path: '/dean-rnd/research/reviewer-editor' },
];

const formatRupees = (value) =>
  `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

function staffName(row) {
  return [row.fname, row.mname, row.lname].filter(Boolean).join(' ') || '-';
}

function ScholarsTable({ title, rows, status, loading }) {
  return (
    <div className="flex max-h-[450px] flex-col rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
        <h3 className="text-lg font-semibold uppercase text-slate-900">{title}</h3>
        <span className="text-sm text-slate-500">{loading ? '' : rows.length}</span>
      </div>
      <div className="flex-1 overflow-y-auto">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="sticky top-0 bg-slate-50">
            <tr>
              <th className="px-5 py-3 text-left font-medium text-slate-600">S.no</th>
              <th className="px-5 py-3 text-left font-medium text-slate-600">Employee</th>
              <th className="px-5 py-3 text-left font-medium text-slate-600">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={3} className="px-5 py-8 text-center text-slate-500">Loading...</td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-5 py-8 text-center text-slate-500">No records.</td>
              </tr>
            ) : (
              rows.map((row, index) => (
                <tr key={row.staff_id}>
                  <td className="px-5 py-2.5 text-slate-700">{index + 1}</td>
                  <td className="px-5 py-2.5 font-medium text-slate-900">{staffName(row)}</td>
                  <td className="px-5 py-2.5">
                    <span className="rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-700">PhD</span>{' '}
                    <span className="text-xs text-slate-600">{status}</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function DeanRndDashboard() {
  const { token } = useAuth() || {};
  const [data, setData] = useState({ summary: {}, totals: {}, phdCompleted: [], phdPursuing: [], events: [], notices: [] });
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState({ show: false, message: '', type: 'info' });

  useEffect(() => {
    let active = true;
    getDeanRndDashboard(token)
      .then((response) => {
        if (!active) return;
        const payload = response?.data?.data || {};
        setData({
          summary: payload.summary || {},
          totals: payload.totals || {},
          phdCompleted: Array.isArray(payload.phdCompleted) ? payload.phdCompleted : [],
          phdPursuing: Array.isArray(payload.phdPursuing) ? payload.phdPursuing : [],
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
              <h2 className="text-2xl font-semibold text-blue-700">Welcome Dean R&amp;D</h2>
              <span className="text-sm font-semibold text-blue-700">My Dashboard</span>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {SUMMARY_CARDS.map((card, index) => (
                <div key={card.key} className={`rounded-xl border p-5 shadow-sm ${statTone(index)}`}>
                  <span className="block text-sm font-bold text-slate-700">{card.label}</span>
                  <CountValue
                    value={data.summary[card.key]}
                    loading={loading}
                    format={card.currency ? formatRupees : undefined}
                  />
                  <span className="mt-1 block text-xs text-slate-500">{card.hint}</span>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-4">
              <div className="xl:col-span-2">
                <OverviewChart series={chartSeries} loading={loading} />
              </div>
              <EventsPanel events={data.events} loading={loading} />
              <NoticesPanel notices={data.notices} loading={loading} />
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

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
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

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <ScholarsTable title="Scholars" rows={data.phdCompleted} status="Completed" loading={loading} />
              <ScholarsTable title="Research Scholars" rows={data.phdPursuing} status="Pursuing" loading={loading} />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
