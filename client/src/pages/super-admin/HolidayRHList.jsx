import { useEffect, useMemo, useState } from 'react';
import Notification from '../../components/common/Notification';
import Header from '../../components/layout/Header';
import Sidebar from '../../components/layout/Sidebar';
import { useAuth } from '../../context/AuthContext';
import { getHolidayRHList } from '../../api/holidayrhApi';

const PAGE_SIZE = 10;

export default function SuperAdminHolidayRHListPage() {
  const { token } = useAuth?.() || {};
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState('');
  const [yearFilter, setYearFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });

  const showNotification = (message, type = 'error') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: '' }), 4000);
  };

  const load = async () => {
    setLoading(true);
    try {
      const res = await getHolidayRHList(token);
      setRows(res.data?.data || []);
    } catch (error) {
      setRows([]);
      showNotification(error.response?.data?.message || error.message || 'Failed to load Holiday/RH list');
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [token]);

  const yearOptions = useMemo(() => {
    const years = [...new Set(rows.map((row) => String(row.year || '')).filter(Boolean))];
    return years.sort((a, b) => Number(b) - Number(a));
  }, [rows]);

  const filtered = useMemo(() => {
    const sorted = [...rows].sort((a, b) => {
      const aDate = a.start ? new Date(a.start).getTime() : 0;
      const bDate = b.start ? new Date(b.start).getTime() : 0;
      if (bDate !== aDate) return bDate - aDate;
      return (b.id || 0) - (a.id || 0);
    });

    const q = search.toLowerCase();
    return sorted.filter((row) => {
      const matchesYear = yearFilter === 'all' || String(row.year) === yearFilter;
      const matchesSearch =
        String(row.year || '').toLowerCase().includes(q) ||
        String(row.title || '').toLowerCase().includes(q) ||
        String(row.day || '').toLowerCase().includes(q) ||
        String(row.type || '').toLowerCase().includes(q);

      return matchesYear && matchesSearch;
    });
  }, [rows, search, yearFilter]);

  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  useEffect(() => {
    setPage(1);
  }, [rows, search, yearFilter]);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <Header />
      <div className="flex flex-1 min-h-0">
        <Sidebar />
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto">
            <Notification
              show={notification.show}
              message={notification.message}
              type={notification.type}
              onClose={() => setNotification({ show: false, message: '', type: '' })}
            />

            <div className="mb-8">
              <h1 className="mb-2 text-3xl font-bold text-gray-900">Holiday And RH List</h1>
              <p className="text-base text-gray-600">View holiday and RH entries</p>
            </div>

            <div className="flex flex-col items-start justify-between gap-4 mb-6 sm:flex-row sm:items-center">
              <div className="relative w-full sm:w-72">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search holiday/RH..."
                  className="w-full py-2 pl-10 pr-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>

              <div className="w-full sm:w-48">
                <select
                  value={yearFilter}
                  onChange={(e) => setYearFilter(e.target.value)}
                  className="w-full py-2 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Years</option>
                  {yearOptions.map((year) => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mb-10 overflow-hidden bg-white shadow-xl rounded-xl">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-blue-600">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">S.NO</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Year</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Title</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Holiday RH Date</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Day</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Type</th>
                    </tr>
                  </thead>

                  <tbody className="bg-white divide-y divide-gray-200">
                    {loading ? (
                      <tr>
                        <td colSpan="6" className="px-6 py-12 text-center text-gray-500">Loading...</td>
                      </tr>
                    ) : filtered.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="px-6 py-12 text-center text-gray-500">No records found</td>
                      </tr>
                    ) : (
                      paginated.map((row, idx) => (
                        <tr key={row.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{(page - 1) * PAGE_SIZE + idx + 1}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{row.year}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.title}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                {row.start ? new Date(row.start).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{row.day}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                <span className={`px-3 py-1 text-xs font-medium rounded-full ${row.type === 'Holiday' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                                    {row.type}
                                </span>
                            </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {filtered.length > PAGE_SIZE && (
                <div className="flex justify-end items-center gap-2 px-6 pb-6 pt-4 border-t border-gray-200 bg-gray-50">
                  <button
                    className="px-3 py-1 rounded border border-gray-300 bg-white text-gray-700 disabled:opacity-50"
                    onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
                    disabled={page === 1}
                  >
                    Prev
                  </button>
                  <span className="text-sm text-gray-700">Page {page} of {Math.ceil(filtered.length / PAGE_SIZE)}</span>
                  <button
                    className="px-3 py-1 rounded border border-gray-300 bg-white text-gray-700 disabled:opacity-50"
                    onClick={() => setPage((currentPage) => Math.min(Math.ceil(filtered.length / PAGE_SIZE), currentPage + 1))}
                    disabled={page === Math.ceil(filtered.length / PAGE_SIZE)}
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
