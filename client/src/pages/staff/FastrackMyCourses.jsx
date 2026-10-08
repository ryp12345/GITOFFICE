import { useEffect, useMemo, useState } from 'react';

import Notification from '../../components/common/Notification';
import Header from '../../components/layout/Header';
import StaffSidebar from '../../components/layout/StaffSidebar';
import { useAuth } from '../../context/AuthContext';
import { getMyFastrackCourses, updateMyFastrackCourse } from '../../api/examSectionApi';
import {
  LOCKED_STATUSES,
  Pagination,
  StatusBadge,
  WelcomeHeader,
  buildAcademicYears,
  courseTypeAllowsClasses,
  courseTypeAllowsLabs,
  fastrackDocumentUrl,
  usePagedRows,
  formatLocalDate,
} from '../../components/fastrack/fastrackUi';
import { getErrorMessage } from '../../utils/errors';

const MAX_FILE_SIZE = 500 * 1024;
const emptyForm = { classes_conducted: '', labs_conducted: '' };


export default function FastrackMyCoursesPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [academicYear, setAcademicYear] = useState('');
  const [page, setPage] = useState(1);
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });
  const [detailsRow, setDetailsRow] = useState(null);
  const [editRow, setEditRow] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [documentFile, setDocumentFile] = useState(null);
  const [error, setError] = useState('');

  const academicYears = useMemo(buildAcademicYears, []);

  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: '' }), 4000);
  };

  const load = async () => {
    setLoading(true);
    try {
      const res = await getMyFastrackCourses();
      setRows(Array.isArray(res?.data) ? res.data : []);
    } catch (e) {
      showNotification(getErrorMessage(e, 'Failed to load courses'), 'error');
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openEdit = (row) => {
    setEditRow(row);
    setForm({ classes_conducted: row.classes_conducted ?? '', labs_conducted: row.labs_conducted ?? '' });
    setDocumentFile(null);
    setError('');
  };

  const closeEdit = () => {
    setEditRow(null);
    setForm(emptyForm);
    setDocumentFile(null);
    setError('');
  };

  const handleDocumentChange = (e) => {
    const file = e.target.files?.[0] || null;
    if (file && file.size > MAX_FILE_SIZE) {
      setError('File exceeds 500KB limit.');
      setDocumentFile(null);
      e.target.value = '';
      return;
    }
    setDocumentFile(file);
    setError('');
  };

  const showClasses = editRow && courseTypeAllowsClasses(editRow.course_type);
  const showLabs = editRow && courseTypeAllowsLabs(editRow.course_type);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!editRow) return;

    const classes = showClasses ? String(form.classes_conducted ?? '').trim() : '';
    const labs = showLabs ? String(form.labs_conducted ?? '').trim() : '';
    if (!classes && !labs && !documentFile) {
      setError('Nothing to update.');
      return;
    }

    const payload = new FormData();
    if (classes) payload.append('classes_conducted', classes);
    if (labs) payload.append('labs_conducted', labs);
    if (documentFile) payload.append('document', documentFile);

    try {
      // The endpoint is keyed by course id, not the fastrack_staffs row id
      await updateMyFastrackCourse(editRow.course_id, payload);
      showNotification('Record saved successfully.', 'success');
      closeEdit();
      load();
    } catch (err) {
      const msg = getErrorMessage(err, 'Operation failed.');
      setError(msg);
      showNotification(msg, 'error');
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (academicYear && r.academic_year !== academicYear) return false;
      if (!q) return true;
      return [r.academic_year, r.course_code, r.course_name, r.status]
        .some((v) => String(v || '').toLowerCase().includes(q));
    });
  }, [rows, search, academicYear]);

  useEffect(() => { setPage(1); }, [search, academicYear]);

  const { pageRows, totalPages, offset, page: currentPage } = usePagedRows(filtered, page);

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
                <h2 className="text-lg font-semibold text-gray-800">My Fastrack Courses</h2>
                <div className="flex flex-wrap gap-3">
                  <select value={academicYear} onChange={(e) => setAcademicYear(e.target.value)}
                    className="px-4 py-2 font-bold border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                    <option value="">Select Academic Year</option>
                    {academicYears.map((y) => <option key={y} value={y}>{y}</option>)}
                  </select>
                  <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..."
                    className="w-full sm:w-56 py-2 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 whitespace-nowrap">
                  <thead className="bg-gray-50">
                    <tr>
                      {['S.no', 'Academic Year', 'Course Code', 'Course Name', 'Classes Conducted', 'Labs Conducted', 'Status', 'Update and view'].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {loading ? (
                      <tr><td colSpan="8" className="px-6 py-12 text-center text-gray-500">Loading...</td></tr>
                    ) : pageRows.length === 0 ? (
                      <tr><td colSpan="8" className="px-6 py-12 text-center text-gray-500">No data available in table</td></tr>
                    ) : (
                      pageRows.map((row, idx) => {
                        const locked = LOCKED_STATUSES.includes(row.status);
                        return (
                          <tr key={row.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 text-sm text-gray-700`}>
                            <td className="px-4 py-3 border">{offset + idx + 1}</td>
                            <td className="px-4 py-3 border">{row.academic_year || '--NA--'}</td>
                            <td className="px-4 py-3 border">
                              <button onClick={() => setDetailsRow(row)} className="px-3 py-1 rounded bg-blue-600 text-white hover:bg-green-600" title="View details">
                                {row.course_code || '--NA--'}
                              </button>
                            </td>
                            <td className="px-4 py-3 border">{row.course_name || '--NA--'}</td>
                            <td className="px-4 py-3 border">{row.classes_conducted ?? '--NA--'}</td>
                            <td className="px-4 py-3 border">{row.labs_conducted ?? '--NA--'}</td>
                            <td className="px-4 py-3 border"><StatusBadge status={row.status} /></td>
                            <td className="px-4 py-3 border">
                              {!locked && (
                                <button onClick={() => openEdit(row)} title="Update"
                                  className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200">
                                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M16.7574 2.99666L14.7574 4.99666H5V18.9967H19V9.2393L21 7.2393V19.9967C21 20.5489 20.5523 20.9967 20 20.9967H4C3.44772 20.9967 3 20.5489 3 19.9967V3.99666C3 3.44438 3.44772 2.99666 4 2.99666H16.7574ZM20.4853 2.09717L21.8995 3.51138L12.7071 12.7038L11.2954 12.7062L11.2929 11.2896L20.4853 2.09717Z" /></svg>
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              {!loading && <Pagination page={currentPage} totalPages={totalPages} total={filtered.length} onChange={setPage} />}
            </div>

            {detailsRow && (
              <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
                <div className="flex items-start justify-center min-h-screen px-4 pt-10 pb-20">
                  <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={() => setDetailsRow(null)} />
                  <div className="relative w-full max-w-4xl bg-white rounded-lg shadow-xl overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                      <h3 className="text-lg font-medium text-gray-800">
                        View Details of My Course - <span className="text-red-600">{detailsRow.course_name || '--NA--'}</span>
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

            {editRow && (
              <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
                <div className="flex items-start justify-center min-h-screen px-4 pt-10 pb-20">
                  <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={closeEdit} />
                  <div className="relative w-full max-w-3xl bg-white rounded-lg shadow-xl overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                      <h3 className="text-lg font-medium text-gray-800">
                        Update Fastrack Details - <span className="text-red-600">{editRow.course_name}</span>
                      </h3>
                      <button className="text-gray-500 hover:text-gray-700" onClick={closeEdit} aria-label="Close">✕</button>
                    </div>
                    <form onSubmit={handleSubmit}>
                      <div className="px-6 py-5 space-y-5">
                        {error && <div className="p-3 rounded border border-red-200 text-red-700 bg-red-50 text-sm">{error}</div>}
                        <div className="grid lg:grid-cols-2 gap-4">
                          <div>
                            <label className="block mb-2 text-sm font-bold text-gray-700">
                              Document:<span className="text-red-500">* Only PDF files up to 500 KB in size are accepted.</span>
                            </label>
                            <input type="file" accept="application/pdf" onChange={handleDocumentChange} className="block w-full text-sm text-gray-600" />
                          </div>
                          <div>
                            <label className="block mb-2 text-sm font-semibold text-gray-700">Existing Document (if any):</label>
                            {editRow.document ? (
                              <a href={fastrackDocumentUrl(editRow.document)} target="_blank" rel="noreferrer" className="text-blue-600 underline text-sm">
                                View Document ({editRow.document})
                              </a>
                            ) : (
                              <p className="text-gray-400 text-sm">No document uploaded yet.</p>
                            )}
                            <p className="text-xs text-gray-500 italic mt-1">Uploading a new file will replace the existing one.</p>
                          </div>
                        </div>
                        <div className="grid lg:grid-cols-2 gap-4">
                          {showClasses && (
                            <div>
                              <label className="block mb-2 text-sm font-bold text-gray-700">Classes Conducted:</label>
                              <input type="number" min="0" step="1" value={form.classes_conducted}
                                onChange={(e) => setForm({ ...form, classes_conducted: e.target.value })}
                                placeholder="Class Conducted" className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                            </div>
                          )}
                          {showLabs && (
                            <div>
                              <label className="block mb-2 text-sm font-bold text-gray-700">Labs Conducted:</label>
                              <input type="number" min="0" step="1" value={form.labs_conducted}
                                onChange={(e) => setForm({ ...form, labs_conducted: e.target.value })}
                                placeholder="Labs Conducted" className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
                        <button type="button" onClick={closeEdit} className="px-5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Close</button>
                        <button type="submit" className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">Update</button>
                      </div>
                    </form>
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
