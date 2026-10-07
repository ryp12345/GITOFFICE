import { useEffect, useMemo, useState } from 'react';

import Notification from '../../components/common/Notification';
import Header from '../../components/layout/Header';
import StaffSidebar from '../../components/layout/StaffSidebar';
import { useAuth } from '../../context/AuthContext';
import {
  getCoordinatorFastrackCourses,
  getStaffForAssignment,
  assignStaffToFastrackCourse,
  updateStaffAssignment,
  filterCoordinatorCourses,
  getFastrackStaffLookup,
} from '../../api/examSectionApi';
import {
  Pagination,
  StatusBadge,
  WelcomeHeader,
  buildAcademicYears,
  staffName as getStaffName,
  usePagedRows,
} from '../../components/fastrack/fastrackUi';

const LOCKED_STATUSES = ['Pending', 'Approved', 'Verified'];
const EMPTY_FORM = { staff_ids: [], instructor_foreman_id: '', peon_attender_id: '', ft_course_type_id: '' };


const idOf = (value) => (value === null || value === undefined || value === '' ? '' : String(value));


const getStaffOptionLabel = (s) => `${getStaffName(s)} (${s.design_name || ''}) (${s.dept_shortname || ''})`;


export default function FastrackCoordinatorMgtPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });
  const [modal, setModal] = useState(null); // { mode: 'assign' | 'edit', course }
  const [assignForm, setAssignForm] = useState(EMPTY_FORM);
  const [staffLists, setStaffLists] = useState({ teaching: [], instructorForeman: [], peonAttender: [] });
  const [courseTypes, setCourseTypes] = useState([]);
  const [instances, setInstances] = useState([]);
  const [error, setError] = useState('');
  const [filterAcademicYear, setFilterAcademicYear] = useState('');
  const [filterInstance, setFilterInstance] = useState('');

  const academicYears = useMemo(buildAcademicYears, []);

  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: '' }), 4000);
  };

  const load = async () => {
    setLoading(true);
    // Load independently so one failing request does not blank the whole page
    const [coursesRes, staffRes, lookupRes] = await Promise.allSettled([
      getCoordinatorFastrackCourses(),
      getStaffForAssignment(),
      getFastrackStaffLookup(),
    ]);

    if (coursesRes.status === 'fulfilled') {
      const coursesData = coursesRes.value?.data;
      setRows(Array.isArray(coursesData) ? coursesData : []);
    } else {
      setRows([]);
      showNotification(coursesRes.reason?.response?.data?.message || 'Failed to load courses', 'error');
    }

    if (staffRes.status === 'fulfilled') {
      setStaffLists(staffRes.value?.data || { teaching: [], instructorForeman: [], peonAttender: [] });
    }

    if (lookupRes.status === 'fulfilled') {
      const lookupData = lookupRes.value?.data || {};
      setCourseTypes(lookupData.courseTypes || []);
      setInstances(lookupData.instances || []);
    }

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
      const res = await filterCoordinatorCourses({ academic_year: filterAcademicYear, ft_instance_id: filterInstance });
      const data = Array.isArray(res?.data) ? res.data : [];
      setRows(data);
      setPage(1);
      if (data.length === 0) showNotification('No records found.', 'error');
    } catch (e) {
      showNotification(e?.response?.data?.message || 'Something went wrong! Please try again.', 'error');
    }
    setLoading(false);
  };

  const openModal = (mode, course) => {
    if (mode === 'edit') {
      const staffs = course.fastrack_staffs || [];
      const first = staffs[0];
      setAssignForm({
        staff_ids: staffs.map((s) => idOf(s.staff_id)).filter(Boolean),
        instructor_foreman_id: idOf(first?.instructor_foreman_id),
        peon_attender_id: idOf(first?.peon_attender_id),
        ft_course_type_id: idOf(course.ft_course_type_id),
      });
    } else {
      setAssignForm(EMPTY_FORM);
    }
    setModal({ mode, course });
    setError('');
  };

  const closeModal = () => {
    setModal(null);
    setAssignForm(EMPTY_FORM);
    setError('');
  };

  const toggleStaff = (id) => {
    setAssignForm((prev) => ({
      ...prev,
      staff_ids: prev.staff_ids.includes(id) ? prev.staff_ids.filter((x) => x !== id) : [...prev.staff_ids, id],
    }));
  };

  const selectedCourseType = courseTypes.find((ct) => idOf(ct.id) === assignForm.ft_course_type_id);
  const isTheory = selectedCourseType?.course_type?.trim().toLowerCase() === 'theory';
  const isArch = modal?.course?.dept_shortname === 'ARCH';

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    if (!assignForm.ft_course_type_id) { setError('Select Course Type'); return; }
    if (assignForm.staff_ids.length === 0) { setError('Select Faculty Staff'); return; }

    const payload = {
      course_id: modal.course.id,
      staff_id: assignForm.staff_ids,
      // Theory courses have no lab, so no non-teaching staff
      instructor_foreman_id: isTheory ? null : assignForm.instructor_foreman_id || null,
      peon_attender_id: isTheory ? null : assignForm.peon_attender_id || null,
      ft_course_type_id: assignForm.ft_course_type_id,
    };

    try {
      if (modal.mode === 'edit') {
        await updateStaffAssignment(payload);
        showNotification('Staff updated for lab course successfully.', 'success');
      } else {
        await assignStaffToFastrackCourse(payload);
        showNotification('Staff Assigned to Lab Course Successfully', 'success');
      }
      closeModal();
      load();
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || 'Failed to Assign Staff to Course';
      setError(msg);
      showNotification(msg, 'error');
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const staffNames = (r.fastrack_staffs || []).map((s) => getStaffName(s.staff)).join(' ');
      return [r.academic_year, r.ft_instance_name, r.course_code, r.course_name, r.course_type, staffNames]
        .some((v) => String(v || '').toLowerCase().includes(q));
    });
  }, [rows, search]);

  useEffect(() => { setPage(1); }, [search]);

  const { pageRows, totalPages, offset, page: currentPage } = usePagedRows(filtered, page);


  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <Header />
      <div className="flex flex-1 min-h-0">
        <StaffSidebar />
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-full mx-auto">
            <Notification show={notification.show} message={notification.message} type={notification.type} onClose={() => setNotification({ show: false, message: '', type: '' })} />

            <WelcomeHeader user={user} crumbs={['Faculty List', 'My Department Faculty']} />

            <div className="mb-10 bg-white shadow-xl rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-800">Assign Faculty And Non-Teaching Staff for Fastrack Courses</h2>
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
                      {['S.no', 'Academic Year', 'Ft Instance Name', 'Course Code', 'Course Name', 'Course Type', 'Remuneration', 'Teaching Staff', 'Non-Teaching Staff', 'Amount', 'Status', 'Action'].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {loading ? (
                      <tr><td colSpan="12" className="px-6 py-12 text-center text-gray-500">Loading...</td></tr>
                    ) : pageRows.length === 0 ? (
                      <tr><td colSpan="12" className="px-6 py-12 text-center text-gray-500">No data available in table</td></tr>
                    ) : (
                      pageRows.map((row, idx) => {
                        const staffs = row.fastrack_staffs || [];
                        const first = staffs[0];
                        const status = first?.status || '--NA--';
                        return (
                          <tr key={row.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 text-sm text-gray-700`}>
                            <td className="px-4 py-3 border">{offset + idx + 1}</td>
                            <td className="px-4 py-3 border">{row.academic_year}</td>
                            <td className="px-4 py-3 border">{row.ft_instance_name}</td>
                            <td className="px-4 py-3 border">{row.course_code}</td>
                            <td className="px-4 py-3 border">{row.course_name}</td>
                            <td className="px-4 py-3 border">{row.course_type ? row.course_type.toUpperCase() : '--NA--'}</td>
                            <td className="px-4 py-3 border">{row.is_remunerated || '--NA--'}</td>
                            <td className="px-4 py-3 border">
                              {staffs.length > 0 ? staffs.map((s) => <div key={s.id}>{getStaffName(s.staff)}</div>) : '-NA-'}
                            </td>
                            <td className="px-4 py-3 border">
                              {first ? (
                                <>
                                  <div>{getStaffName(first.instructorForeman) || '--NA--'}</div>
                                  <div>{getStaffName(first.peonAttender) || '--NA--'}</div>
                                </>
                              ) : '--NA--'}
                            </td>
                            <td className="px-4 py-3 border">{row.amount ?? '--NA--'}</td>
                            <td className="px-4 py-3 border"><StatusBadge status={status} /></td>
                            <td className="px-4 py-3 border">
                              <div className="flex items-center gap-2">
                                {!LOCKED_STATUSES.includes(first?.status) && (
                                  <button onClick={() => openModal('assign', row)} title="Assign & View"
                                    className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M15 14c2.8 0 5 2.2 5 5v1h-2v-1c0-1.7-1.3-3-3-3h-6c-1.7 0-3 1.3-3 3v1H4v-1c0-2.8 2.2-5 5-5h6zM12 2a5 5 0 1 1 0 10A5 5 0 0 1 12 2zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6zm8 9h-2v2h-2v2h2v2h2v-2h2v-2h-2v-2z" /></svg>
                                  </button>
                                )}
                                <button onClick={() => openModal('edit', row)} title="Edit"
                                  className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200">
                                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M16.7574 2.99666L14.7574 4.99666H5V18.9967H19V9.2393L21 7.2393V19.9967C21 20.5489 20.5523 20.9967 20 20.9967H4C3.44772 20.9967 3 20.5489 3 19.9967V3.99666C3 3.44438 3.44772 2.99666 4 2.99666H16.7574ZM20.4853 2.09717L21.8995 3.51138L12.7071 12.7038L11.2954 12.7062L11.2929 11.2896L20.4853 2.09717Z" /></svg>
                                </button>
                              </div>
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

            {modal && (
              <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
                <div className="flex items-start justify-center min-h-screen px-4 pt-10 pb-20">
                  <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={closeModal} />
                  <div className="relative w-full max-w-4xl bg-white rounded-lg shadow-xl overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                      <h3 className="text-lg font-medium text-gray-800">
                        {modal.mode === 'edit' ? 'Edit Faculty And Non-Teaching Staff for Fastrack Course - ' : 'Assign Faculty And Non-Teaching Staff for - '}
                        <span className="text-red-600">{modal.course.course_name}</span>
                      </h3>
                      <button className="text-gray-500 hover:text-gray-700" onClick={closeModal} aria-label="Close">
                        <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                    <form onSubmit={handleAssignSubmit}>
                      <div className="px-6 py-5 max-h-[70vh] overflow-y-auto">
                        {error && <div className="mb-4 p-3 rounded border border-red-200 text-red-700 bg-red-50 text-sm">{error}</div>}

                        <div className="grid lg:grid-cols-2 gap-4 pb-4">
                          <div>
                            <label className="block mb-2 text-sm font-bold text-gray-700">Select Course Type:<span className="text-red-500">*</span></label>
                            <select value={assignForm.ft_course_type_id} onChange={(e) => setAssignForm({ ...assignForm, ft_course_type_id: e.target.value })}
                              className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                              <option value="" disabled>Select Course Type</option>
                              {courseTypes.map((ct) => <option key={ct.id} value={idOf(ct.id)}>{ct.course_type}</option>)}
                            </select>
                          </div>
                        </div>

                        <div className="grid lg:grid-cols-2 gap-4">
                          <div>
                            <label className="block mb-2 text-sm font-bold text-gray-700">Select Faculty Staff:<span className="text-red-500">*</span></label>
                            {isArch ? (
                              // Architecture courses can have several faculty
                              <div className="h-32 overflow-y-auto border border-gray-300 rounded p-2 space-y-2">
                                {staffLists.teaching.map((s) => (
                                  <label key={s.id} className="flex items-center gap-2 text-sm text-gray-700">
                                    <input type="checkbox" checked={assignForm.staff_ids.includes(idOf(s.id))} onChange={() => toggleStaff(idOf(s.id))}
                                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                                    <span>{getStaffOptionLabel(s)}</span>
                                  </label>
                                ))}
                              </div>
                            ) : (
                              <select value={assignForm.staff_ids[0] || ''} onChange={(e) => setAssignForm({ ...assignForm, staff_ids: e.target.value ? [e.target.value] : [] })}
                                className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                                <option value="">Select Faculty Staff</option>
                                {staffLists.teaching.map((s) => <option key={s.id} value={idOf(s.id)}>{getStaffOptionLabel(s)}</option>)}
                              </select>
                            )}
                          </div>

                          {!isTheory && (
                            <>
                              <div>
                                <label className="block mb-2 text-sm font-bold text-gray-700">Instructor/Assistant Instructor/Foreman Staff:<span className="text-red-500">*</span></label>
                                <select value={assignForm.instructor_foreman_id} onChange={(e) => setAssignForm({ ...assignForm, instructor_foreman_id: e.target.value })}
                                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                                  <option value="">Select Non-Teaching Staff</option>
                                  {staffLists.instructorForeman.map((s) => <option key={s.id} value={idOf(s.id)}>{getStaffOptionLabel(s)}</option>)}
                                </select>
                              </div>
                              <div>
                                <label className="block mb-2 text-sm font-bold text-gray-700">Peons And Attender Staff:<span className="text-red-500">*</span></label>
                                <select value={assignForm.peon_attender_id} onChange={(e) => setAssignForm({ ...assignForm, peon_attender_id: e.target.value })}
                                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                                  <option value="">Select Peons And Attender Staff</option>
                                  {staffLists.peonAttender.map((s) => <option key={s.id} value={idOf(s.id)}>{getStaffOptionLabel(s)}</option>)}
                                </select>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
                        <button type="button" onClick={closeModal} className="px-5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Close</button>
                        <button type="submit" className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">{modal.mode === 'edit' ? 'Update' : 'Assign'}</button>
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
