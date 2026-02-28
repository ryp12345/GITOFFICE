import { useEffect, useMemo, useState } from 'react';
import Notification from '../../components/common/Notification';
import Header from '../../components/layout/Header';
import Sidebar from '../../components/layout/Sidebar';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  getCasteCategories,
  createCasteCategory,
  updateCasteCategory,
  deleteCasteCategory,
} from '../../api/casteCategoryApi';
import { Link } from 'react-router-dom';

const initialForm = {
  caste_name: '',
  religion_id: '',
  subcastes_name: '',
  category: '',
  category_no: '',
  status: 'Active',
};

export default function CasteCategoriesPage() {
  const { token } = useAuth?.() || {};
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const religionId = params.get('religionId') || '';
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState('');
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: '' }), 4000);
  };

  const load = async () => {
    setLoading(true);
    try {
      const res = await getCasteCategories(token, religionId);
      const data = res?.data?.data || [];
      setRows(Array.isArray(data) ? data : []);
    } catch {
      setRows([]);
      showNotification('Failed to load caste categories', 'error');
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [token, religionId]);

  const onClose = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setForm(initialForm);
    setError('');
  };

  const openCreate = () => {
    onClose();
    setForm({ ...initialForm, religion_id: religionId });
    setIsModalOpen(true);
  };

  const openEdit = (row) => {
    setEditingId(row.id);
    setForm({
      caste_name: row.caste_name || '',
      religion_id: row.religion_id || religionId,
      subcastes_name: row.subcastes_name || '',
      category: row.category || '',
      category_no: row.category_no || '',
      status: row.status || 'Active',
    });
    setError('');
    setIsModalOpen(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.caste_name.trim()) {
      setError('Caste name is required');
      return;
    }
    if (!religionId && !form.religion_id) {
      setError('Religion is required');
      return;
    }
    if (!form.subcastes_name.trim()) {
      setError('Subcastes name is required');
      return;
    }
    if (!form.category.trim()) {
      setError('Category is required');
      return;
    }
    if (!form.category_no.trim()) {
      setError('Category No is required');
      return;
    }
    if (!['Active', 'Inactive'].includes(form.status)) {
      setError('Status must be Active or Inactive');
      return;
    }
    const payload = {
      caste_name: form.caste_name.trim(),
      religion_id: religionId || form.religion_id,
      subcastes_name: form.subcastes_name.trim(),
      category: form.category.trim(),
      category_no: form.category_no.trim(),
      status: form.status,
    };
    try {
      if (editingId) {
        await updateCasteCategory(editingId, payload, token);
        showNotification('Caste Category updated!', 'success');
      } else {
        await createCasteCategory(payload, token);
        showNotification('Caste Category created!', 'success');
      }
      onClose();
      load();
    } catch (e1) {
      const msg = e1.response?.data?.message || e1.message || 'Failed to save caste category';
      setError(msg);
      showNotification(msg, 'error');
    }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this caste category?')) return;
    try {
      await deleteCasteCategory(id, token);
      showNotification('Caste Category deleted!', 'success');
      load();
    } catch (e1) {
      const msg = e1.response?.data?.message || e1.message || 'Failed to delete caste category';
      showNotification(msg, 'error');
    }
  };

  const filtered = useMemo(() => {
    const sorted = [...rows];
    const q = search.toLowerCase();
    return sorted.filter((row) => (
      row.caste_name?.toLowerCase().includes(q) ||
      row.category?.toLowerCase().includes(q) ||
      row.status?.toLowerCase().includes(q)
    ));
  }, [rows, search]);

  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  useEffect(() => {
    setPage(1);
  }, [rows, search]);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <Header />
      <div className="flex flex-1 min-h-0">
        <Sidebar />
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto">
            <div className="mb-4">
              <Link to="/religions" className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-700 bg-blue-100 rounded hover:bg-blue-200">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Religions
              </Link>
            </div>
            <Notification
              show={notification.show}
              message={notification.message}
              type={notification.type}
              onClose={() => setNotification({ show: false, message: '', type: '' })}
            />
            <div className="mb-12 text-center">
              <h1 className="mb-2 text-4xl font-extrabold text-gray-900">Caste Categories</h1>
              <p className="text-lg text-gray-600">Create, update and manage caste categories</p>
            </div>
            <div className="flex flex-col items-start justify-between gap-4 mb-6 sm:flex-row sm:items-center">
              <div className="relative w-full sm:w-72">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search caste categories..."
                  className="w-full py-2 pl-10 pr-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <button
                onClick={openCreate}
                className="flex items-center justify-center w-full px-6 py-3 font-medium text-white transition-all duration-300 transform rounded-lg shadow-lg bg-blue-600 hover:bg-blue-700 hover:-translate-y-1 hover:scale-105 sm:w-auto"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                Add Caste Category
              </button>
            </div>
            <div className="mb-10 overflow-hidden bg-white shadow-xl rounded-xl">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-blue-600">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">S.NO</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Caste Name</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Religion ID</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Subcastes Name</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Category</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Category No</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-center text-xs font-medium text-white uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {loading ? (
                      <tr><td colSpan="8" className="px-6 py-12 text-center text-gray-500">Loading...</td></tr>
                    ) : filtered.length === 0 ? (
                      <tr><td colSpan="8" className="px-6 py-12 text-center text-gray-500">No caste categories found</td></tr>
                    ) : (
                      paginated.map((row, idx) => (
                        <tr key={row.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors duration-150`}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{(page - 1) * PAGE_SIZE + idx + 1}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{row.caste_name}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">{row.religion_id}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">{row.subcastes_name}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">{row.category}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">{row.category_no}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <span className={`px-3 py-1 text-xs font-medium rounded-full ${(row.status || '').toLowerCase() === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                              {row.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                            <div className="flex items-center justify-center space-x-2">
                              <button
                                onClick={() => openEdit(row)}
                                className="p-2 text-white transition-colors duration-200 bg-blue-600 rounded-lg hover:bg-blue-700"
                                title="Edit Caste Category"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => remove(row.id)}
                                className="p-2 text-white transition-colors duration-200 bg-red-600 rounded-lg hover:bg-red-700"
                                title="Delete Caste Category"
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
              {filtered.length > PAGE_SIZE && (
                <div className="flex justify-end items-center gap-2 px-6 pb-6">
                  <button
                    className="px-3 py-1 rounded border border-gray-300 bg-white text-gray-700 disabled:opacity-50"
                    onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
                    disabled={page === 1}
                  >
                    Prev
                  </button>
                  <span className="text-sm text-gray-700">Page {page} of {Math.ceil(filtered.length / PAGE_SIZE)}</span>
                  <button
                    className="px-3 py-1 rounded border border-gray-300 bg-white text-gray-700 disabled:opacity-50"
                    onClick={() => setPage((currentPage) => Math.min(Math.ceil(filtered.length / PAGE_SIZE), currentPage + 1))}
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
                        <h3 className="text-lg font-medium leading-6 text-white">{editingId ? 'Edit Caste Category' : 'Add Caste Category'}</h3>
                        <button className="text-white hover:text-gray-200" onClick={onClose}>
                          <svg className="w-6 h-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </div>
                    </div>
                    <div className="px-6 py-5 bg-white">
                      {error && <div className="mb-4 p-3 rounded border border-red-200 text-red-700 bg-red-50 text-sm">{error}</div>}
                      <form className="space-y-5" onSubmit={submit}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          <div>
                            <label className="block mb-2 text-sm font-medium text-gray-700">Caste Name *</label>
                            <input
                              type="text"
                              value={form.caste_name}
                              onChange={(e) => setForm({ ...form, caste_name: e.target.value })}
                              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              placeholder="Enter caste name"
                            />
                          </div>
                          <div>
                            <label className="block mb-2 text-sm font-medium text-gray-700">Religion ID *</label>
                            <input
                              type="text"
                              value={form.religion_id}
                              onChange={(e) => setForm({ ...form, religion_id: e.target.value })}
                              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              placeholder="Enter religion id"
                            />
                          </div>
                          <div>
                            <label className="block mb-2 text-sm font-medium text-gray-700">Subcastes Name *</label>
                            <input
                              type="text"
                              value={form.subcastes_name}
                              onChange={(e) => setForm({ ...form, subcastes_name: e.target.value })}
                              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              placeholder="Enter subcastes name"
                            />
                          </div>
                          <div>
                            <label className="block mb-2 text-sm font-medium text-gray-700">Category *</label>
                            <input
                              type="text"
                              value={form.category}
                              onChange={(e) => setForm({ ...form, category: e.target.value })}
                              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              placeholder="Enter category"
                            />
                          </div>
                          <div>
                            <label className="block mb-2 text-sm font-medium text-gray-700">Category No *</label>
                            <input
                              type="text"
                              value={form.category_no}
                              onChange={(e) => setForm({ ...form, category_no: e.target.value })}
                              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              placeholder="Enter category no"
                            />
                          </div>
                          <div>
                            <label className="block mb-2 text-sm font-medium text-gray-700">Status *</label>
                            <select
                              value={form.status}
                              onChange={(e) => setForm({ ...form, status: e.target.value })}
                              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                              <option value="Active">Active</option>
                              <option value="Inactive">Inactive</option>
                            </select>
                          </div>
                        </div>
                        <div className="flex justify-end gap-3 pt-2">
                          <button type="button" onClick={onClose} className="px-6 py-2.5 font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
                          <button type="submit" className="px-6 py-2.5 font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">{editingId ? 'Update' : 'Create'}</button>
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
