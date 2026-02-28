import { useEffect, useMemo, useState } from 'react';
import Notification from '../../../components/common/Notification';
import Header from '../../../components/layout/Header';
import Sidebar from '../../../components/layout/Sidebar';
import { useAuth } from '../../../context/AuthContext';
import {
  createHolidayRH,
  deleteHolidayRH,
  getHolidayRHList,
  updateHolidayRH,
} from '../../../api/holidayrhApi';

const initialForm = {
  year: new Date().getFullYear(),
  title: '',
  start: '',
  day: '',
  type: 'Holiday',
};

const getWeekday = (dateText) => {
  if (!dateText) return '';
  const date = new Date(dateText);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', { weekday: 'long' });
};

export default function HolidayRHListPage() {
  const { token } = useAuth?.() || {};
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState('');
  const [yearFilter, setYearFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const [notification, setNotification] = useState({
    show: false,
    message: '',
    type: '',
  });

  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: '' }), 4000);
  };

  const load = async () => {
    setLoading(true);
    try {
      const res = await getHolidayRHList(token);
      setRows(res.data?.data || []);
    } catch {
      setRows([]);
      showNotification('Failed to load Holiday/RH list', 'error');
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
    setEditingId(null);
    setForm(initialForm);
    setError('');
    setIsModalOpen(true);
  };

  const openEdit = (row) => {
    setEditingId(row.id);
    setForm({
      year: row.year || new Date().getFullYear(),
      title: row.title || '',
      start: row.start ? String(row.start).slice(0, 10) : '',
      day: row.day || '',
      type: row.type || 'Holiday',
    });
    setError('');
    setIsModalOpen(true);
  };

  const validate = () => {
    if (!form.year) return 'Year is required';
    if (!form.title.trim()) return 'Title is required';
    if (!form.start) return 'Date is required';
    if (!form.day.trim()) return 'Day is required';
    if (!['Holiday', 'RH'].includes(form.type)) return 'Type must be Holiday or RH';
    return '';
  };

  const submit = async (e) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    const payload = {
      year: Number(form.year),
      title: form.title.trim(),
      start: form.start,
      day: form.day.trim(),
      type: form.type,
    };

    try {
      if (editingId) {
        await updateHolidayRH(editingId, payload, token);
        showNotification('Holiday/RH updated successfully', 'success');
      } else {
        await createHolidayRH(payload, token);
        showNotification('Holiday/RH created successfully', 'success');
      }
      onClose();
      load();
    } catch (e1) {
      const msg = e1.response?.data?.message || e1.message || 'Failed to save Holiday/RH';
      setError(msg);
      showNotification(msg, 'error');
    }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this Holiday/RH record?')) return;
    try {
      await deleteHolidayRH(id, token);
      showNotification('Holiday/RH deleted successfully', 'success');
      load();
    } catch (e1) {
      showNotification(e1.response?.data?.message || e1.message || 'Failed to delete Holiday/RH', 'error');
    }
  };

  const yearOptions = useMemo(() => {
    const years = [...new Set(rows.map((row) => String(row.year || '')).filter(Boolean))];
    return years.sort((a, b) => Number(b) - Number(a));
  }, [rows]);

  const filtered = useMemo(() => {
    const sorted = [...rows].sort((a, b) => {
      const aDate = a.start ? new Date(a.start).getTime() : 0;
      const bDate = b.start ? new Date(b.start).getTime() : 0;
      if (bDate !== aDate) return bDate - aDate;
      return (b.id || 0) - (a.id || 0);
    });

    const q = search.toLowerCase();
    return sorted.filter((row) => {
      const matchesYear = yearFilter === 'all' || String(row.year) === yearFilter;
      const matchesSearch =
        String(row.year || '').toLowerCase().includes(q) ||
        String(row.title || '').toLowerCase().includes(q) ||
        String(row.day || '').toLowerCase().includes(q) ||
        String(row.type || '').toLowerCase().includes(q);

      return matchesYear && matchesSearch;
    });
  }, [rows, search, yearFilter]);

  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  useEffect(() => {
    setPage(1);
  }, [rows, search, yearFilter]);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <Header />
      <div className="flex flex-1 min-h-0">
        <Sidebar />
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto">
            <Notification
              show={notification.show}
              message={notification.message}
              type={notification.type}
              onClose={() => setNotification({ show: false, message: '', type: '' })}
            />

            <div className="mb-12 text-center">
              <h1 className="mb-2 text-4xl font-extrabold text-gray-900">Holiday RH List</h1>
              <p className="text-lg text-gray-600">Create, update and manage holiday and RH entries</p>
            </div>

            <div className="flex flex-col items-start justify-between gap-4 mb-6 sm:flex-row sm:items-center">
              <div className="relative w-full sm:w-72">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search holiday/RH..."
                  className="w-full py-2 pl-10 pr-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>

              <div className="w-full sm:w-48">
                <select
                  value={yearFilter}
                  onChange={(e) => setYearFilter(e.target.value)}
                  className="w-full py-2 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Years</option>
                  {yearOptions.map((year) => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>

              <button
                onClick={openCreate}
                className="flex items-center justify-center w-full px-6 py-3 font-medium text-white transition-all duration-300 transform rounded-lg shadow-lg bg-blue-600 hover:bg-blue-700 hover:-translate-y-1 hover:scale-105 sm:w-auto"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                Add Holiday/RH
              </button>
            </div>

            <div className="mb-10 overflow-hidden bg-white shadow-xl rounded-xl">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-blue-600">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">S.NO</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Year</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Title</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Date</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Day</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Type</th>
                      <th className="px-6 py-4 text-center text-xs font-medium text-white uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>

                  <tbody className="bg-white divide-y divide-gray-200">
                    {loading ? (
                      <tr>
                        <td colSpan="7" className="px-6 py-12 text-center text-gray-500">Loading...</td>
                      </tr>
                    ) : filtered.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="px-6 py-12 text-center text-gray-500">No records found</td>
                      </tr>
                    ) : (
                      paginated.map((row, idx) => (
                        <tr key={row.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors duration-150`}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{(page - 1) * PAGE_SIZE + idx + 1}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{row.year}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{row.title}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{row.start ? new Date(row.start).toLocaleDateString() : '-'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{row.day}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <span className={`px-3 py-1 text-xs font-medium rounded-full ${row.type === 'Holiday' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                              {row.type}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                            <div className="flex items-center justify-center space-x-2">
                              <button
                                onClick={() => openEdit(row)}
                                className="p-2 text-white transition-colors duration-200 bg-blue-600 rounded-lg hover:bg-blue-700"
                                title="Edit"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => remove(row.id)}
                                className="p-2 text-white transition-colors duration-200 bg-red-600 rounded-lg hover:bg-red-700"
                                title="Delete"
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
                        <h3 className="text-lg font-medium leading-6 text-white">{editingId ? 'Edit Holiday/RH' : 'Add Holiday/RH'}</h3>
                        <button className="text-white hover:text-gray-200" onClick={onClose}>
                          <svg className="w-6 h-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    <div className="px-6 py-5 bg-white">
                      {error && (
                        <div className="mb-4 p-3 rounded border border-red-200 text-red-700 bg-red-50 text-sm">
                          {error}
                        </div>
                      )}

                      <form className="space-y-5" onSubmit={submit}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          <div>
                            <label className="block mb-2 text-sm font-medium text-gray-700">Year *</label>
                            <input
                              type="number"
                              min="1900"
                              max="2100"
                              value={form.year}
                              onChange={(e) => setForm({ ...form, year: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                              required
                            />
                          </div>

                          <div>
                            <label className="block mb-2 text-sm font-medium text-gray-700">Type *</label>
                            <select
                              value={form.type}
                              onChange={(e) => setForm({ ...form, type: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                              required
                            >
                              <option value="Holiday">Holiday</option>
                              <option value="RH">RH</option>
                            </select>
                          </div>

                          <div className="md:col-span-2">
                            <label className="block mb-2 text-sm font-medium text-gray-700">Title *</label>
                            <input
                              type="text"
                              value={form.title}
                              onChange={(e) => setForm({ ...form, title: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                              required
                            />
                          </div>

                          <div>
                            <label className="block mb-2 text-sm font-medium text-gray-700">Date *</label>
                            <input
                              type="date"
                              value={form.start}
                              onChange={(e) => setForm({ ...form, start: e.target.value, day: getWeekday(e.target.value) })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                              required
                            />
                          </div>

                          <div>
                            <label className="block mb-2 text-sm font-medium text-gray-700">Day *</label>
                            <input
                              type="text"
                              value={form.day}
                              onChange={(e) => setForm({ ...form, day: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                              required
                            />
                          </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-2">
                          <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                          >
                            {editingId ? 'Update' : 'Create'}
                          </button>
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
