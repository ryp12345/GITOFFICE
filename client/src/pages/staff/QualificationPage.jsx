import { useEffect, useMemo, useState } from 'react';
import Notification from '../../components/common/Notification';
import {
  getStaffQualifications,
  createStaffQualification,
  updateStaffQualification,
  deleteStaffQualification,
} from '../../api/staffQualificationApi';
import { getQualifications } from '../../api/qualificationApi';
import { useAuth } from '../../context/AuthContext';
import Header from '../../components/layout/Header';
import StaffSidebar from '../../components/layout/StaffSidebar';
import api from '../../api/axios';

const initialForm = {
  qualification_id: '',
  board_university: '',
  grade: '',
  yop: '',
  status: 'Persuing',
};

export default function QualificationPage() {
  const { user, token } = useAuth?.() || {};
  const [qualificationOptions, setQualificationOptions] = useState([]);
  const [rows, setRows] = useState([]);
  const [staffId, setStaffId] = useState(null);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const PAGE_SIZE = 10;

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const getDateParts = (value) => {
    if (!value) return null;

    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [year, month, day] = value.split('-').map(Number);
      return { year, month, day };
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;

    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });

    const parts = formatter.formatToParts(date);
    const year = Number(parts.find((part) => part.type === 'year')?.value);
    const month = Number(parts.find((part) => part.type === 'month')?.value);
    const day = Number(parts.find((part) => part.type === 'day')?.value);

    if (!year || !month || !day) return null;

    return { year, month, day };
  };

  const toInputDate = (value) => {
    const parts = getDateParts(value);
    if (!parts) return '';
    return `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
  };

  const formatDateDMY = (value) => {
    const parts = getDateParts(value);
    if (!parts) return '-';

    const monthIndex = parts.month - 1;
    if (monthIndex < 0 || monthIndex > 11) return '-';

    return `${String(parts.day).padStart(2, '0')}-${monthNames[monthIndex]}-${parts.year}`;
  };

  const qualificationRows = Array.isArray(rows)
    ? rows.map((row) => ({
        ...row,
        qualification_name: row?.qual_name || row?.qualification_name || '-',
      }))
    : [];

  useEffect(() => {
    async function resolveStaffId() {
      if (user?.staff_id) return user.staff_id;
      if (!user?.id) return null;

      try {
        const staffRes = await api.get('/staff');
        const staffRows = Array.isArray(staffRes?.data?.data) ? staffRes.data.data : [];
        const row = staffRows.find((item) => Number(item?.user_id) === Number(user.id));
        return row?.id || null;
      } catch (_e) {
        return null;
      }
    }

    async function fetchQualificationOptions() {
      try {
        const res = await getQualifications(token);
        const rows = Array.isArray(res?.data?.data)
          ? res.data.data
          : Array.isArray(res?.data)
            ? res.data
            : [];
        setQualificationOptions(rows);
      } catch (_e) {
        setQualificationOptions([]);
      }
    }

    async function fetchStaffQualificationRows() {
      setLoading(true);
      try {
        const resolvedStaffId = await resolveStaffId();
        setStaffId(resolvedStaffId || null);
        if (!resolvedStaffId) {
          setRows([]);
          setLoading(false);
          return;
        }

        const res = await getStaffQualifications(resolvedStaffId, token);
        const rows = Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res?.data?.data)
            ? res.data.data
            : [];
        setRows(rows);
      } catch (_e) {
        setRows([]);
      } finally {
        setLoading(false);
      }
    }

    fetchQualificationOptions();
    fetchStaffQualificationRows();
  }, [user?.id, user?.staff_id, token]);

  useEffect(() => {
    setPage(1);
  }, [search, rows]);

  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: '' }), 4000);
  };

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const onClose = () => {
    if (saving) return;
    setIsModalOpen(false);
    setEditingId(null);
    setForm(initialForm);
    setError('');
  };

  const openCreate = () => {
    setEditingId(null);
    setError('');
    setForm(initialForm);
    setIsModalOpen(true);
  };

  const openEdit = (row) => {
    setEditingId(row.id);
    setError('');
    setForm({
      qualification_id: String(row.qualification_id || ''),
      board_university: row.board_university || '',
      grade: row.grade || '',
      yop: toInputDate(row.yop),
      status: row.status || 'Pursuing',
    });
    setIsModalOpen(true);
  };

  const refreshStaffQualifications = async () => {
    if (!staffId) {
      setRows([]);
      return;
    }

    const res = await getStaffQualifications(staffId, token);
    const rows = Array.isArray(res?.data)
      ? res.data
      : Array.isArray(res?.data?.data)
        ? res.data.data
        : [];
    setRows(rows);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!staffId) {
      setError('Staff id not found');
      return;
    }

    if (!form.qualification_id || !form.board_university || !form.status) {
      setError('Qualification, Board/University, and Status are required');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        qualification_id: Number(form.qualification_id),
        board_university: form.board_university,
        grade: form.grade || null,
        yop: form.yop || null,
        status: form.status,
      };

      if (editingId) {
        await updateStaffQualification(editingId, payload, token);
        showNotification('Qualification updated successfully!', 'success');
      } else {
        await createStaffQualification(staffId, payload, token);
        showNotification('Qualification added successfully!', 'success');
      }

      await refreshStaffQualifications();
      onClose();
    } catch (err) {
      const msg = err?.response?.data?.message || 'Failed to save qualification';
      setError(msg);
      showNotification(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row) => {
    if (!row?.id) return;
    if (!window.confirm('Delete this qualification record?')) return;

    setError('');
    try {
      await deleteStaffQualification(row.id, token);
      await refreshStaffQualifications();
      showNotification('Qualification deleted successfully!', 'success');
    } catch (err) {
      const msg = err?.response?.data?.message || 'Failed to delete qualification';
      setError(msg);
      showNotification(msg, 'error');
    }
  };

  const filtered = useMemo(() => {
    const sorted = [...qualificationRows].sort((a, b) => {
      const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
      if (bTime !== aTime) return bTime - aTime;
      return (b.id || 0) - (a.id || 0);
    });

    const q = search.toLowerCase();
    const norm = (value) => String(value ?? '').toLowerCase();
    return sorted.filter((r) => (
      norm(r.qualification_name).includes(q)
      || norm(r.board_university).includes(q)
      || norm(r.grade).includes(q)
      || norm(r.status).includes(q)
    ));
  }, [qualificationRows, search]);

  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  const getStatusPillClass = (status) => {
    const normalized = String(status || '').toLowerCase();
    return normalized === 'completed' || normalized === 'active'
      ? 'bg-green-100 text-green-800'
      : 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <Header />
      <div className="flex flex-1 min-h-0">
        <StaffSidebar />
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto">
            <Notification show={notification.show} message={notification.message} type={notification.type} onClose={() => setNotification({ show: false, message: '', type: '' })} />

            <div className="mb-12 text-center">
              <h1 className="mb-2 text-4xl font-extrabold text-gray-900">My Qualification</h1>
              <p className="text-lg text-gray-600">Create, update and manage qualification records</p>
            </div>

            <div className="flex flex-col items-start justify-between gap-4 mb-6 sm:flex-row sm:items-center">
              <div className="relative w-full sm:w-72">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search qualification..."
                  className="w-full py-2 pl-10 pr-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </div>

              <button onClick={openCreate} className="flex items-center justify-center w-full px-6 py-3 font-medium text-white transition-all duration-300 transform rounded-lg shadow-lg bg-blue-600 hover:bg-blue-700 hover:-translate-y-1 hover:scale-105 sm:w-auto">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
                Add Qualification
              </button>
            </div>

            {error && (
              <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
            )}

            <div className="mb-10 overflow-hidden bg-white shadow-xl rounded-xl">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-blue-600">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">S.NO</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Qualification</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Board/University</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Year of Passing</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Grade</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-center text-xs font-medium text-white uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {loading ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-gray-500">Loading...</td>
                      </tr>
                    ) : filtered.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-gray-500">No qualification records found.</td>
                      </tr>
                    ) : (
                      paginated.map((row, idx) => (
                        <tr key={row.id || idx} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors duration-150`}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{(page - 1) * PAGE_SIZE + idx + 1}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{row.qualification_name || '-'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{row.board_university || '-'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{formatDateDMY(row.yop)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{row.grade || '-'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <span
                              className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusPillClass(row.status)}`}
                            >
                              {row.status || '-'}
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
                                onClick={() => handleDelete(row)}
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
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Prev
                  </button>
                  <span className="text-sm text-gray-700">
                    Page {page} of {Math.ceil(filtered.length / PAGE_SIZE)}
                  </span>
                  <button
                    className="px-3 py-1 rounded border border-gray-300 bg-white text-gray-700 disabled:opacity-50"
                    onClick={() => setPage((p) => Math.min(Math.ceil(filtered.length / PAGE_SIZE), p + 1))}
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
                        <h3 className="text-lg font-medium leading-6 text-white">{editingId ? 'Edit Qualification' : 'Add Qualification'}</h3>
                        <button className="text-white hover:text-gray-200" onClick={onClose}>
                          <svg className="w-6 h-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </div>
                    </div>

                    <div className="px-6 py-5 bg-white">
                      {error && <div className="mb-4 p-3 rounded border border-red-200 text-red-700 bg-red-50 text-sm">{error}</div>}

                      <form className="space-y-5" onSubmit={handleSubmit}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          <div className="md:col-span-1">
                            <label className="block mb-2 text-sm font-medium text-gray-700">Qualification Name *</label>
                            <select
                              name="qualification_id"
                              value={form.qualification_id}
                              onChange={handleChange}
                              className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              required
                            >
                              <option value="">Choose Qualification</option>
                              {qualificationOptions.map((option) => (
                                <option key={option.id} value={option.id}>{option.qual_name}</option>
                              ))}
                            </select>
                          </div>

                          <div className="md:col-span-1">
                            <label className="block mb-2 text-sm font-medium text-gray-700">Status *</label>
                            <select
                              name="status"
                              value={form.status}
                              onChange={handleChange}
                              className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              required
                            >
                              <option value="">Choose One</option>
                              <option value="Persuing">Persuing</option>
                              <option value="Completed">Completed</option>
                            </select>
                          </div>

                          <div className="md:col-span-1">
                            <label className="block mb-2 text-sm font-medium text-gray-700">Year of Passing</label>
                            <input
                              type="date"
                              name="yop"
                              value={toInputDate(form.yop)}
                              onChange={handleChange}
                              className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>

                          <div className="md:col-span-1">
                            <label className="block mb-2 text-sm font-medium text-gray-700">Board Or University *</label>
                            <input
                              type="text"
                              name="board_university"
                              value={form.board_university}
                              onChange={handleChange}
                              className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              placeholder="Board or University"
                              required
                            />
                          </div>

                          <div className="md:col-span-2">
                            <label className="block mb-2 text-sm font-medium text-gray-700">Grade (CGPA)</label>
                            <input
                              type="text"
                              name="grade"
                              value={form.grade}
                              onChange={handleChange}
                              className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              placeholder="Grade"
                            />
                          </div>
                        </div>

                        <div className="flex justify-end space-x-4 pt-4">
                          <button type="button" onClick={onClose} disabled={saving} className="inline-flex justify-center px-6 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">Cancel</button>
                          <button type="submit" disabled={saving} className="inline-flex justify-center px-6 py-3 text-sm font-medium text-white border border-transparent rounded-lg shadow-sm bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">{editingId ? 'Update Qualification' : 'Create Qualification'}</button>
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
