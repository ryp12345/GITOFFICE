import { useEffect, useMemo, useState } from 'react';

import Notification from '../../components/common/Notification';
import Header from '../../components/layout/Header';
import SidebarHOD from '../../components/layout/SidebarHOD';
import {
  getHodFastrackCourses,
  filterHodFastrackCourses,
  approveHodFastrackRecords,
  getHodFastrackCourseType,
  processHodFastrackJustification,
  getHodFastrackLookup,
} from '../../api/examSectionApi';

export default function HODFastrackCoursesPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });
  const [filterAcademicYear, setFilterAcademicYear] = useState('');
  const [filterInstance, setFilterInstance] = useState('');
  const [instances, setInstances] = useState([]);
  const [justifyOpen, setJustifyOpen] = useState(null);
  const [justifyForm, setJustifyForm] = useState({
    classes_conducted: '',
    labs_conducted: '',
    ft_justification: '',
  });

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
      const [coursesRes, lookupRes] = await Promise.all([
        getHodFastrackCourses(),
        getHodFastrackLookup()
      ]);
      const coursesData = coursesRes?.data?.data || coursesRes?.data || [];
      setRows(Array.isArray(coursesData) ? coursesData : []);
      const lookupData = lookupRes?.data?.data || lookupRes?.data || {};
      setInstances(lookupData.instances || []);
    } catch (e) {
      const msg = e?.response?.data?.message || e.message || 'Failed to load courses';
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
      const res = await filterHodFastrackCourses({ academic_year: filterAcademicYear, ft_instance_id: filterInstance });
      const data = res?.data?.data || res?.data || [];
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      const msg = e?.response?.data?.message || e.message || 'Filter failed';
      showNotification(msg, 'error');
    }
    setLoading(false);
  };

  const handleApprove = async () => {
    const selected = rows.filter(r => r.__selected);
    if (selected.length === 0) {
      showNotification('Select at least one record to approve', 'error');
      return;
    }
    const staffIds = selected.flatMap(r => (r.fastrack_staffs || []).filter(s => s.__selected).map(s => s.staff_id)).filter(Boolean);
    const courseIds = selected.flatMap(r => (r.fastrack_staffs || []).filter(s => s.__selected).map(s => s.course_id || r.id)).filter(Boolean);
    if (!staffIds.length || !courseIds.length) {
      showNotification('No valid records selected', 'error');
      return;
    }
    try {
      await approveHodFastrackRecords(staffIds, courseIds);
      showNotification('Staff records approved successfully.', 'success');
      load();
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || 'Approval failed';
      showNotification(msg, 'error');
    }
  };

  const openJustify = (staffRecord) => {
    setJustifyOpen(staffRecord);
    setJustifyForm({ classes_conducted: '', labs_conducted: '', ft_justification: '' });
  };

  const closeJustify = () => {
    setJustifyOpen(null);
    setJustifyForm({ classes_conducted: '', labs_conducted: '', ft_justification: '' });
  };

  const handleJustifySubmit = async (e) => {
    e.preventDefault();
    if (!justifyOpen) return;
    if (!justifyForm.ft_justification.trim()) {
      showNotification('Justification is required', 'error');
      return;
    }
    try {
      await processHodFastrackJustification(justifyOpen.id, {
        classes_conducted: justifyForm.classes_conducted || null,
        labs_conducted: justifyForm.labs_conducted || null,
        ft_justification: justifyForm.ft_justification,
      });
      showNotification('Staff details updated and status approved successfully.', 'success');
      closeJustify();
      load();
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || 'Failed to process';
      showNotification(msg, 'error');
    }
  };

  const getStatusBadge = (status) => {
    const badgeClass = {
      'Pending': 'bg-red-500',
      'Approved': 'bg-green-500',
      'Verified': 'bg-blue-500'
    }[status] || 'bg-gray-300';
    return <span className={`badge ${badgeClass} text-white px-2 py-1 rounded text-xs`}>{status || '--NA--'}</span>;
  };

  const getStaffName = (staff) => {
    if (!staff) return '--NA--';
    return [staff.fname, staff.mname, staff.lname].filter(Boolean).join(' ');
  };

  const filtered = useMemo(() => rows, [rows]);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <Header />
      <div className="flex flex-1 min-h-0">
        <SidebarHOD />
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-full mx-auto">
            <Notification show={notification.show} message={notification.message} type={notification.type} onClose={() => setNotification({ show: false, message: '', type: '' })} />
            <div className="mb-6">
              <h1 className="mb-2 text-4xl font-extrabold text-gray-900">FASTRACK Courses</h1>
              <p className="text-lg text-gray-600">View and approve fastrack course records for your department</p>
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
              <div className="flex items-end gap-2">
                <button onClick={handleFilter} className="flex-1 px-6 py-3 font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">Filter</button>
                <button onClick={handleApprove} className="flex-1 px-6 py-3 font-medium text-white bg-green-600 rounded-lg hover:bg-green-700">Approve Selected</button>
              </div>
            </div>

            <div className="mb-10 bg-white shadow-xl rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-blue-600">
                    <tr>
                      <th className="px-4 py-4 text-left text-xs font-medium text-white uppercase tracking-wider w-12">
                        <input type="checkbox" onChange={e => rows.forEach(r => r.__selected = e.target.checked)} className="w-4 h-4 text-blue-600" />
                      </th>
                      <th className="px-4 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Course Code</th>
                      <th className="px-4 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Course Name</th>
                      <th className="px-4 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Course Type</th>
                      <th className="px-4 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Instance</th>
                      <th className="px-4 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Academic Year</th>
                      <th className="px-4 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Max Theory</th>
                      <th className="px-4 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Max Lab</th>
                      <th className="px-4 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Staff</th>
                      <th className="px-4 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Classes Conducted</th>
                      <th className="px-4 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Labs Conducted</th>
                      <th className="px-4 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Status</th>
                      <th className="px-4 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Justification</th>
                      <th className="px-4 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Action</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {loading ? (
                      <tr><td colSpan="14" className="px-6 py-12 text-center text-gray-500">Loading...</td></tr>
                    ) : filtered.length === 0 ? (
                      <tr><td colSpan="14" className="px-6 py-12 text-center text-gray-500">No courses found</td></tr>
                    ) : (
                      filtered.map((row, idx) => (
                        <tr key={row.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50`}>
                          <td className="px-4 py-4 whitespace-nowrap text-center text-sm">
                            <input type="checkbox" checked={row.__selected} onChange={e => { row.__selected = e.target.checked; }} className="w-4 h-4 text-blue-600" />
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{row.course_code}</td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">{row.course_name}</td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">{row.course_type}</td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">{row.ft_instance_name}</td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">{row.academic_year}</td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">{row.max_theory_class}</td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">{row.max_lab_class}</td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">
                            {(row.fastrack_staffs || []).map(s => (
                              <div key={s.id} className="flex items-center gap-1 mb-1">
                                <input type="checkbox" checked={s.__selected} onChange={e => { s.__selected = e.target.checked; }} className="w-4 h-4 text-blue-600" />
                                <span>{getStaffName(s.staff)}</span>
                              </div>
                            ))}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">
                            {(row.fastrack_staffs || []).map(s => (
                              <div key={s.id} className="mb-1">{s.classes_conducted ?? '--NA--'}</div>
                            ))}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">
                            {(row.fastrack_staffs || []).map(s => (
                              <div key={s.id} className="mb-1">{s.labs_conducted ?? '--NA--'}</div>
                            ))}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm">
                            {(row.fastrack_staffs || []).map(s => (
                              <div key={s.id} className="mb-1">{getStatusBadge(s.status)}</div>
                            ))}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">
                            {(row.fastrack_staffs || []).map(s => (
                              <div key={s.id} className="mb-1">{s.ft_justification || '--NA--'}</div>
                            ))}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-center text-sm font-medium">
                            {(row.fastrack_staffs || []).map(s => (
                              <button key={s.id} onClick={() => openJustify(s)} className="p-2 text-white bg-amber-600 rounded-lg hover:bg-amber-700" title="Add Justification">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                              </button>
                            ))}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Justification Modal */}
            {justifyOpen && (
              <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
                <div className="flex items-end justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                  <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={closeJustify} />
                  <div className="inline-block overflow-hidden text-left align-bottom transition-all transform bg-white rounded-lg shadow-xl sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                    <div className="px-6 py-4 bg-amber-600">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-medium leading-6 text-white">Add Justification</h3>
                        <button className="text-white hover:text-gray-200" onClick={closeJustify}><svg className="w-6 h-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                      </div>
                    </div>
                    <div className="px-6 py-5 bg-white">
                      <form className="space-y-5" onSubmit={handleJustifySubmit}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          <div>
                            <label className="block mb-2 text-sm font-medium text-gray-700">Classes Conducted</label>
                            <input type="number" name="classes_conducted" value={justifyForm.classes_conducted} onChange={e => setJustifyForm({ ...justifyForm, classes_conducted: e.target.value })} className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" min="0" placeholder="Enter classes conducted" />
                          </div>
                          <div>
                            <label className="block mb-2 text-sm font-medium text-gray-700">Labs Conducted</label>
                            <input type="number" name="labs_conducted" value={justifyForm.labs_conducted} onChange={e => setJustifyForm({ ...justifyForm, labs_conducted: e.target.value })} className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" min="0" placeholder="Enter labs conducted" />
                          </div>
                        </div>
                        <div>
                          <label className="block mb-2 text-sm font-medium text-gray-700">Justification <span className="text-red-500">*</span></label>
                          <textarea name="ft_justification" value={justifyForm.ft_justification} onChange={e => setJustifyForm({ ...justifyForm, ft_justification: e.target.value })} rows={3} className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Enter justification..." required />
                        </div>
                        <div className="flex justify-end space-x-4 pt-4">
                          <button type="button" onClick={closeJustify} className="px-6 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                          <button type="submit" className="px-6 py-3 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700">Submit Justification</button>
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