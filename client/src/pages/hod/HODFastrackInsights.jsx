import { useEffect, useMemo, useState } from 'react';

import Notification from '../../components/common/Notification';
import Header from '../../components/layout/Header';
import SidebarHOD from '../../components/layout/SidebarHOD';
import { getHodFastrackManagement } from '../../api/examSectionApi';
import { Pagination, staffName, usePagedRows } from '../../components/fastrack/fastrackUi';

export default function HODFastrackInsightsPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });

  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: '' }), 4000);
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await getHodFastrackManagement();
        setRows(Array.isArray(res?.data) ? res.data : []);
      } catch (e) {
        showNotification(e?.response?.data?.message || e.message || 'Failed to load data', 'error');
      }
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => [r.course_code, r.course_name, r.course_type, staffName(r.assignedStaff)]
      .some((v) => String(v || '').toLowerCase().includes(q)));
  }, [rows, search]);

  useEffect(() => { setPage(1); }, [search]);

  const { pageRows, totalPages, offset, page: currentPage } = usePagedRows(filtered, page);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <Header />
      <div className="flex flex-1 min-h-0">
        <SidebarHOD />
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-full mx-auto">
            <Notification show={notification.show} message={notification.message} type={notification.type} onClose={() => setNotification({ show: false, message: '', type: '' })} />
            <h1 className="mb-6 text-2xl font-medium text-blue-600">Welcome HOD</h1>

            <div className="mb-10 bg-white shadow-xl rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 flex flex-wrap gap-4 items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-800">Fastrack Courses Management</h2>
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..."
                  className="w-full sm:w-64 py-2 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 whitespace-nowrap">
                  <thead className="bg-gray-50">
                    <tr>
                      {['S.no', 'Course Code', 'Course Name', 'Course Type', 'Staff', 'Non-Teaching Staff', 'Classes Conducted', 'Labs Conducted', 'Amount'].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {loading ? (
                      <tr><td colSpan="9" className="px-6 py-12 text-center text-gray-500">Loading...</td></tr>
                    ) : pageRows.length === 0 ? (
                      <tr><td colSpan="9" className="px-6 py-12 text-center text-gray-500">No data available in table</td></tr>
                    ) : (
                      pageRows.map((row, idx) => (
                        // One row per (course, staff record), so the course id alone is not unique
                        <tr key={`${row.id}-${row.staff_record_id ?? 'none'}`} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 text-sm text-gray-700`}>
                          <td className="px-4 py-3 border">{offset + idx + 1}</td>
                          <td className="px-4 py-3 border">{row.course_code}</td>
                          <td className="px-4 py-3 border">{row.course_name}</td>
                          <td className="px-4 py-3 border">{row.course_type ? row.course_type.toUpperCase() : ''}</td>
                          <td className="px-4 py-3 border">{staffName(row.assignedStaff) || '--NA--'}</td>
                          <td className="px-4 py-3 border">
                            <div>{staffName(row.instructorForeman) || '--NA--'}</div>
                            <div>{staffName(row.peonAttender) || '--NA--'}</div>
                          </td>
                          <td className="px-4 py-3 border">{row.classes_conducted ?? '--NA--'}</td>
                          <td className="px-4 py-3 border">{row.labs_conducted ?? '--NA--'}</td>
                          <td className="px-4 py-3 border">{row.amount ?? '--NA--'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {!loading && <Pagination page={currentPage} totalPages={totalPages} total={filtered.length} onChange={setPage} />}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
