import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Notification from '../../components/common/Notification';
import Header from '../../components/layout/Header';
import SidebarHOD from '../../components/layout/SidebarHOD';
import { getHodCoordinatorView, addHodCoordinatorStaff, updateHodCoordinatorStaff } from '../../api/examSectionApi';
import { getErrorMessage } from '../../utils/errors';

export default function HODCoordinatorViewPage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });
  const [addModal, setAddModal] = useState(false);
  const [editModal, setEditModal] = useState(null);
  const [formData, setFormData] = useState({ staff_id: '', start_date: '' });
  const [editFormData, setEditFormData] = useState({ staff_id: '', start_date: '', end_date: '' });
  const [staffPage, setStaffPage] = useState(1);
  const staffPerPage = 10;

  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: '' }), 4000);
  };

  const load = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const res = await getHodCoordinatorView(id);
      const viewData = res?.data?.data || res?.data;
      setData(viewData);
    } catch (e) {
      const msg = getErrorMessage(e, 'Failed to load coordinator details');
      setLoadError(msg);
      showNotification(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const handleAddStaff = async (e) => {
    e.preventDefault();
    if (!formData.staff_id || !formData.start_date) {
      showNotification('Staff and Start Date are required', 'error');
      return;
    }
    try {
      await addHodCoordinatorStaff({
        coordinator_id: Number(id),
        staff_id: Number(formData.staff_id),
        start_date: formData.start_date
      });
      showNotification('Coordinator Staff Added Successfully');
      setAddModal(false);
      setFormData({ staff_id: '', start_date: '' });
      load();
    } catch (err) {
      const msg = getErrorMessage(err, 'Failed to add staff');
      showNotification(msg, 'error');
    }
  };

  const handleEditOpen = (staff) => {
    setEditModal(staff);
    setEditFormData({
      staff_id: staff.staff_id,
      start_date: staff.start_date || '',
      end_date: staff.end_date || ''
    });
  };

  const handleEditStaff = async (e) => {
    e.preventDefault();
    if (!editModal) return;
    try {
      await updateHodCoordinatorStaff(editModal.id, {
        staff_id: editFormData.staff_id ? Number(editFormData.staff_id) : undefined,
        start_date: editFormData.start_date || undefined,
        end_date: editFormData.end_date || undefined
      });
      showNotification('Coordinator updated successfully');
      setEditModal(null);
      setEditFormData({ staff_id: '', start_date: '', end_date: '' });
      load();
    } catch (err) {
      const msg = getErrorMessage(err, 'Failed to update staff');
      showNotification(msg, 'error');
    }
  };

  const getStaffName = (staff) => {
    if (!staff) return '--NA--';
    return [staff.fname, staff.mname, staff.lname].filter(Boolean).join(' ');
  };

  const getStatusBadge = (status) => {
    const badgeClass = {
      'active': 'bg-green-500',
      'inactive': 'bg-red-500'
    }[status] || 'bg-gray-300';
    return <span className={`badge ${badgeClass} text-white px-2 py-1 rounded text-xs`}>{status}</span>;
  };

  const activeCoordinatorStaffIds = new Set(
    (data?.coordinator_staff || [])
      .filter(cs => cs.status === 'active')
      .map(cs => Number(cs.staff_id))
  );

  // Pagination for Available Staff
  const totalStaffPages = Math.ceil((data?.staff?.length || 0) / staffPerPage);
  const paginatedStaff = data?.staff?.slice((staffPage - 1) * staffPerPage, staffPage * staffPerPage) || [];

  // Reset to page 1 when staff data changes
  useEffect(() => {
    setStaffPage(1);
  }, [data?.staff?.length]);

  if (!data) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col">
        <Header />
        <div className="flex flex-1 min-h-0">
          <SidebarHOD />
          <main className="flex-1 overflow-auto p-6">
            <div className="max-w-full mx-auto">
              {loadError && !loading ? (
                <div role="alert" className="px-6 py-12 text-center">
                  <p className="mb-4 text-red-600">{loadError}</p>
                  <div className="flex justify-center gap-3">
                    <button onClick={load} className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">Try again</button>
                    <Link to="/hod/coordinator-management" className="px-5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Back to coordinators</Link>
                  </div>
                </div>
              ) : (
                <div className="px-6 py-12 text-center text-gray-500">Loading...</div>
              )}
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <Header />
      <div className="flex flex-1 min-h-0">
        <SidebarHOD />
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-full mx-auto">
            <Notification show={notification.show} message={notification.message} type={notification.type} onClose={() => setNotification({ show: false, message: '', type: '' })} />
            <div className="mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="mb-2 text-4xl font-extrabold text-gray-900">{data.coordinator?.name}</h1>
                  <p className="text-lg text-gray-600">Employee Type: {data.coordinator?.employee_type}</p>
                </div>
                <button onClick={() => setAddModal(true)} className="px-6 py-3 font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">Add Staff</button>
              </div>
            </div>

            <div className="bg-white shadow-xl rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-blue-600">
                    <tr>
                      <th className="px-4 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">S.No</th>
                      <th className="px-4 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Staff Name</th>
                      <th className="px-4 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Employee Type</th>
                      <th className="px-4 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Start Date</th>
                      <th className="px-4 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">End Date</th>
                      <th className="px-4 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Status</th>
                      <th className="px-4 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Action</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {loading ? (
                      <tr><td colSpan="7" className="px-6 py-12 text-center text-gray-500">Loading...</td></tr>
                    ) : data.coordinator_staff?.length === 0 ? (
                      <tr><td colSpan="7" className="px-6 py-12 text-center text-gray-500">No staff assigned to this coordinator</td></tr>
                    ) : (
                      data.coordinator_staff.map((staff, idx) => (
                        <tr key={staff.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50`}>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{idx + 1}</td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{getStaffName(staff)}</td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">{staff.employee_type}</td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">{staff.start_date || '--NA--'}</td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">{staff.end_date || '--NA--'}</td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm">{getStatusBadge(staff.status)}</td>
                          <td className="px-4 py-4 whitespace-nowrap text-center text-sm font-medium">
                            <button onClick={() => handleEditOpen(staff)} className="p-2 text-white bg-amber-600 rounded-lg hover:bg-amber-700" title="Edit">
                              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Available Staff List */}
            <div className="mt-10 bg-white shadow-xl rounded-xl overflow-hidden">
              <h3 className="px-6 py-4 border-b border-gray-200 text-lg font-semibold text-gray-900">Available Staff for Assignment</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">S.No</th>
                      <th className="px-4 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Staff Name</th>
                      <th className="px-4 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee Type</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {loading ? (
                      <tr><td colSpan="3" className="px-6 py-12 text-center text-gray-500">Loading...</td></tr>
                    ) : paginatedStaff.length === 0 ? (
                      <tr><td colSpan="3" className="px-6 py-12 text-center text-gray-500">No available staff</td></tr>
                    ) : (
                      paginatedStaff.map((staff, idx) => (
                        <tr key={staff.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50`}>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{(staffPage - 1) * staffPerPage + idx + 1}</td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{getStaffName(staff)}</td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">{staff.employee_type}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {/* Pagination Controls */}
              {totalStaffPages > 1 && (
                <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    Showing {(staffPage - 1) * staffPerPage + 1} to {Math.min(staffPage * staffPerPage, data.staff?.length || 0)} of {data.staff?.length || 0} entries
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setStaffPage(p => Math.max(1, p - 1))}
                      disabled={staffPage === 1}
                      className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <span className="px-3 py-1 text-sm font-medium text-gray-700">
                      Page {staffPage} of {totalStaffPages}
                    </span>
                    <button
                      onClick={() => setStaffPage(p => Math.min(totalStaffPages, p + 1))}
                      disabled={staffPage === totalStaffPages}
                      className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Add Staff Modal */}
            {addModal && (
              <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
                <div className="flex items-end justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                  <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={() => setAddModal(false)} />
                  <div className="inline-block overflow-hidden text-left align-bottom transition-all transform bg-white rounded-lg shadow-xl sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                    <div className="px-6 py-4 bg-blue-600">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-medium leading-6 text-white">Add Coordinator Staff</h3>
                        <button className="text-white hover:text-gray-200" onClick={() => setAddModal(false)}><svg className="w-6 h-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                      </div>
                    </div>
                    <div className="px-6 py-5 bg-white">
                      <form className="space-y-5" onSubmit={handleAddStaff}>
                        <div>
                          <label className="block mb-2 text-sm font-medium text-gray-700">Select Staff <span className="text-red-500">*</span></label>
                          <select value={formData.staff_id} onChange={e => setFormData({ ...formData, staff_id: e.target.value })} className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" required>
                            <option value="">Select Staff</option>
                            {data.staff?.map(staff => {
                              const isCoordinator = activeCoordinatorStaffIds.has(Number(staff.id));
                              return (
                                <option key={staff.id} value={staff.id} disabled={isCoordinator}>
                                  {getStaffName(staff)} ({staff.employee_type}){isCoordinator ? ' - Already Coordinator' : ''}
                                </option>
                              );
                            })}
                          </select>
                        </div>
                        <div>
                          <label className="block mb-2 text-sm font-medium text-gray-700">Start Date <span className="text-red-500">*</span></label>
                          <input type="date" name="start_date" value={formData.start_date} onChange={e => setFormData({ ...formData, start_date: e.target.value })} className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" required />
                        </div>
                        <div className="flex justify-end space-x-4 pt-4">
                          <button type="button" onClick={() => setAddModal(false)} className="px-6 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                          <button type="submit" className="px-6 py-3 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">Add Staff</button>
                        </div>
                      </form>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Edit Staff Modal */}
            {editModal && (
              <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
                <div className="flex items-end justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                  <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={() => setEditModal(null)} />
                  <div className="inline-block overflow-hidden text-left align-bottom transition-all transform bg-white rounded-lg shadow-xl sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                    <div className="px-6 py-4 bg-amber-600">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-medium leading-6 text-white">Edit Coordinator Staff</h3>
                        <button className="text-white hover:text-gray-200" onClick={() => setEditModal(null)}><svg className="w-6 h-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                      </div>
                    </div>
                    <div className="px-6 py-5 bg-white">
                      <form className="space-y-5" onSubmit={handleEditStaff}>
                        <div>
                          <label className="block mb-2 text-sm font-medium text-gray-700">Staff</label>
                          <select value={editFormData.staff_id} onChange={e => setEditFormData({ ...editFormData, staff_id: e.target.value })} className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" disabled>
                            <option value="">Select Staff</option>
                            {data.staff?.map(staff => (
                              <option key={staff.id} value={staff.id}>{getStaffName(staff)} ({staff.employee_type})</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block mb-2 text-sm font-medium text-gray-700">Start Date</label>
                          <input type="date" name="start_date" value={editFormData.start_date} onChange={e => setEditFormData({ ...editFormData, start_date: e.target.value })} className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div>
                          <label className="block mb-2 text-sm font-medium text-gray-700">End Date (Optional)</label>
                          <input type="date" name="end_date" value={editFormData.end_date} onChange={e => setEditFormData({ ...editFormData, end_date: e.target.value })} className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div className="flex justify-end space-x-4 pt-4">
                          <button type="button" onClick={() => setEditModal(null)} className="px-6 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                          <button type="submit" className="px-6 py-3 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700">Update Staff</button>
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