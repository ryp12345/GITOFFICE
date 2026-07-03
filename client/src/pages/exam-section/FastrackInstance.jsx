
import { useEffect, useMemo, useState } from 'react';
import Notification from '../../components/common/Notification';
import Header from '../../components/layout/Header';
import SidebarExamSection from '../../components/layout/SidebarExamSection';
import { getInstances, getInstanceLookup, getInstanceById, createInstance, updateInstance, deleteInstance } from '../../api/examSectionApi';

const emptyForm = {
  ft_instance_name: '',
  academic_year: '',
  start_date: '',
  end_date: '',
  scheme_id: '',
  total_fees_collected: '',
  max_theory_class: '',
  max_lab_class: '',
  deadline_date: '',
  program_ids: [],
  semesters: [],
};

const YEARS = [];
const currentYear = new Date().getFullYear();
for (let y = currentYear; y >= 2020; y--) {
  YEARS.push(`${y}-${y + 1}`);
}

export default function FastrackInstancePage() {
  const [rows, setRows] = useState([]);
  const [schemes, setSchemes] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });

  const load = async () => {
    setLoading(true);
    try {
      const [instancesRes, lookupRes] = await Promise.all([
        getInstances(),
        getInstanceLookup()
      ]);
      const instancesData = instancesRes?.data?.data || instancesRes?.data || [];
      setRows(Array.isArray(instancesData) ? instancesData : []);
      const lookupData = lookupRes?.data?.data || lookupRes?.data || {};
      setSchemes(Array.isArray(lookupData.schemes) ? lookupData.schemes : []);
      setPrograms(Array.isArray(lookupData.programs) ? lookupData.programs : []);
    } catch (e) {
      const msg = e.response?.data?.message || e.message || 'Failed to fetch data';
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
    setForm(emptyForm);
    setError('');
  };

  const openCreate = () => {
    onClose();
    setIsModalOpen(true);
  };

  const openEdit = async (row) => {
    try {
      const res = await getInstanceById(row.id);
      const data = res?.data?.data || res?.data || {};
      const instancePrograms = data.programs || [];
      const programIds = instancePrograms.map(p => p.program_id);
      const selectedSemesters = [...new Set(instancePrograms.map(p => Number(p.semester)).filter(Boolean))];

      setEditingId(row.id);
      setForm({
        ft_instance_name: row.ft_instance_name || data.ft_instance_name || '',
        academic_year: row.academic_year || data.academic_year || '',
        start_date: normalizeDate(row.start_date || data.start_date),
        end_date: normalizeDate(row.end_date || data.end_date),
        scheme_id: row.scheme_id || data.scheme_id || '',
        total_fees_collected: row.total_fees_collected || data.total_fees_collected || '',
        max_theory_class: row.max_theory_class || data.max_theory_class || '',
        max_lab_class: row.max_lab_class || data.max_lab_class || '',
        deadline_date: normalizeDate(row.deadline_date ? row.deadline_date.slice(0, 16) : (data.deadline_date ? data.deadline_date.slice(0, 16) : '')),
        program_ids: programIds,
        semesters: selectedSemesters,
      });
      setIsModalOpen(true);
    } catch (e) {
      const msg = e.response?.data?.message || e.message || 'Failed to load instance details';
      showNotification(msg, 'error');
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.ft_instance_name.trim()) {
      setError('Fastrack instance name is required');
      return;
    }
    if (!form.academic_year) {
      setError('Academic year is required');
      return;
    }
    if (!form.start_date) {
      setError('Start date is required');
      return;
    }
    if (!form.end_date) {
      setError('End date is required');
      return;
    }
    if (!form.scheme_id) {
      setError('Scheme is required');
      return;
    }
    if (form.program_ids.length === 0) {
      setError('At least one program must be selected');
      return;
    }
    if (form.semesters.length === 0) {
      setError('At least one semester must be selected');
      return;
    }

    try {
      const payload = {
        ft_instance_name: form.ft_instance_name,
        academic_year: form.academic_year,
        start_date: form.start_date,
        end_date: form.end_date,
        scheme_id: form.scheme_id,
        total_fees_collected: form.total_fees_collected,
        max_theory_class: form.max_theory_class,
        max_lab_class: form.max_lab_class,
        deadline_date: form.deadline_date,
        program_ids: form.program_ids,
        semesters: form.semesters,
      };
      if (editingId) {
        await updateInstance(editingId, payload);
        showNotification('Fastrack instance updated successfully!', 'success');
      } else {
        await createInstance(payload);
        showNotification('Fastrack Instances Added Successfully', 'success');
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
    if (!window.confirm('Are you sure you want to delete this fastrack instance?')) return;
    try {
      await deleteInstance(id);
      load();
      showNotification('Fastrack Instance Deleted successfully', 'success');
    } catch (e) {
      const msg = e.response?.data?.message || e.message || 'Failed to delete';
      alert(msg);
      showNotification(msg, 'error');
    }
  };

  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: '' }), 4000);
  };

  const normalizeDate = (value) => {
    if (!value) return '';
    if (typeof value === 'string') return value.slice(0, 10);
    if (value instanceof Date) return value.toISOString().slice(0, 10);
    return '';
  };

  const toggleProgram = (id) => {
    setForm(prev => ({
      ...prev,
      program_ids: prev.program_ids.includes(id)
        ? prev.program_ids.filter(x => x !== id)
        : [...prev.program_ids, id]
    }));
  };

  const toggleSemester = (val) => {
    setForm(prev => ({
      ...prev,
      semesters: prev.semesters.includes(val)
        ? prev.semesters.filter(x => x !== val)
        : [...prev.semesters, val]
    }));
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const getSchemeName = (id) => {
    const scheme = schemes.find(s => s.id === id);
    return scheme ? scheme.scheme_name : 'N/A';
  };

  const getProgramNameById = (id) => {
    const p = programs.find(prog => prog.id === id);
    return p ? p.program_name : (id ? `Program ${id}` : 'N/A');
  };

  const getProgramNames = (programIds) => {
    if (!Array.isArray(programIds) || programIds.length === 0) return 'N/A';
    return programIds.map(id => getProgramNameById(id)).join(', ');
  };

  // Pagination
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return rows.filter(r => {
      const schemeName = getSchemeName(r.scheme_id).toLowerCase();
      const programCodes = r.program_code ? r.program_code.split(',').map(s => s.trim()).filter(Boolean) : [];
      const programNames = programs
        .filter(p => programCodes.includes(p.program_code))
        .map(p => p.program_name)
        .join(', ')
        .toLowerCase();
      const semesterValues = r.semesters ? String(r.semesters).split(',').map(s => s.trim()).filter(Boolean).join(', ') : '';
      return (
        r.ft_instance_name?.toLowerCase().includes(q) ||
        r.academic_year?.toLowerCase().includes(q) ||
        schemeName.includes(q) ||
        programNames.includes(q) ||
        semesterValues.includes(q)
      );
    });
  }, [rows, search, schemes, programs]);

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
          <div className="max-w-full mx-auto">
            <Notification show={notification.show} message={notification.message} type={notification.type} onClose={() => setNotification({ show: false, message: '', type: '' })} />
            <div className="mb-12 text-center">
              <h1 className="mb-2 text-4xl font-extrabold text-gray-900">Fastrack Instance</h1>
              <p className="text-lg text-gray-600">Create, update and manage fastrack instances</p>
            </div>

            <div className="flex flex-col items-start justify-between gap-4 mb-6 sm:flex-row sm:items-center">
              <div className="relative w-full sm:w-72">
                <input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Search instances..." className="w-full py-2 pl-10 pr-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </div>
              <button onClick={openCreate} className="flex items-center justify-center w-full px-6 py-3 font-medium text-white transition-all duration-300 transform rounded-lg shadow-lg bg-blue-600 hover:bg-blue-700 hover:-translate-y-1 hover:scale-105 sm:w-auto">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
                Add Fastrack Instance
              </button>
            </div>

            <div className="mb-10 overflow-hidden bg-white shadow-xl rounded-xl">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-blue-600">
                    <tr>
                      <th className="px-4 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">S.NO</th>
                      <th className="px-4 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">FT Instance Name</th>
                      <th className="px-4 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Academic Year</th>
                      <th className="px-4 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Start Date</th>
                      <th className="px-4 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">End Date</th>
                      <th className="px-4 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Scheme Name</th>
                      <th className="px-4 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Program Name</th>
                      <th className="px-4 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Semester</th>
                      <th className="px-4 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Total Fees Collected</th>
                      <th className="px-4 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Max Theory</th>
                      <th className="px-4 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Max Lab</th>
                      <th className="px-4 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Deadline Date</th>
                      <th className="px-4 py-4 text-center text-xs font-medium text-white uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {loading ? (
                      <tr><td colSpan="13" className="px-6 py-12 text-center text-gray-500">Loading...</td></tr>
                    ) : filtered.length === 0 ? (
                      <tr><td colSpan="13" className="px-6 py-12 text-center text-gray-500">No instances found</td></tr>
                    ) : (
                      paginated.map((row, idx) => {
                        const programCodes = row.program_code
                          ? row.program_code.split(',').map(s => s.trim()).filter(Boolean)
                          : [];
                        const programIds = programCodes
                          .map(code => {
                            const p = programs.find(prog => prog.program_code === code);
                            return p ? p.id : null;
                          })
                          .filter(Boolean);
                        const semesterValues = row.semesters
                          ? String(row.semesters).split(',').map(s => s.trim()).filter(Boolean)
                          : [];
                        return (
                          <tr key={row.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors duration-150`}>
                            <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{(page - 1) * PAGE_SIZE + idx + 1}</td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{row.ft_instance_name}</td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">{row.academic_year}</td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">{formatDate(row.start_date)}</td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">{formatDate(row.end_date)}</td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">{getSchemeName(row.scheme_id)}</td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">
                              {programIds.length > 0 ? getProgramNames(programIds) : (row.program_code ? row.program_code : 'N/A')}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">
                              {semesterValues.length > 0 ? semesterValues.join(', ') : (row.semesters ? row.semesters : 'N/A')}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">{row.total_fees_collected}</td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">{row.max_theory_class}</td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">{row.max_lab_class}</td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">{formatDateTime(row.deadline_date)}</td>
                            <td className="px-4 py-4 whitespace-nowrap text-center text-sm font-medium">
                              <div className="flex items-center justify-center space-x-2">
                                <button
                                  onClick={() => openEdit(row)}
                                  className="p-2 text-white transition-colors duration-200 bg-blue-600 rounded-lg hover:bg-blue-700"
                                  title="Edit Fastrack Instance"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => remove(row.id)}
                                  className="p-2 text-white transition-colors duration-200 bg-red-600 rounded-lg hover:bg-red-700"
                                  title="Delete Fastrack Instance"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
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
                  <div className="inline-block overflow-hidden text-left align-bottom transition-all transform bg-white rounded-lg shadow-xl sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
                    <div className="px-6 py-4 bg-blue-600">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-medium leading-6 text-white">{editingId ? 'Edit Fastrack Instance' : 'Add New Fastrack Instance'}</h3>
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
                            <label className="block mb-2 text-sm font-medium text-gray-700">Fastrack Instance Name <span className="text-red-500">*</span></label>
                            <input type="text" value={form.ft_instance_name} onChange={e => setForm({ ...form, ft_instance_name: e.target.value })} className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="Fastrack Instance Name" required />
                          </div>
                          <div>
                            <label className="block mb-2 text-sm font-medium text-gray-700">Academic Year <span className="text-red-500">*</span></label>
                            <select value={form.academic_year} onChange={e => setForm({ ...form, academic_year: e.target.value })} className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" required>
                              <option value="">Choose Year</option>
                              {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          <div>
                            <label className="block mb-2 text-sm font-medium text-gray-700">Start Date <span className="text-red-500">*</span></label>
                            <input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" required />
                          </div>
                          <div>
                            <label className="block mb-2 text-sm font-medium text-gray-700">Close Date <span className="text-red-500">*</span></label>
                            <input type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" required />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          <div>
                            <label className="block mb-2 text-sm font-medium text-gray-700">Schemes <span className="text-red-500">*</span></label>
                            <select value={form.scheme_id} onChange={e => setForm({ ...form, scheme_id: e.target.value })} className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" required>
                              <option value="">Choose Scheme</option>
                              {schemes.map(s => <option key={s.id} value={s.id}>{s.scheme_name}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="block mb-2 text-sm font-medium text-gray-700">Total Fees Collected <span className="text-red-500">*</span></label>
                            <input type="number" value={form.total_fees_collected} onChange={e => setForm({ ...form, total_fees_collected: e.target.value })} className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="Enter Fees" required />
                          </div>
                        </div>

                         <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                           <div>
                             <label className="block mb-2 text-sm font-medium text-gray-700">Choose the Programs <span className="text-red-500">*</span></label>
                             <div className="flex flex-col gap-2 max-h-72 overflow-y-auto border border-gray-300 rounded-md bg-gray-50 p-4">
                               {(programs.length > 0 ? programs : form.program_ids.map(id => ({ id, program_name: `Program ${id}`, program_code: '' }))).map(p => (
                                 <div key={p.id} className="flex items-center">
                                   <input type="checkbox" id={`prog_${p.id}`} checked={form.program_ids.includes(p.id)} onChange={() => toggleProgram(p.id)} className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                                   <label htmlFor={`prog_${p.id}`} className="ml-3 block text-sm text-gray-700 select-none">{p.program_name}</label>
                                 </div>
                               ))}
                             </div>
                           </div>
                           <div>
                             <label className="block mb-2 text-sm font-medium text-gray-700">Semester <span className="text-red-500">*</span></label>
                             <div className="flex flex-col gap-2 max-h-72 overflow-y-auto border border-gray-300 rounded-md bg-gray-50 p-4">
                               {[1,2,3,4,5,6,7,8,9,10].map(sem => (
                                 <div key={sem} className="flex items-center">
                                   <input type="checkbox" id={`sem_${sem}`} checked={form.semesters.includes(sem)} onChange={() => toggleSemester(sem)} className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                                   <label htmlFor={`sem_${sem}`} className="ml-3 block text-sm text-gray-700 select-none">{sem} Semester</label>
                                 </div>
                               ))}
                             </div>
                           </div>
                         </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          <div>
                            <label className="block mb-2 text-sm font-medium text-gray-700">Max Theory Class <span className="text-red-500">*</span></label>
                            <input type="text" value={form.max_theory_class} onChange={e => setForm({ ...form, max_theory_class: e.target.value })} className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="Max Theory Class" required />
                          </div>
                          <div>
                            <label className="block mb-2 text-sm font-medium text-gray-700">Max Lab Class <span className="text-red-500">*</span></label>
                            <input type="text" value={form.max_lab_class} onChange={e => setForm({ ...form, max_lab_class: e.target.value })} className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="Max Lab Class" required />
                          </div>
                        </div>

                        {editingId && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                              <label className="block mb-2 text-sm font-medium text-gray-700">Deadline Date n Time <span className="text-red-500">*</span></label>
                              <input type="datetime-local" value={form.deadline_date} onChange={e => setForm({ ...form, deadline_date: e.target.value })} className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" required />
                            </div>
                          </div>
                        )}

                        <div className="flex justify-end space-x-4 pt-4">
                          <button type="button" onClick={onClose} className="inline-flex justify-center px-6 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">Cancel</button>
                          <button type="submit" className="inline-flex justify-center px-6 py-3 text-sm font-medium text-white border border-transparent rounded-lg shadow-sm bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">{editingId ? 'Update Fastrack Instance' : 'Add Fastrack Instance'}</button>
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
