import { useEffect, useMemo, useState } from 'react';
import Notification from '../../components/common/Notification';
import Header from '../../components/layout/Header';
import SidebarExamSection from '../../components/layout/SidebarExamSection';
import { getCoeprograms, getCoeprogramDepartments, createCoeprogram, updateCoeprogram, deleteCoeprogram } from '../../api/examSectionApi';

const initialForm = {
  program_name: '',
  program_code: '',
  start_date: '',
  close_date: '',
  department_id: '',
  type: '',
  program_intake: '',
};

export default function CoeprogramPage() {
  const [rows, setRows] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState('');
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const PAGE_SIZE = 10;

  const load = async () => {
    setLoading(true);
    try {
      const [listRes, deptRes] = await Promise.all([getCoeprograms(), getCoeprogramDepartments()]);
      const listData = listRes?.data?.data || listRes?.data || [];
      const deptData = deptRes?.data?.data || deptRes?.data || [];
      setRows(Array.isArray(listData) ? listData : []);
      setDepartments(Array.isArray(deptData) ? deptData : []);
    } catch (e) {
      const msg = e.response?.data?.message || e.message || 'Failed to fetch programs';
      showNotification(msg, 'error');
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

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
      program_name: row.program_name || '',
      program_code: row.program_code || '',
      start_date: row.start_date || '',
      close_date: row.close_date || '',
      department_id: row.department_id || '',
      type: row.type || '',
      program_intake: row.program_intake || '',
    });
    setIsModalOpen(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.program_name.trim()) { setError('Program name is required'); return; }
    if (!form.program_code.trim()) { setError('Program code is required'); return; }
    if (!form.department_id) { setError('Department is required'); return; }
    if (!form.type) { setError('UG/PG type is required'); return; }
    try {
      const payload = {
        program_name: form.program_name,
        program_code: form.program_code,
        start_date: form.start_date || null,
        close_date: form.close_date || null,
        department_id: Number(form.department_id),
        type: form.type,
        program_intake: form.program_intake,
      };
      if (editingId) {
        await updateCoeprogram(editingId, payload);
        showNotification('Program Updated successfully', 'success');
      } else {
        await createCoeprogram(payload);
        showNotification('New Program Added successfully', 'success');
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
    if (!window.confirm('Are you sure you want to delete this program?')) return;
    try {
      await deleteCoeprogram(id);
      load();
      showNotification('Program Deleted successfully', 'success');
    } catch (e) {
      const msg = e.response?.data?.message || e.message || 'Failed to delete program';
      showNotification(msg, 'error');
    }
  };

  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: '' }), 4000);
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return rows.filter((r) =>
      [r.program_name, r.program_code, r.type, r.dept_name, r.program_intake]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [rows, search]);

  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  useEffect(() => { setPage(1); }, [search]);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <Header />
      <div className="flex flex-1 min-h-0">
        <SidebarExamSection />
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto">
            <Notification show={notification.show} message={notification.message} type={notification.type} onClose={() => setNotification({ show: false, message: '', type: '' })} />
            <div className="mb-12 text-center">
              <h1 className="mb-2 text-4xl font-extrabold text-gray-900">Programs Details</h1>
              <p className="text-lg text-gray-600">Create, update and manage programs</p>
            </div>

            <div className="flex flex-col items-start justify-between gap-4 mb-6 sm:flex-row sm:items-center">
              <div className="relative w-full sm:w-72">
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search programs..." className="w-full py-2 pl-10 pr-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </div>
              <button onClick={openCreate} className="flex items-center justify-center w-full px-6 py-3 font-medium text-white transition-all duration-300 transform rounded-lg shadow-lg bg-blue-600 hover:bg-blue-700 hover:-translate-y-1 hover:scale-105 sm:w-auto">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
                Add Programs
              </button>
            </div>

            <div className="mb-10 overflow-hidden bg-white shadow-xl rounded-xl">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-blue-600">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase">S.No</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase">Program Name</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase">Program Code</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase">Start Date</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase">Close Date</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase">UG\PG</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase">Department</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase">Program Intake</th>
                      <th className="px-6 py-4 text-center text-xs font-medium text-white uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {loading ? (
                      <tr><td colSpan="9" className="px-6 py-12 text-center text-gray-500">Loading...</td></tr>
                    ) : filtered.length === 0 ? (
                      <tr><td colSpan="9" className="px-6 py-12 text-center text-gray-500">No programs found</td></tr>
                    ) : (
                      paginated.map((row, idx) => (
                          <tr key={row.id} className={`${((page - 1) * PAGE_SIZE + idx + 1) % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors duration-150`}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{(page - 1) * PAGE_SIZE + idx + 1}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{row.program_name}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{row.program_code}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{row.start_date || '--NA--'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{row.close_date || '--NA--'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{row.type}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{row.dept_name || '--NA--'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{row.program_intake ?? '--NA--'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                            <div className="flex items-center justify-center space-x-2">
                              <button onClick={() => openEdit(row)} className="p-2 text-white transition-colors duration-200 bg-blue-600 rounded-lg hover:bg-blue-700" title="Edit Program">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                              </button>
                              <button onClick={() => remove(row.id)} className="p-2 text-white transition-colors duration-200 bg-red-600 rounded-lg hover:bg-red-700" title="Delete Program">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
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
                  <button className="px-3 py-1 rounded border border-gray-300 bg-white text-gray-700 disabled:opacity-50" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>Prev</button>
                  <span className="text-sm text-gray-700">Page {page} of {Math.ceil(filtered.length / PAGE_SIZE)}</span>
                  <button className="px-3 py-1 rounded border border-gray-300 bg-white text-gray-700 disabled:opacity-50" onClick={() => setPage((p) => Math.min(Math.ceil(filtered.length / PAGE_SIZE), p + 1))} disabled={page === Math.ceil(filtered.length / PAGE_SIZE)}>Next</button>
                </div>
              )}
            </div>

            {isModalOpen && (
              <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
                <div className="flex items-end justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                  <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose} />
                  <div className="inline-block overflow-hidden text-left align-bottom transition-all transform bg-white rounded-lg shadow-xl sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
                    <div className="px-6 py-4 bg-blue-600">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-medium leading-6 text-white">{editingId ? 'Edit Program' : 'Add New Program'}</h3>
                        <button className="text-white hover:text-gray-200" onClick={onClose}>
                          <svg className="w-6 h-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </div>
                    </div>
                    <div className="px-6 py-5 bg-white">
                      {error && <div className="mb-4 p-3 rounded border border-red-200 text-red-700 bg-red-50 text-sm">{error}</div>}
                      <form className="space-y-5" onSubmit={submit}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block mb-2 text-sm font-medium text-gray-700">Program Name <span className="text-red-500">*</span></label>
                            <input type="text" value={form.program_name} onChange={(e) => setForm({ ...form, program_name: e.target.value })} className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="Program Name" required />
                          </div>
                          <div>
                            <label className="block mb-2 text-sm font-medium text-gray-700">Program Code <span className="text-red-500">*</span></label>
                            <input type="text" value={form.program_code} onChange={(e) => setForm({ ...form, program_code: e.target.value })} className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="Program Code" required />
                          </div>
                          <div>
                            <label className="block mb-2 text-sm font-medium text-gray-700">Start Date <span className="text-red-500">*</span></label>
                            <input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                          </div>
                          <div>
                            <label className="block mb-2 text-sm font-medium text-gray-700">Close Date <span className="text-red-500">*</span></label>
                            <input type="date" value={form.close_date} onChange={(e) => setForm({ ...form, close_date: e.target.value })} className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                          </div>
                          <div>
                            <label className="block mb-2 text-sm font-medium text-gray-700">Department <span className="text-red-500">*</span></label>
                            <select value={form.department_id} onChange={(e) => setForm({ ...form, department_id: e.target.value })} className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" required>
                              <option value="">Choose a Department</option>
                              {departments.map((d) => <option key={d.id} value={d.id}>{d.dept_name}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="block mb-2 text-sm font-medium text-gray-700">UG\PG <span className="text-red-500">*</span></label>
                            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" required>
                              <option value="">Choose One</option>
                              <option value="UG">UG</option>
                              <option value="PG">PG</option>
                            </select>
                          </div>
                          <div>
                            <label className="block mb-2 text-sm font-medium text-gray-700">Program Intake <span className="text-red-500">*</span></label>
                            <input type="text" value={form.program_intake} onChange={(e) => setForm({ ...form, program_intake: e.target.value })} className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="Program Intake" />
                          </div>
                        </div>
                        <div className="flex justify-end space-x-4 pt-4">
                          <button type="button" onClick={onClose} className="inline-flex justify-center px-6 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">Cancel</button>
                          <button type="submit" className="inline-flex justify-center px-6 py-3 text-sm font-medium text-white border border-transparent rounded-lg shadow-sm bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">{editingId ? 'Update Program' : 'Add Program'}</button>
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