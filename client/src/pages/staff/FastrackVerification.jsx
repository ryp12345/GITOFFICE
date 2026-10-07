import { useEffect, useMemo, useState } from 'react';

import Notification from '../../components/common/Notification';
import Header from '../../components/layout/Header';
import StaffSidebar from '../../components/layout/StaffSidebar';
import { useAuth } from '../../context/AuthContext';
import { getVerificationFastrackCourses, verifyFastrackRecords } from '../../api/examSectionApi';
import {
  LOCKED_STATUSES,
  Pagination,
  StatusBadge,
  WelcomeHeader,
  fastrackDocumentUrl,
  staffName,
  usePagedRows,
  formatLocalDate,
} from '../../components/fastrack/fastrackUi';


// Laravel only offers verification once some staff has reported classes or labs
const hasReportedData = (row) => (row.fastrack_staffs || []).some(
  (s) => Number(s.classes_conducted) > 0 || Number(s.labs_conducted) > 0
);

const isVerifiable = (row) => {
  const status = row.fastrack_staffs?.[0]?.status;
  return hasReportedData(row) && !LOCKED_STATUSES.includes(status);
};

export default function FastrackVerificationPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });
  const [selectedCourseIds, setSelectedCourseIds] = useState([]);
  const [detailsRow, setDetailsRow] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: '' }), 4000);
  };

  const load = async () => {
    setLoading(true);
    try {
      const res = await getVerificationFastrackCourses();
      setRows(Array.isArray(res?.data) ? res.data : []);
      setSelectedCourseIds([]);
    } catch (e) {
      showNotification(e?.response?.data?.message || e.message || 'Failed to load courses', 'error');
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggleCourse = (courseId) => {
    setSelectedCourseIds((prev) => (prev.includes(courseId) ? prev.filter((id) => id !== courseId) : [...prev, courseId]));
  };

  const handleVerify = async () => {
    // One checkbox per course; verify every staff record on that course
    const items = rows
      .filter((row) => selectedCourseIds.includes(row.id))
      .flatMap((row) => (row.fastrack_staffs || []).map((s) => ({ course_id: row.id, staff_id: s.staff_id })));

    if (items.length === 0) {
      showNotification('Select at least one row that contains valid data for verification.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await verifyFastrackRecords(items);
      showNotification('Staff Fastrack Records Verified Successfully.', 'success');
      load();
    } catch (err) {
      showNotification(`Error verifying: ${err?.response?.data?.message || err.message}`, 'error');
    }
    setSubmitting(false);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const names = (r.fastrack_staffs || []).map((s) => staffName(s.staff)).join(' ');
      return [r.course_code, r.course_name, r.course_type, names].some((v) => String(v || '').toLowerCase().includes(q));
    });
  }, [rows, search]);

  useEffect(() => { setPage(1); }, [search]);

  const { pageRows, totalPages, offset, page: currentPage } = usePagedRows(filtered, page);

  const perStaff = (row, render) => {
    const staffs = row.fastrack_staffs || [];
    return staffs.length > 0 ? staffs.map((s) => <div key={s.id}>{render(s)}</div>) : '-NA-';
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <Header />
      <div className="flex flex-1 min-h-0">
        <StaffSidebar />
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-full mx-auto">
            <Notification show={notification.show} message={notification.message} type={notification.type} onClose={() => setNotification({ show: false, message: '', type: '' })} />
            <WelcomeHeader user={user} />

            <div className="mb-10 bg-white shadow-xl rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 flex flex-wrap gap-4 items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-800">Fastrack Verification</h2>
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..."
                  className="w-full sm:w-64 py-2 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 whitespace-nowrap">
                  <thead className="bg-gray-50">
                    <tr>
                      {['S.no', 'Course Code', 'Course Name', 'Course Type', 'Staff', 'Classes Conducted', 'Lab Conducted', 'View Document', 'Amount', 'Status', 'Action'].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {loading ? (
                      <tr><td colSpan="11" className="px-6 py-12 text-center text-gray-500">Loading...</td></tr>
                    ) : pageRows.length === 0 ? (
                      <tr><td colSpan="11" className="px-6 py-12 text-center text-gray-500">No data available in table</td></tr>
                    ) : (
                      pageRows.map((row, idx) => (
                        <tr key={row.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 text-sm text-gray-700`}>
                          <td className="px-4 py-3 border">{offset + idx + 1}</td>
                          <td className="px-4 py-3 border">
                            <button onClick={() => setDetailsRow(row)} className="px-3 py-1 rounded bg-blue-600 text-white hover:bg-green-600" title="View details">
                              {row.course_code}
                            </button>
                          </td>
                          <td className="px-4 py-3 border">{row.course_name}</td>
                          <td className="px-4 py-3 border">{row.course_type ? row.course_type.toUpperCase() : ''}</td>
                          <td className="px-4 py-3 border">{perStaff(row, (s) => staffName(s.staff))}</td>
                          <td className="px-4 py-3 border">{perStaff(row, (s) => s.classes_conducted ?? '--NA--')}</td>
                          <td className="px-4 py-3 border">{perStaff(row, (s) => s.labs_conducted ?? '--NA--')}</td>
                          <td className="px-4 py-3 border">
                            {perStaff(row, (s) => (s.document ? (
                              <a href={fastrackDocumentUrl(s.document)} target="_blank" rel="noreferrer" className="text-blue-600 underline">View</a>
                            ) : '--NA--'))}
                          </td>
                          <td className="px-4 py-3 border">{row.amount ?? '--NA--'}</td>
                          <td className="px-4 py-3 border"><StatusBadge status={row.fastrack_staffs?.[0]?.status} /></td>
                          <td className="px-4 py-3 border text-center">
                            {isVerifiable(row) && (
                              <input type="checkbox" checked={selectedCourseIds.includes(row.id)} onChange={() => toggleCourse(row.id)}
                                className="w-4 h-4 text-blue-600" aria-label={`Select ${row.course_code} for verification`} />
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {!loading && <Pagination page={currentPage} totalPages={totalPages} total={filtered.length} onChange={setPage} />}
              <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
                <button onClick={handleVerify} disabled={submitting}
                  className="px-6 py-2 font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50">
                  ✓ Verify{selectedCourseIds.length > 0 ? ` (${selectedCourseIds.length})` : ''}
                </button>
              </div>
            </div>

            {detailsRow && (
              <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
                <div className="flex items-start justify-center min-h-screen px-4 pt-10 pb-20">
                  <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={() => setDetailsRow(null)} />
                  <div className="relative w-full max-w-4xl bg-white rounded-lg shadow-xl overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                      <h3 className="text-lg font-medium text-gray-800">
                        View Details of My Course - <span className="text-red-600">{detailsRow.course_name}</span>
                      </h3>
                      <button className="text-gray-500 hover:text-gray-700" onClick={() => setDetailsRow(null)} aria-label="Close">✕</button>
                    </div>
                    <div className="px-6 py-5 overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200 whitespace-nowrap text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            {['S.No', 'Semester', 'Ft Instance Name', 'Start Date', 'End Date', 'Max Theory', 'Max Lab', 'No Of Students'].map((h) => (
                              <th key={h} className="px-3 py-2 text-left font-bold text-gray-700 border">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="px-3 py-2 border">1</td>
                            <td className="px-3 py-2 border">{detailsRow.semester || '--NA--'}</td>
                            <td className="px-3 py-2 border">{detailsRow.ft_instance_name || '--NA--'}</td>
                            <td className="px-3 py-2 border">{formatLocalDate(detailsRow.start_date)}</td>
                            <td className="px-3 py-2 border">{formatLocalDate(detailsRow.end_date)}</td>
                            <td className="px-3 py-2 border">{detailsRow.max_theory_class ?? '--NA--'}</td>
                            <td className="px-3 py-2 border">{detailsRow.max_lab_class ?? '--NA--'}</td>
                            <td className="px-3 py-2 border">{detailsRow.no_of_students ?? '--NA--'}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
                      <button onClick={() => setDetailsRow(null)} className="px-5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Close</button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
