
import { useEffect, useMemo, useRef, useState } from 'react';
import Header from '../../components/layout/Header';
import SidebarExamSection from '../../components/layout/SidebarExamSection';
import api from '../../api/axios';
import { getExamSectionDashboard } from '../../api/examSectionApi';
import Chart from 'chart.js/auto';

export default function ExamSectionDashboard() {
  const [stats, setStats] = useState({
    ft_instance_count: null,
    ft_courses_count: null,
    ft_scheme_count: null,
    fastrack_expense_total: null,
  });
  const [expenses, setExpenses] = useState([]);
  const [courseTypes, setCourseTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const chartRef = useRef(null);
  const chartInstanceRef = useRef(null);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        setLoading(true);
        const res = await getExamSectionDashboard();
        const data = res?.data?.data || res?.data || res;

        setStats({
          ft_instance_count: data.ft_instance_count ?? 0,
          ft_courses_count: data.ft_courses_count ?? 0,
          ft_scheme_count: data.ft_scheme_count ?? 0,
          fastrack_expense_total: data.fastrack_expense_total ?? 0,
        });
        setExpenses(Array.isArray(data.expenses) ? data.expenses : []);
        setCourseTypes(Array.isArray(data.ft_course_statistic) ? data.ft_course_statistic : []);
      } catch (err) {
        setError(err?.response?.data?.message || 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    }

    fetchDashboard();
  }, []);

  const groupedExpenses = useMemo(() => {
    const groups = {};
    expenses.forEach((exp) => {
      const key = exp.ft_instance_name || 'Unknown';
      if (!groups[key]) groups[key] = [];
      groups[key].push(exp);
    });
    return groups;
  }, [expenses]);

  useEffect(() => {
    if (!chartRef.current) return;
    const ctx = chartRef.current.getContext('2d');

    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
      chartInstanceRef.current = null;
    }

    const labels = Object.keys(groupedExpenses);
    const datasets = labels.map((label, idx) => {
      const records = groupedExpenses[label];
      const total = records.reduce((sum, r) => sum + (Number(r.total_amount) || 0), 0);
      return total;
    });

    const backgroundColors = [
      '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
      '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#06b6d4',
    ];

    chartInstanceRef.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Total Expense (₹)',
            data: datasets,
            backgroundColor: backgroundColors.slice(0, labels.length),
            borderColor: backgroundColors.slice(0, labels.length),
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => `₹${Number(ctx.parsed.y).toLocaleString('en-IN')}`,
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: (value) => `₹${Number(value).toLocaleString('en-IN')}`,
            },
          },
        },
      },
    });

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
    };
  }, [groupedExpenses]);

  const formatCurrency = (value) => {
    if (value == null) return '₹0';
    return `₹${Number(value).toLocaleString('en-IN')}`;
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <Header />
      <div className="flex flex-1 min-h-0">
        <SidebarExamSection />
        <main className="flex-1 overflow-auto p-6">
          <div className="min-h-full rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-semibold text-slate-900">Exam Section Dashboard</h2>

            {error && (
              <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            {/* Statistics Cards */}
            <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4">
              <div className="rounded-lg bg-blue-50 p-4 shadow flex flex-col items-center border border-blue-200">
                <span className="text-3xl font-bold text-blue-700">
                  {loading || stats.ft_instance_count === null ? '...' : stats.ft_instance_count}
                </span>
                <span className="mt-2 text-blue-900">Fastrack Instance</span>
                <a
                  href="/exam-section/fastrack-instance"
                  className="mt-1 font-semibold text-blue-600 hover:text-blue-700 truncate text-sm"
                >
                  view
                </a>
              </div>
              <div className="rounded-lg bg-green-50 p-4 shadow flex flex-col items-center border border-green-200">
                <span className="text-3xl font-bold text-green-700">
                  {loading || stats.ft_courses_count === null ? '...' : stats.ft_courses_count}
                </span>
                <span className="mt-2 text-green-900">Fastrack Courses</span>
                <a
                  href="/exam-section/fastrack"
                  className="mt-1 font-semibold text-blue-600 hover:text-blue-700 truncate text-sm"
                >
                  view
                </a>
              </div>
              <div className="rounded-lg bg-yellow-50 p-4 shadow flex flex-col items-center border border-yellow-200">
                <span className="text-3xl font-bold text-yellow-700">
                  {loading || stats.ft_scheme_count === null ? '...' : stats.ft_scheme_count}
                </span>
                <span className="mt-2 text-yellow-900">Scheme</span>
                <a
                  href="/exam-section/fastrack-scheme-config"
                  className="mt-1 font-semibold text-blue-600 hover:text-blue-700 truncate text-sm"
                >
                  view
                </a>
              </div>
              <div className="rounded-lg bg-purple-50 p-4 shadow flex flex-col items-center border border-purple-200">
                <span className="text-3xl font-bold text-purple-700">
                  {loading || stats.fastrack_expense_total === null ? '...' : formatCurrency(stats.fastrack_expense_total)}
                </span>
                <span className="mt-2 text-purple-900">Fastrack Expenses</span>
                <a
                  href="/exam-section/fastrack-expenses"
                  className="mt-1 font-semibold text-blue-600 hover:text-blue-700 truncate text-sm"
                >
                  view
                </a>
              </div>
            </div>

            {/* Chart and Table Row */}
            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Expenses Chart */}
              <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-slate-900">Fastrack Expenses</h3>
                  <select
                    className="border px-3 py-1 rounded text-sm"
                    value=""
                    onChange={(e) => {
                      const slug = e.target.value;
                      if (!slug) return;
                      const el = document.getElementById('ft_expense_chart');
                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }}
                  >
                    <option value="">All Instances</option>
                    {Object.keys(groupedExpenses).map((name) => (
                      <option key={name} value={name.toLowerCase().replace(/\s+/g, '_')}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>
                <div id="ft_expense_chart" style={{ width: '100%', height: '550px' }}>
                  {!loading && expenses.length === 0 && (
                    <p className="text-center text-slate-500 mt-20">No expense data available</p>
                  )}
                  <canvas ref={chartRef} style={{ display: expenses.length > 0 ? 'block' : 'none' }} />
                </div>
              </div>

              {/* Course Type and Remuneration Table */}
              <div className="lg:col-span-1 bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Course Type and Remuneration</h3>
                <div className="overflow-x-auto" style={{ maxHeight: '400px' }}>
                  <table className="w-full table-auto border border-gray-300 text-sm">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="border px-4 py-2 text-left">Course Type</th>
                        <th className="border px-4 py-2 text-left">Remuneration</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan={2} className="p-4 text-center">Loading...</td>
                        </tr>
                      ) : courseTypes.length === 0 ? (
                        <tr>
                          <td colSpan={2} className="p-4 text-center">No data available</td>
                        </tr>
                      ) : (
                        courseTypes.map((ct, idx) => (
                          <tr key={idx}>
                            <td className="border px-4 py-2">
                              {ct.course_type || 'N/A'}
                            </td>
                            <td className="border px-4 py-2">
                              <span
                                className={
                                  ct.Is_Remunerated === 'No'
                                    ? 'text-red-600 font-semibold'
                                    : ct.Is_Remunerated === 'Yes'
                                    ? 'text-green-600 font-semibold'
                                    : ''
                                }
                              >
                                {ct.Is_Remunerated || 'N/A'}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
