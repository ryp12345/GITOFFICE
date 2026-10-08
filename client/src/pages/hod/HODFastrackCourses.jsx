import { useEffect, useMemo, useState } from 'react';

import Notification from '../../components/common/Notification';
import Header from '../../components/layout/Header';
import SidebarHOD from '../../components/layout/SidebarHOD';
import {
  getHodFastrackCourses,
  filterHodFastrackCourses,
  approveHodFastrackRecords,
  processHodFastrackJustification,
  getHodFastrackLookup,
} from '../../api/examSectionApi';
import {
  Pagination,
  StatusBadge,
  buildAcademicYears,
  normalizeCourseType,
  staffName,
  usePagedRows,
  formatLocalDate,
} from '../../components/fastrack/fastrackUi';
import { getErrorMessage } from '../../utils/errors';

const emptyJustify = { classes_conducted: '', labs_conducted: '', ft_justification: '' };

// Laravel: a record over the instance's class/lab limit needs an HOD justification instead of a plain approval
const isOverLimit = (record, course) =>
  Number(record.classes_conducted || 0) > Number(course.max_theory_class || 0) ||
  Number(record.labs_conducted || 0) > Number(course.max_lab_class || 0);

const hasReportedData = (record) => Number(record.classes_conducted || 0) > 0 || Number(record.labs_conducted || 0) > 0;

const canApprove = (record, course) => record.status === 'Verified' && !isOverLimit(record, course) && hasReportedData(record);

const recordKey = (courseId, staffId) => `${courseId}:${staffId}`;

