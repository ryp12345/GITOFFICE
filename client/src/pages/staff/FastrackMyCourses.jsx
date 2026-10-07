import { useEffect, useMemo, useState } from 'react';

import Notification from '../../components/common/Notification';
import Header from '../../components/layout/Header';
import StaffSidebar from '../../components/layout/StaffSidebar';
import { getMyFastrackCourses, updateMyFastrackCourse, getFastrackStaffLookup } from '../../api/examSectionApi';

const emptyForm = {
  classes_conducted: '',
  labs_conducted: '',
};

export default function FastrackMyCoursesPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [documentFile, setDocumentFile] = useState(null);
  const [error, setError] = useState('');

  // Lookup data for tooltips
  const [maxTheory, setMaxTheory] = useState({});
  const [maxLab, setMaxLab] = useState({});

  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: '' }), 4000);
  };

  const load = async () => {
    setLoading(true);
    try {
      const [coursesRes, lookupRes] = await Promise.all([
        getMyFastrackCourses(),
        getFastrackStaffLookup()
      ]);
      const coursesData = coursesRes?.data?.data || coursesRes?.data || [];
      setRows(Array.isArray(coursesData) ? coursesData : []);

      const lookupData = lookupRes?.data?.data || lookupRes?.data || {};
      const maxTheoryMap = {};
      const maxLabMap = {};
      (lookupData.instances || []).forEach(inst => {
        maxTheoryMap[inst.id] = inst.max_theory_class;
        maxLabMap[inst.id] = inst.max_lab_class;
      });
      setMaxTheory(maxTheoryMap);
      setMaxLab(maxLabMap);
    } catch (e) {
      const msg = e?.response?.data?.message || e.message || 'Failed to load courses';
      showNotification(msg, 'error');
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openEdit = (row) => {
    setEditId(row.id);
    setForm({
      classes_conducted: row.classes_conducted ?? '',
      labs_conducted: row.labs_conducted ?? '',
    });
    setDocumentFile(null);
    setError('');
  };

  const closeEdit = () => {
    setEditId(null);
    setForm({ ...emptyForm });
    setDocumentFile(null);
    setError('');
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleDocumentChange = (e) => {
    const file = e.target.files?.[0] || null;
    setDocumentFile(file);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!editId) return;
    setError('');

    const payload = new FormData();
    payload.append('classes_conducted', String(form.classes_conducted ?? '').trim());
    payload.append('labs_conducted', String(form.labs_conducted ?? '').trim());
    if (documentFile) payload.append('document', documentFile);

    try {
      await updateMyFastrackCourse(editId, payload);
      showNotification('Record saved successfully.', 'success');
      closeEdit();
      load();
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || 'Failed to save';
      setError(msg);
      showNotification(msg, 'error');
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
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

  const MAX_FILE_SIZE = 500 * 1024;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <Header />
      <div className="flex flex-1 min-h-0">
        <StaffSidebar />
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-full mx-auto">
            <Notification show={notification.show} message={notification.message} type={notification.type} onClose={() => setNotification({ show: false, message: '', type: '' })} />
            <div className="mb-6">
              <h1 className="mb-2 text-4xl font-extrabold text-gray-900">My Fastrack Courses</h1>
              <p className="text-lg text-gray-600">Update classes conducted, labs conducted, and upload documents</p>
            </div>

            <div className="mb-6">
              <div className="relative w-full sm:w-72">
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search my courses..."
                  className="w-full py-2 pl-10 pr-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
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
                      <th className="px-4 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Max Theory</th>
                      <th className="px-4 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Max Lab</th>
                      <th className="px-4 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Classes Conducted</th>
                      <th className="px-4 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Labs Conducted</th>
                      <th className="px-4 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Document</th>
                      <th className="px-4 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Status</th>
                      <th className="px-4 py-4 text-center text-xs font-medium text-white uppercase tracking-wider">Action</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {loading ? (
                      <tr><td colSpan="13" className="px-6 py-12 text-center text-gray-500">Loading...</td></tr>
                    ) : filtered.length === 0 ? (
                      <tr><td colSpan="13" className="px-6 py-12 text-center text-gray-500">No courses assigned</td></tr>
                    ) : (
                      filtered.map((row, idx) => (
                        <tr key={row.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors duration-150`}>
                          <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{idx + 1}</td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{row.course_code}</td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">{row.course_name}</td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">{row.course_type}</td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">{row.ft_instance_name}</td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">{row.academic_year}</td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">{maxTheory[row.ft_instance_id] ?? row.max_theory_class ?? 'N/A'}</td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">{maxLab[row.ft_instance_id] ?? row.max_lab_class ?? 'N/A'}</td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">{row.classes_conducted ?? '--NA--'}</td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">{row.labs_conducted ?? '--NA--'}</td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">
                            {row.document ? (
                              <a href={`/uploads/staff/fastrack_staff/${row.document}`} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                  <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                                  <polyline points="14 2 14 8 20 8" />
                                </svg>
                                View
                              </a>
                            ) : '--NA--'}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm">{getStatusBadge(row.status)}</td>
                          <td className="px-4 py-4 whitespace-nowrap text-center text-sm font-medium">
                            <button onClick={() => openEdit(row)} className="p-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors" title="Edit">
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

            {/* Edit Modal */}
            {editId && (
              <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
                <div className="flex items-end justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                  <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={closeEdit} />
                  <div className="inline-block overflow-hidden text-left align-bottom transition-all transform bg-white rounded-lg shadow-xl sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                    <div className="px-6 py-4 bg-blue-600">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-medium leading-6 text-white">Update Fastrack Course</h3>
                        <button className="text-white hover:text-gray-200" onClick={closeEdit}>
                          <svg className="w-6 h-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </div>
                    </div>
                    <div className="px-6 py-5 bg-white">
                      {error && <div className="mb-4 p-3 rounded border border-red-200 text-red-700 bg-red-50 text-sm">{error}</div>}
                      <form className="space-y-5" onSubmit={handleSubmit}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          <div>
                            <label className="block mb-2 text-sm font-medium text-gray-700">Classes Conducted</label>
                            <input type="number" name="classes_conducted" value={form.classes_conducted} onChange={handleChange}
                              className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" min="0" placeholder="Enter classes conducted" />
                          </div>
                          <div>
                            <label className="block mb-2 text-sm font-medium text-gray-700">Labs Conducted</label>
                            <input type="number" name="labs_conducted" value={form.labs_conducted} onChange={handleChange}
                              className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" min="0" placeholder="Enter labs conducted" />
                          </div>
                        </div>
                        <div>
                          <label className="block mb-2 text-sm font-medium text-gray-700">
                            Upload Document (PDF only, max 500KB)
                          </label>
                          <input type="file" name="document" accept="application/pdf" onChange={handleDocumentChange}
                            className="block w-full text-sm text-gray-600" />
                          {documentFile && (
                            <p className="mt-1 text-xs text-slate-600">
                              Selected: <span className="font-mono">{documentFile.name}</span> ({Math.ceil(documentFile.size / 1024)} KB)
                            </p>
                          )}
                        </div>
                        <div className="flex justify-end space-x-4 pt-4">
                          <button type="button" onClick={closeEdit} className="px-6 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                          <button type="submit" className="px-6 py-3 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">Save</button>
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