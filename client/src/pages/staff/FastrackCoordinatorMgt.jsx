import { useEffect, useMemo, useState, useRef } from 'react';

import Notification from '../../components/common/Notification';
import Header from '../../components/layout/Header';
import StaffSidebar from '../../components/layout/StaffSidebar';
import {
  getCoordinatorFastrackCourses,
  getStaffForAssignment,
  assignStaffToFastrackCourse,
  updateStaffAssignment,
  filterCoordinatorCourses,
  getFastrackStaffLookup,
} from '../../api/examSectionApi';

export default function FastrackCoordinatorMgtPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });
  const [assignId, setAssignId] = useState(null);
  const [assignForm, setAssignForm] = useState({
    staff_ids: [],
    instructor_foreman_id: '',
    peon_attender_id: '',
    ft_course_type_id: '',
  });
  const [staffLists, setStaffLists] = useState({ teaching: [], instructorForeman: [], peonAttender: [] });
  const [courseTypes, setCourseTypes] = useState([]);
  const [instances, setInstances] = useState([]);
  const [error, setError] = useState('');
  const [filterAcademicYear, setFilterAcademicYear] = useState('');
  const [filterInstance, setFilterInstance] = useState('');

  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: '' }), 4000);
  };

  // Reset instance when academic year changes
  useEffect(() => {
    setFilterInstance('');
  }, [filterAcademicYear]);

  const load = async () => {
    setLoading(true);
    try {
      const [coursesRes, staffRes, lookupRes] = await Promise.all([
        getCoordinatorFastrackCourses(),
        getStaffForAssignment(),
        getFastrackStaffLookup()
      ]);
      const coursesData = coursesRes?.data?.data || coursesRes?.data || [];
      setRows(Array.isArray(coursesData) ? coursesData : []);
      setStaffLists(staffRes?.data?.data || staffRes?.data || { teaching: [], instructorForeman: [], peonAttender: [] });
      const lookupData = lookupRes?.data?.data || lookupRes?.data || {};
      setCourseTypes(lookupData.courseTypes || []);
      setInstances(lookupData.instances || []);
    } catch (e) {
      const msg = e?.response?.data?.message || e.message || 'Failed to load data';
      showNotification(msg, 'error');
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleFilter = async () => {
    if (!filterAcademicYear || !filterInstance) {
      showNotification('Select both Academic Year and Instance', 'error');
      return;
    }
    setLoading(true);
    try {
      const res = await filterCoordinatorCourses({ academic_year: filterAcademicYear, ft_instance_id: filterInstance });
      const data = res?.data?.data || res?.data || [];
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      const msg = e?.response?.data?.message || e.message || 'Filter failed';
      showNotification(msg, 'error');
    }
    setLoading(false);
  };

  const openAssign = (row = null) => {
    if (row) {
      const staffIds = (row.fastrack_staffs || []).filter(s => s.staff_id).map(s => s.staff_id);
      const instructorIds = (row.fastrack_staffs || []).filter(s => s.instructor_foreman_id).map(s => s.instructor_foreman_id);
      const peonIds = (row.fastrack_staffs || []).filter(s => s.peon_attender_id).map(s => s.peon_attender_id);
      setAssignId(row.id);
      setAssignForm({
        staff_ids: staffIds,
        instructor_foreman_id: instructorIds[0] || '',
        peon_attender_id: peonIds[0] || '',
        ft_course_type_id: row.ft_course_type_id || '',
        course_id: row.id,
      });
    } else {
      setAssignId(null);
      setAssignForm({ staff_ids: [], instructor_foreman_id: '', peon_attender_id: '', ft_course_type_id: '' });
    }
    setError('');
  };

  const closeAssign = () => {
    setAssignId(null);
    setAssignForm({ staff_ids: [], instructor_foreman_id: '', peon_attender_id: '', ft_course_type_id: '' });
    setError('');
  };

  const toggleStaff = (id) => {
    setAssignForm(prev => ({
      ...prev,
      staff_ids: prev.staff_ids.includes(id)
        ? prev.staff_ids.filter(x => x !== id)
        : [...prev.staff_ids, id]
    }));
  };

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    if (!assignForm.ft_course_type_id) { setError('Select Course Type'); return; }
    if (assignForm.staff_ids.length === 0) { setError('Select at least one teaching staff'); return; }

    const payload = {
      course_id: assignId,
      staff_id: assignForm.staff_ids,
      instructor_foreman_id: assignForm.instructor_foreman_id || null,
      peon_attender_id: assignForm.peon_attender_id || null,
      ft_course_type_id: assignForm.ft_course_type_id,
    };

    try {
      if (assignId) {
        await updateStaffAssignment(payload);
        showNotification('Staff updated for lab course successfully.', 'success');
      } else {
        await assignStaffToFastrackCourse(payload);
        showNotification('Staff Assigned to Lab Course Successfully', 'success');
      }
      closeAssign();
      load();
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || 'Failed to assign';
      setError(msg);
      showNotification(msg, 'error');
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const getStaffName = (staff) => {
    if (!staff) return '--NA--';
    return [staff.fname, staff.mname, staff.lname].filter(Boolean).join(' ');
  };

  const getStatusBadge = (status) => {
    const badgeClass = {
      'Pending': 'bg-red-500',
      'Approved': 'bg-green-500',
      'Verified': 'bg-blue-500'
    }[status] || 'bg-gray-300';
    return <span className={`badge ${badgeClass} text-white px-2 py-1 rounded text-xs`}>{status || '--NA--'}</span>;
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return rows.filter(r =>
      r.course_code?.toLowerCase().includes(q) ||
      r.course_name?.toLowerCase().includes(q) ||
      r.ft_instance_name?.toLowerCase().includes(q) ||
      r.course_type?.toLowerCase().includes(q)
    );
  }, [rows, search]);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <Header />
      <div className="flex flex-1 min-h-0">
        <StaffSidebar />
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-full mx-auto">
            <Notification show={notification.show} message={notification.message} type={notification.type} onClose={() => setNotification({ show: false, message: '', type: '' })} />
            <div className="mb-6">
              <h1 className="mb-2 text-4xl font-extrabold text-gray-900">FASTRACK Coordinator Management</h1>
              <p className="text-lg text-gray-600">Assign teaching staff, instructor/foreman, and peon/attender to courses</p>
            </div>

            {/* Filters */}
            <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">Academic Year</label>
                <select value={filterAcademicYear} onChange={e => setFilterAcademicYear(e.target.value)}
                  className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                  <option value="">Select Academic Year</option>
                  {instances.filter((v, i, a) => a.findIndex(x => x.academic_year === v.academic_year) === i).map(inst => (
                    <option key={inst.academic_year} value={inst.academic_year}>{inst.academic_year}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">Fastrack Instance</label>
                <select value={filterInstance} onChange={e => setFilterInstance(e.target.value)}
                  className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  disabled={!filterAcademicYear}>
                  <option value="">Select Instance</option>
                  {instances.filter(inst => String(inst.academic_year) === String(filterAcademicYear)).map(inst => (
                    <option key={inst.id} value={inst.id}>{inst.ft_instance_name}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <button onClick={handleFilter} className="w-full px-6 py-3 font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">Filter</button>
              </div>
            </div>

            <div className="flex justify-between items-center mb-6">
              <div className="relative w-full sm:w-72">
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search courses..."
                  className="w-full py-2 pl-10 pr-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <button onClick={() => openAssign()} className="px-6 py-3 font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">Assign Staff</button>
            </div>

            <div className="mb-10 bg-white shadow-xl rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-blue-600">
                    <tr>
                      <th className="px-4 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">S.NO</th>
                      <th className="px-4 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Course Code</th>
                      <th className="px-4 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Course Name</th>
                      <th className="px-4 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Course Type</th>
                      <th className="px-4 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Instance</th>
                      <th className="px-4 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Academic Year</th>
                      <th className="px-4 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Teaching Staff</th>
                      <th className="px-4 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Instructor/Foreman</th>
                      <th className="px-4 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Peon/Attender</th>
                      <th className="px-4 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Status</th>
                      <th className="px-4 py-4 text-center text-xs font-medium text-white uppercase tracking-wider">Action</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {loading ? (
                      <tr><td colSpan="11" className="px-6 py-12 text-center text-gray-500">Loading...</td></tr>
                    ) : filtered.length === 0 ? (
                      <tr><td colSpan="11" className="px-6 py-12 text-center text-gray-500">No courses found</td></tr>
                    ) : (
                      filtered.map((row, idx) => {
                        const staffNames = (row.fastrack_staffs || []).map(s => getStaffName(s.staff)).join(', ') || '--NA--';
                        const instructorNames = (row.fastrack_staffs || []).map(s => getStaffName(s.instructorForeman)).join(', ') || '--NA--';
                        const peonNames = (row.fastrack_staffs || []).map(s => getStaffName(s.peonAttender)).join(', ') || '--NA--';
                        const status = (row.fastrack_staffs?.[0]?.status) || '--NA--';
                        return (
                          <tr key={row.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50`}>
                            <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{idx + 1}</td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{row.course_code}</td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">{row.course_name}</td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">{row.course_type}</td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">{row.ft_instance_name}</td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">{row.academic_year}</td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">{staffNames}</td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">{instructorNames}</td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">{peonNames}</td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm">{getStatusBadge(status)}</td>
                            <td className="px-4 py-4 whitespace-nowrap text-center text-sm font-medium">
                              <button onClick={() => openAssign(row)} className="p-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700" title="Assign/Update Staff">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Assign Modal */}
            {assignId !== null && (
              <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
                <div className="flex items-end justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                  <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={closeAssign} />
                  <div className="inline-block overflow-hidden text-left align-bottom transition-all transform bg-white rounded-lg shadow-xl sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
                    <div className="px-6 py-4 bg-blue-600">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-medium leading-6 text-white">{assignId ? 'Update Staff Assignment' : 'Assign Staff to Course'}</h3>
                        <button className="text-white hover:text-gray-200" onClick={closeAssign}><svg className="w-6 h-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                      </div>
                    </div>
                    <div className="px-6 py-5 bg-white max-h-[80vh] overflow-y-auto">
                      {error && <div className="mb-4 p-3 rounded border border-red-200 text-red-700 bg-red-50 text-sm">{error}</div>}
                      <form className="space-y-5" onSubmit={handleAssignSubmit}>
                        <div>
                          <label className="block mb-2 text-sm font-medium text-gray-700">Course Type <span className="text-red-500">*</span></label>
                          <select value={assignForm.ft_course_type_id} onChange={e => setAssignForm({ ...assignForm, ft_course_type_id: e.target.value })}
                            className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" required>
                            <option value="">Select Course Type</option>
                            {courseTypes.map(ct => <option key={ct.id} value={ct.id}>{ct.course_type} {ct.Is_Remunerated ? '(Remunerated)' : ''}</option>)}
                          </select>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                          <div>
                            <label className="block mb-2 text-sm font-medium text-gray-700">Teaching Staff <span className="text-red-500">*</span></label>
                            <div className="max-h-64 overflow-y-auto border border-gray-300 rounded-md bg-gray-50 p-4">
                              {staffLists.teaching.map(s => (
                                <div key={s.id} className="flex items-center mb-2">
                                  <input type="checkbox" id={`ts_${s.id}`} checked={assignForm.staff_ids.includes(s.id)} onChange={() => toggleStaff(s.id)} className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                                  <label htmlFor={`ts_${s.id}`} className="ml-3 block text-sm text-gray-700 select-none">{getStaffName(s)}</label>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div>
                            <label className="block mb-2 text-sm font-medium text-gray-700">Instructor/Foreman</label>
                            <div className="max-h-64 overflow-y-auto border border-gray-300 rounded-md bg-gray-50 p-4">
                              {staffLists.instructorForeman.map(s => (
                                <div key={s.id} className="flex items-center mb-2">
                                  <input type="radio" id={`inf_${s.id}`} name="instructor_foreman" value={s.id} checked={assignForm.instructor_foreman_id == s.id} onChange={e => setAssignForm({ ...assignForm, instructor_foreman_id: e.target.value })} className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500" />
                                  <label htmlFor={`inf_${s.id}`} className="ml-3 block text-sm text-gray-700 select-none">{getStaffName(s)}</label>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div>
                            <label className="block mb-2 text-sm font-medium text-gray-700">Peon/Attender</label>
                            <div className="max-h-64 overflow-y-auto border border-gray-300 rounded-md bg-gray-50 p-4">
                              {staffLists.peonAttender.map(s => (
                                <div key={s.id} className="flex items-center mb-2">
                                  <input type="radio" id={`pa_${s.id}`} name="peon_attender" value={s.id} checked={assignForm.peon_attender_id == s.id} onChange={e => setAssignForm({ ...assignForm, peon_attender_id: e.target.value })} className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500" />
                                  <label htmlFor={`pa_${s.id}`} className="ml-3 block text-sm text-gray-700 select-none">{getStaffName(s)}</label>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="flex justify-end space-x-4 pt-4">
                          <button type="button" onClick={closeAssign} className="px-6 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                          <button type="submit" className="px-6 py-3 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">{assignId ? 'Update Assignment' : 'Assign Staff'}</button>
                        </div>
                      </form>
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