export default function HODFastrackCoursesPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });
  const [filterAcademicYear, setFilterAcademicYear] = useState('');
  const [filterInstance, setFilterInstance] = useState('');
  const [instances, setInstances] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState([]);
  const [detailsRow, setDetailsRow] = useState(null);
  const [justify, setJustify] = useState(null); // { record, course }
  const [justifyForm, setJustifyForm] = useState(emptyJustify);
  const [submitting, setSubmitting] = useState(false);

  const academicYears = useMemo(buildAcademicYears, []);

  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: '' }), 4000);
  };

  const load = async () => {
    setLoading(true);
    const [coursesRes, lookupRes] = await Promise.allSettled([getHodFastrackCourses(), getHodFastrackLookup()]);
    if (coursesRes.status === 'fulfilled') {
      setRows(Array.isArray(coursesRes.value?.data) ? coursesRes.value.data : []);
    } else {
      setRows([]);
      showNotification(coursesRes.getErrorMessage(reason, 'Failed to load courses'), 'error');
    }
    if (lookupRes.status === 'fulfilled') {
      setInstances(lookupRes.value?.data?.instances || []);
    }
    setSelected([]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleFilter = async () => {
    if (!filterAcademicYear || !filterInstance) {
      showNotification('Please select both Academic Year and Fastrack Instance.', 'error');
      return;
    }
    setLoading(true);
    try {
      const res = await filterHodFastrackCourses({ academic_year: filterAcademicYear, ft_instance_id: filterInstance });
      const data = Array.isArray(res?.data) ? res.data : [];
      setRows(data);
      setSelected([]);
      setPage(1);
      if (data.length === 0) showNotification('No records found.', 'error');
    } catch (e) {
      showNotification(getErrorMessage(e, 'Something went wrong! Please try again.'), 'error');
    }
    setLoading(false);
  };

  const approvable = useMemo(
    () => rows.flatMap((course) => (course.fastrack_staffs || [])
      .filter((record) => canApprove(record, course))
      .map((record) => recordKey(course.id, record.staff_id))),
    [rows]
  );

  const allChecked = approvable.length > 0 && approvable.every((k) => selected.includes(k));

  const toggleAll = () => setSelected(allChecked ? [] : approvable);
  const toggleOne = (key) => setSelected((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));

  const handleApprove = async () => {
    if (selected.length === 0) {
      showNotification('Please select at least one staff member to approve.', 'error');
      return;
    }
    const items = selected.map((key) => {
      const [course_id, staff_id] = key.split(':');
      return { course_id, staff_id };
    });
    setSubmitting(true);
    try {
      await approveHodFastrackRecords(items);
      showNotification('Staff records approved successfully.', 'success');
      load();
    } catch (err) {
      showNotification(getErrorMessage(err, 'An error occurred while processing.'), 'error');
    }
    setSubmitting(false);
  };

  const openJustify = (record, course) => {
    setJustify({ record, course });
    setJustifyForm({
      classes_conducted: record.classes_conducted ?? '',
      labs_conducted: record.labs_conducted ?? '',
      ft_justification: '',
    });
  };

  const closeJustify = () => {
    setJustify(null);
    setJustifyForm(emptyJustify);
  };

  const justifyType = normalizeCourseType(justify?.course?.course_type);
  const justifyShowsClasses = ['THEORY', 'INTEGRATED'].includes(justifyType);
  const justifyShowsLabs = ['LAB', 'LABORATORY', 'INTEGRATED'].includes(justifyType);

  const handleJustifySubmit = async (e) => {
    e.preventDefault();
    if (!justify) return;
    if (!justifyForm.ft_justification.trim()) {
      showNotification('The justification field is required.', 'error');
      return;
    }
    try {
      await processHodFastrackJustification(justify.record.id, {
        classes_conducted: justifyShowsClasses ? justifyForm.classes_conducted : undefined,
        labs_conducted: justifyShowsLabs ? justifyForm.labs_conducted : undefined,
        ft_justification: justifyForm.ft_justification.trim(),
      });
      showNotification('Staff details updated and status approved successfully.', 'success');
      closeJustify();
      load();
    } catch (err) {
      showNotification(getErrorMessage(err, 'Failed to process'), 'error');
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const names = (r.fastrack_staffs || []).map((s) => staffName(s.staff, { withMiddle: true })).join(' ');
      return [names, r.academic_year, r.course_code, r.course_name, r.course_type].some((v) => String(v || '').toLowerCase().includes(q));
    });
  }, [rows, search]);

  useEffect(() => { setPage(1); }, [search]);

  const { pageRows, totalPages, offset, page: currentPage } = usePagedRows(filtered, page);

  const renderAction = (record, course) => {
    if (record.status === 'Approved') return <StatusBadge status="Approved" />;
    const key = recordKey(course.id, record.staff_id);
    return (
      <span className="inline-flex items-center gap-2">
        <StatusBadge status={record.status} />
        {isOverLimit(record, course) ? (
          <button onClick={() => openJustify(record, course)} title="Edit"
            className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M16.7574 2.99666L14.7574 4.99666H5V18.9967H19V9.2393L21 7.2393V19.9967C21 20.5489 20.5523 20.9967 20 20.9967H4C3.44772 20.9967 3 20.5489 3 19.9967V3.99666C3 3.44438 3.44772 2.99666 4 2.99666H16.7574ZM20.4853 2.09717L21.8995 3.51138L12.7071 12.7038L11.2954 12.7062L11.2929 11.2896L20.4853 2.09717Z" /></svg>
          </button>
        ) : record.status === 'Verified' ? (
          <input type="checkbox" checked={selected.includes(key)} disabled={!hasReportedData(record)}
            onChange={() => toggleOne(key)} className="w-4 h-4 text-blue-600 cursor-pointer disabled:cursor-not-allowed"
            aria-label={`Approve ${staffName(record.staff)} for ${course.course_code}`} />
        ) : null}
      </span>
    );
  };

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
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-800">Fastrack Courses</h2>
              </div>

              <div className="px-6 pt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                <select value={filterAcademicYear} onChange={(e) => setFilterAcademicYear(e.target.value)}
                  className="block w-full px-4 py-2 font-bold border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                  <option value="" disabled>Select Academic Year</option>
                  {academicYears.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
                <select value={filterInstance} onChange={(e) => setFilterInstance(e.target.value)}
                  className="block w-full px-4 py-2 font-bold border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                  <option value="" disabled>Choose a Fastrack Instance</option>
                  {instances.map((inst) => <option key={inst.id} value={inst.id}>{inst.ft_instance_name}</option>)}
                </select>
                <div>
                  <button onClick={handleFilter} className="px-6 py-2 font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700">Search</button>
                </div>
              </div>

              <div className="px-6 py-4 flex justify-end">
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..."
                  className="w-full sm:w-64 py-2 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 whitespace-nowrap">
                  <thead className="bg-gray-50">
                    <tr>
                      {['S.no', 'Staff Name', 'Academic Year', 'Course Code', 'Course Name', 'Course Type', 'Classes Conducted', 'Labs Conducted'].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border">{h}</th>
                      ))}
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border">
                        Action
                        <label className="flex items-center gap-2 mt-1 normal-case font-normal text-gray-500">
                          <input type="checkbox" checked={allChecked} onChange={toggleAll} disabled={approvable.length === 0} className="w-4 h-4 text-blue-600" />
                          Check All
                        </label>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {loading ? (
                      <tr><td colSpan="9" className="px-6 py-12 text-center text-gray-500">Loading...</td></tr>
                    ) : pageRows.length === 0 ? (
                      <tr><td colSpan="9" className="px-6 py-12 text-center text-gray-500">No data available in table</td></tr>
                    ) : (
                      pageRows.map((course, idx) => {
                        const records = course.fastrack_staffs || [];
                        return (
                          <tr key={course.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 text-sm text-gray-700 align-top`}>
                            <td className="px-4 py-3 border">{offset + idx + 1}</td>
                            <td className="px-4 py-3 border">{records.map((r) => <div key={r.id}>{staffName(r.staff, { withMiddle: true }) || '-NA-'}</div>)}</td>
                            <td className="px-4 py-3 border">{course.academic_year || '--NA--'}</td>
                            <td className="px-4 py-3 border">
                              <button onClick={() => setDetailsRow(course)} className="px-3 py-1 rounded bg-blue-600 text-white hover:bg-green-600" title="View details">
                                {course.course_code}
                              </button>
                            </td>
                            <td className="px-4 py-3 border">{course.course_name}</td>
                            <td className="px-4 py-3 border">{course.course_type}</td>
                            <td className="px-4 py-3 border">{records.map((r) => <div key={r.id}>{r.classes_conducted ?? '--NA--'}</div>)}</td>
                            <td className="px-4 py-3 border">{records.map((r) => <div key={r.id}>{r.labs_conducted ?? '--NA--'}</div>)}</td>
                            <td className="px-4 py-3 border space-y-1">{records.map((r) => <div key={r.id}>{renderAction(r, course)}</div>)}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              {!loading && <Pagination page={currentPage} totalPages={totalPages} total={filtered.length} onChange={setPage} />}
              <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
                <button onClick={handleApprove} disabled={submitting}
                  className="px-6 py-2 font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50">
                  ✓ Approve{selected.length > 0 ? ` (${selected.length})` : ''}
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
                        View Details of Course - <span className="text-red-600">{detailsRow.course_name}</span>
                      </h3>
                      <button className="text-gray-500 hover:text-gray-700" onClick={() => setDetailsRow(null)} aria-label="Close">✕</button>
                    </div>
                    <div className="px-6 py-5 overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200 whitespace-nowrap text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            {['S.No', 'Ft Instance Name', 'Start Date', 'End Date', 'Max Theory', 'Max Lab', 'No Of Students'].map((h) => (
                              <th key={h} className="px-3 py-2 text-left font-bold text-gray-700 border">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="px-3 py-2 border">1</td>
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

            {justify && (
              <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
                <div className="flex items-start justify-center min-h-screen px-4 pt-10 pb-20">
                  <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={closeJustify} />
                  <div className="relative w-full max-w-3xl bg-white rounded-lg shadow-xl overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                      <h3 className="text-lg font-medium text-gray-800">Edit No. of Classes And Labs</h3>
                      <button className="text-gray-500 hover:text-gray-700" onClick={closeJustify} aria-label="Close">✕</button>
                    </div>
                    <form onSubmit={handleJustifySubmit}>
                      <div className="px-6 py-5 space-y-4">
                        <p className="text-sm text-gray-600">
                          {staffName(justify.record.staff, { withMiddle: true })} — limits: {justify.course.max_theory_class ?? 0} classes, {justify.course.max_lab_class ?? 0} labs
                        </p>
                        <div className="grid lg:grid-cols-2 gap-4">
                          {justifyShowsClasses && (
                            <div>
                              <label className="block mb-2 text-sm font-bold text-gray-700">Classes Conducted:<span className="text-red-500">*</span></label>
                              <input type="number" min="0" step="1" required value={justifyForm.classes_conducted}
                                onChange={(e) => setJustifyForm({ ...justifyForm, classes_conducted: e.target.value })}
                                className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                            </div>
                          )}
                          {justifyShowsLabs && (
                            <div>
                              <label className="block mb-2 text-sm font-bold text-gray-700">Labs Conducted:<span className="text-red-500">*</span></label>
                              <input type="number" min="0" step="1" required value={justifyForm.labs_conducted}
                                onChange={(e) => setJustifyForm({ ...justifyForm, labs_conducted: e.target.value })}
                                className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                            </div>
                          )}
                        </div>
                        <div>
                          <label className="block mb-2 text-sm font-bold text-gray-700">Justification:<span className="text-red-500">*</span></label>
                          <input type="text" maxLength={255} required value={justifyForm.ft_justification}
                            onChange={(e) => setJustifyForm({ ...justifyForm, ft_justification: e.target.value })}
                            placeholder="Justification" className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                        </div>
                      </div>
                      <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
                        <button type="button" onClick={closeJustify} className="px-5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Close</button>
                        <button type="submit" className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">✓ Approve</button>
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
