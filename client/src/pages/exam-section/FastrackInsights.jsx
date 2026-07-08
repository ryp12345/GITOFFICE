import { useEffect, useMemo, useState } from 'react';
import Notification from '../../components/common/Notification';
import Header from '../../components/layout/Header';
import SidebarExamSection from '../../components/layout/SidebarExamSection';
import { getInsights } from '../../api/examSectionApi';

export default function FastrackInsightsPage() {
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });
  const [viewing, setViewing] = useState(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const PAGE_SIZE = 10;

  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: '' }), 4000);
  };

  const load = async () => {
    setLoading(true);
    try {
      const res = await getInsights();
      const data = res?.data?.data || res?.data || [];
      setInsights(Array.isArray(data) ? data : []);
    } catch (e) {
      showNotification(e.response?.data?.message || e.message || 'Failed to load insights', 'error');
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const staffNames = (staff = []) =>
    staff.map((s) => s.staff_name).filter((n) => n && n.trim()).join(', ') || '--NA--';

  const sumField = (staff = [], field) =>
    staff.reduce((acc, s) => acc + (parseInt(s[field], 10) || 0), 0);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return insights;
    return insights.filter((c) =>
      [c.course_code, c.course_name, c.course_type, c.dept_shortname, staffNames(c.staff)]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [insights, search]);

  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  useEffect(() => { setPage(1); }, [search]);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <Header />
      <div className="flex flex-1 min-h-0">
        <SidebarExamSection />
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto">
            <Notification show={notification.show} message={notification.message} type={notification.type} onClose={() => setNotification({ show: false, message: '', type: '' })} />
            <div className="mb-12 text-center">
              <h1 className="mb-2 text-4xl font-extrabold text-gray-900">Fastrack Courses Insights</h1>
              <p className="text-lg text-gray-600">Overview of Fastrack courses with approved staff allocations</p>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              <div className="relative w-full sm:w-72">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search course code, name, type..."
                  className="w-full py-2 pl-10 pr-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </div>
            </div>

            <div className="bg-white shadow-xl rounded-xl mb-8 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-800">Fastrack Courses Insights</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-blue-600">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase">S.No</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase">Course Code</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase">Course Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase">Course Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase">Staff</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-white uppercase">Classes Conducted</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-white uppercase">Labs Conducted</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {loading ? (
                      <tr><td colSpan="7" className="px-6 py-12 text-center text-gray-500">Loading...</td></tr>
                    ) : filtered.length === 0 ? (
                      <tr><td colSpan="7" className="px-6 py-12 text-center text-gray-500">No Fastrack Insights Found</td></tr>
                    ) : (
                      paginated.map((course, idx) => (
                          <tr key={course.id} className={`${((page - 1) * PAGE_SIZE + idx + 1) % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                          <td className="px-6 py-4 text-sm text-gray-900">{(page - 1) * PAGE_SIZE + idx + 1}</td>
                          <td className="px-6 py-4">
                            <button onClick={() => setViewing(course)} className="px-3 py-1 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700">
                              {course.course_code}
                            </button>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">{course.course_name}</td>
                          <td className="px-6 py-4 text-sm text-gray-900">{course.course_type || '--NA--'}</td>
                          <td className="px-6 py-4 text-sm text-gray-900">{staffNames(course.staff)}</td>
                          <td className="px-6 py-4 text-center text-sm text-gray-900">{sumField(course.staff, 'classes_conducted')}</td>
                          <td className="px-6 py-4 text-center text-sm text-gray-900">{sumField(course.staff, 'labs_conducted')}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {filtered.length > PAGE_SIZE && (
                <div className="flex justify-end items-center gap-2 px-6 pb-6">
                  <button
                    className="px-3 py-1 rounded border border-gray-300 bg-white text-gray-700 disabled:opacity-50"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Prev
                  </button>
                  <span className="text-sm text-gray-700">
                    Page {page} of {Math.ceil(filtered.length / PAGE_SIZE)}
                  </span>
                  <button
                    className="px-3 py-1 rounded border border-gray-300 bg-white text-gray-700 disabled:opacity-50"
                    onClick={() => setPage((p) => Math.min(Math.ceil(filtered.length / PAGE_SIZE), p + 1))}
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

      {/* Detail Modal */}
      {viewing && (
        <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={() => setViewing(null)} />
            <div className="inline-block overflow-hidden text-left align-bottom transition-all transform bg-white rounded-lg shadow-xl sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
              <div className="px-6 py-4 bg-blue-600 flex items-center justify-between">
                <h3 className="text-lg font-medium leading-6 text-white">
                  View Details of the Course - <span className="text-yellow-200">{viewing.course_name}</span>
                </h3>
                <button className="text-white hover:text-gray-200" onClick={() => setViewing(null)}>
                  <svg className="w-6 h-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="px-6 py-5 bg-white">
                <div className="overflow-x-auto border border-gray-200 rounded-lg">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-blue-600">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase">Semester</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase">Scheme</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase">Program</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase">Ft Instance Name</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase">Start Date</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase">End Date</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase">No Of Students</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase">Non-Teaching Staff</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      <tr>
                        <td className="px-4 py-3 text-sm text-gray-900">{viewing.semester ?? '--NA--'}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{viewing.scheme_name || '--NA--'}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{viewing.program_name || '--NA--'}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{viewing.ft_instance_name || '--NA--'}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{viewing.start_date || '--NA--'}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{viewing.end_date || '--NA--'}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{viewing.no_of_students ?? '--NA--'}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {(viewing.staff || []).map((s, i) => (
                            <div key={i}>
                              {[s.instructor_name, s.peon_name].filter((n) => n && n.trim()).join(', ') || '--NA--'}
                            </div>
                          ))}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="px-6 py-4 bg-gray-50 flex justify-end">
                <button onClick={() => setViewing(null)} className="px-6 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50">Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}