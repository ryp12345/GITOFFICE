
import { useEffect, useMemo, useState } from 'react';
import Notification from '../../components/common/Notification';
import Header from '../../components/layout/Header';
import SidebarExamSection from '../../components/layout/SidebarExamSection';
import { useAuth } from '../../context/AuthContext';
import { getCourseTypes, createCourseType, updateCourseType, deleteCourseType } from '../../api/examSectionApi';

const initialForm = {
  course_type: '',
  is_remunerated: 'Yes',
};

export default function CourseTypeConfigPage() {
  const { token } = useAuth?.() || {};
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState('');
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await getCourseTypes();
      const data = res?.data?.data || res?.data || [];
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      setRows([]);
      const msg = e.response?.data?.message || e.response?.data?.error || e.message || 'Failed to fetch course types';
      showNotification(msg, 'error');
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [token]);

  const onClose = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setForm(initialForm);
    setError('');
  };

  const openCreate = () => {
    onClose();
    setIsModalOpen(true);
  };

  const openEdit = (row) => {
    setEditingId(row.id);
    setForm({
      course_type: row.course_type || '',
      is_remunerated: row.is_remunerated || 'Yes',
    });
    setIsModalOpen(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.course_type.trim()) {
      setError('Course type is required');
      return;
    }
    try {
      const payload = {
        course_type: form.course_type,
        is_remunerated: form.is_remunerated,
      };
      if (editingId) {
        await updateCourseType(editingId, payload);
        showNotification('Fastrack Course updated successfully!', 'success');
      } else {
        await createCourseType(payload);
        showNotification('New Scheme Added successfully', 'success');
      }
      onClose();
      load();
    } catch (e) {
      const msg = e.response?.data?.message || e.message || 'Failed to save';
      setError(msg);
      showNotification(msg, 'error');
    }
  };

  const remove = async (id) => {
    if (!window.confirm('Are you sure you want to delete this course type?')) return;
    try {
      await deleteCourseType(id);
      load();
      showNotification('Fastrack Course Deleted successfully', 'success');
    } catch (e) {
      const msg = e.response?.data?.message || e.message || 'Failed to delete course type';
      alert(msg);
      showNotification(msg, 'error');
    }
  };

  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: '' }), 4000);
  };

  // Pagination state
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  // Filtered, sorted, and paginated data
  const filtered = useMemo(() => {
    const sorted = [...rows].sort((a, b) => {
      const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
      if (bTime !== aTime) return bTime - aTime;
      return (b.id || 0) - (a.id || 0);
    });
    const q = search.toLowerCase();
    return sorted.filter(r => (
      r.course_type?.toLowerCase().includes(q) ||
      r.is_remunerated?.toLowerCase().includes(q)
    ));
  }, [rows, search]);

  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  useEffect(() => { setPage(1); }, [search, rows]);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <Header />
      <div className="flex flex-1 min-h-0">
        <SidebarExamSection />
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto">
            <Notification show={notification.show} message={notification.message} type={notification.type} onClose={() => setNotification({ show: false, message: '', type: '' })} />
            <div className="mb-12 text-center">
              <h1 className="mb-2 text-4xl font-extrabold text-gray-900">Course Type Details</h1>
              <p className="text-lg text-gray-600">Create, update and manage course types</p>
            </div>

            <div className="flex flex-col items-start justify-between gap-4 mb-6 sm:flex-row sm:items-center">
              <div className="relative w-full sm:w-72">
                <input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Search course types..." className="w-full py-2 pl-10 pr-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </div>
              <button onClick={openCreate} className="flex items-center justify-center w-full px-6 py-3 font-medium text-white transition-all duration-300 transform rounded-lg shadow-lg bg-blue-600 hover:bg-blue-700 hover:-translate-y-1 hover:scale-105 sm:w-auto">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
                Add Course Type
              </button>
            </div>

            <div className="mb-10 overflow-hidden bg-white shadow-xl rounded-xl">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-blue-600">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">S.NO</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Course Type</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Is Course Eligible for remuneration</th>
                      <th className="px-6 py-4 text-center text-xs font-medium text-white uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {loading ? (
                      <tr><td colSpan="8" className="px-6 py-12 text-center text-gray-500">Loading...</td></tr>
                    ) : filtered.length === 0 ? (
                      <tr><td colSpan="8" className="px-6 py-12 text-center text-gray-500">No course types found</td></tr>
                    ) : (
                      paginated.map((row, idx) => (
                        <tr key={row.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors duration-150`}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{(page - 1) * PAGE_SIZE + idx + 1}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{row.course_type}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <span className={`px-3 py-1 text-xs font-medium rounded-full ${row.is_remunerated === 'Yes' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                              {row.is_remunerated}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                            <div className="flex items-center justify-center space-x-2">
                              <button
                                onClick={() => openEdit(row)}
                                className="p-2 text-white transition-colors duration-200 bg-blue-600 rounded-lg hover:bg-blue-700"
                                title="Edit Course Type"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => remove(row.id)}
                                className="p-2 text-white transition-colors duration-200 bg-red-600 rounded-lg hover:bg-red-700"
                                title="Delete Course Type"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {/* Pagination Controls */}
              {filtered.length > PAGE_SIZE && (
                <div className="flex justify-end items-center gap-2 px-6 pb-6">
                  <button
                    className="px-3 py-1 rounded border border-gray-300 bg-white text-gray-700 disabled:opacity-50"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Prev
                  </button>
                  <span className="text-sm text-gray-700">
                    Page {page} of {Math.ceil(filtered.length / PAGE_SIZE)}
                  </span>
                  <button
                    className="px-3 py-1 rounded border border-gray-300 bg-white text-gray-700 disabled:opacity-50"
                    onClick={() => setPage(p => Math.min(Math.ceil(filtered.length / PAGE_SIZE), p + 1))}
                    disabled={page === Math.ceil(filtered.length / PAGE_SIZE)}
                  >
                    Next
                  </button>
                </div>
              )}
            </div>

            {isModalOpen && (
              <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
                <div className="flex items-end justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                  <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose} />
                  <div className="inline-block overflow-hidden text-left align-bottom transition-all transform bg-white rounded-lg shadow-xl sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
                    <div className="px-6 py-4 bg-blue-600">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-medium leading-6 text-white">{editingId ? 'Edit Course Type' : 'Add New Course Type'}</h3>
                        <button className="text-white hover:text-gray-200" onClick={onClose}>
                          <svg className="w-6 h-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </div>
                    </div>
                    <div className="px-6 py-5 bg-white">
                      {error && <div className="mb-4 p-3 rounded border border-red-200 text-red-700 bg-red-50 text-sm">{error}</div>}
                      <form className="space-y-5" onSubmit={submit}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          <div className={editingId ? "md:col-span-1" : "md:col-span-2"}>
                            <label className="block mb-2 text-sm font-medium text-gray-700">Course Type <span className="text-red-500">*</span></label>
                            <input
                              type="text"
                              value={form.course_type}
                              onChange={(e) => setForm({ ...form, course_type: e.target.value })}
                              className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              placeholder="Course Type"
                              required
                            />
                          </div>

                          <div className="md:col-span-1">
                            <label className="block mb-2 text-sm font-medium text-gray-700">Is Course Eligible for remuneration <span className="text-red-500">*</span></label>
                            <div className="flex space-x-6">
                              <div className="inline-flex items-center">
                                <input
                                  type="radio"
                                  name="is_remunerated"
                                  value="Yes"
                                  checked={form.is_remunerated === 'Yes'}
                                  onChange={(e) => setForm({ ...form, is_remunerated: e.target.value })}
                                  className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                                  required
                                />
                                <label className="ml-2 text-sm text-gray-700">Yes</label>
                              </div>
                              <div className="inline-flex items-center">
                                <input
                                  type="radio"
                                  name="is_remunerated"
                                  value="No"
                                  checked={form.is_remunerated === 'No'}
                                  onChange={(e) => setForm({ ...form, is_remunerated: e.target.value })}
                                  className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                                />
                                <label className="ml-2 text-sm text-gray-700">No</label>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex justify-end space-x-4 pt-4">
                          <button type="button" onClick={onClose} className="inline-flex justify-center px-6 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">Cancel</button>
                          <button type="submit" className="inline-flex justify-center px-6 py-3 text-sm font-medium text-white border border-transparent rounded-lg shadow-sm bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">{editingId ? 'Update Course Type' : 'Add Course Type'}</button>
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
