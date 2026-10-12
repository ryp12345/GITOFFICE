import { useEffect, useMemo, useState } from 'react';
import { useNotify } from '../../notifications/NotificationProvider';
import Header from '../../components/layout/Header';
import Sidebar from '../../components/layout/Sidebar';
import { getNoticeMeta, getNotices, createNotice, updateNotice, deleteNotice } from '../../api/noticeApi';
import { getErrorMessage } from '../../utils/errors';

// Shared notice board management page. Each portal mounts it with its own sidebar, e.g.
// <NoticeManagement SidebarComponent={PrincipalDeansidebar} />. What the user may do comes from
// /notices/meta, so this page holds no role checks of its own.

const MAX_TEXT_LENGTH = 255;
const PAGE_SIZE = 10;

const today = () => {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
};

const emptyForm = () => ({
  title: '',
  description: '',
  date: today(),
  staff_type: 'All',
  department_ids: [],
});

const formatDate = (value) => {
  if (!value) return '-';
  const [year, month, day] = String(value).slice(0, 10).split('-');
  return `${day}-${month}-${year}`;
};

function validate(form) {
  const errors = {};
  if (!form.title.trim()) errors.title = 'Title is required';
  if (!form.description.trim()) errors.description = 'Description is required';
  if (!form.date) errors.date = 'Date is required';
  if (!form.staff_type) errors.staff_type = 'Staff type is required';
  if (form.department_ids.length === 0) errors.department_ids = 'Select at least one department';
  return errors;
}

const inputClass = (hasError) =>
  `w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${hasError ? 'border-red-400' : 'border-gray-300'}`;

function FieldError({ message }) {
  return message ? <p className="mt-1 text-xs text-red-600">{message}</p> : null;
}

export default function NoticeManagement({ SidebarComponent = Sidebar }) {
  const notify = useNotify();
  const showNotification = (message, type = 'success') => notify.notify(message, { type });

  const [meta, setMeta] = useState({ abilities: { create: false, manageAll: false }, departments: [], staffTypes: [] });
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const loadNotices = async () => {
    const res = await getNotices();
    setRows(Array.isArray(res?.data?.data) ? res.data.data : []);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError('');
      try {
        const metaRes = await getNoticeMeta();
        const nextMeta = metaRes?.data?.data;
        if (cancelled || !nextMeta) return;
        setMeta(nextMeta);
        if (nextMeta.abilities?.create) await loadNotices();
      } catch (error) {
        if (!cancelled) setLoadError(getErrorMessage(error, 'Failed to load notices'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const { abilities, departments, staffTypes } = meta;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => [
      row.title,
      row.description,
      row.staff_type,
      row.author_name,
      row.author_email,
      ...(row.departments || []).map((d) => d.dept_shortname),
    ].some((value) => value?.toLowerCase().includes(q)));
  }, [rows, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = useMemo(() => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [filtered, page]);

  useEffect(() => {
    setPage(1);
  }, [search, rows]);

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setForm(emptyForm());
    setFieldErrors({});
    setFormError('');
  };

  const openCreate = () => {
    closeModal();
    setIsModalOpen(true);
  };

  const openEdit = (row) => {
    setEditingId(row.id);
    setForm({
      title: row.title || '',
      description: row.description || '',
      date: row.date ? String(row.date).slice(0, 10) : today(),
      staff_type: row.staff_type || 'All',
      department_ids: (row.departments || []).map((d) => Number(d.id)),
    });
    setFieldErrors({});
    setFormError('');
    setIsModalOpen(true);
  };

  const setField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const toggleDepartment = (id) => {
    setField(
      'department_ids',
      form.department_ids.includes(id) ? form.department_ids.filter((d) => d !== id) : [...form.department_ids, id]
    );
  };

  const allSelected = departments.length > 0 && form.department_ids.length === departments.length;
  const toggleAllDepartments = () => setField('department_ids', allSelected ? [] : departments.map((d) => d.id));

  const submit = async (e) => {
    e.preventDefault();
    setFormError('');

    const errors = validate(form);
    if (Object.keys(errors).length) {
      setFieldErrors(errors);
      return;
    }

    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      date: form.date,
      staff_type: form.staff_type,
      department_ids: form.department_ids,
    };

    setSaving(true);
    try {
      if (editingId) {
        await updateNotice(editingId, payload);
        showNotification('Notice updated successfully');
      } else {
        await createNotice(payload);
        showNotification('Notice raised successfully');
      }
      closeModal();
      await loadNotices();
    } catch (error) {
      const serverErrors = error?.response?.data?.errors;
      if (serverErrors && typeof serverErrors === 'object') setFieldErrors(serverErrors);
      const msg = getErrorMessage(error, 'Failed to save notice');
      setFormError(msg);
      showNotification(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row) => {
    if (!window.confirm(`Delete the notice "${row.title}"? This action is permanent.`)) return;
    try {
      await deleteNotice(row.id);
      showNotification('Notice deleted successfully');
      await loadNotices();
    } catch (error) {
      showNotification(getErrorMessage(error, 'Failed to delete notice'), 'error');
    }
  };

  const columnCount = abilities.manageAll ? 8 : 7;

  const renderBody = () => {
    if (loading) {
      return <tr><td colSpan={columnCount} className="px-6 py-12 text-center text-gray-500">Loading...</td></tr>;
    }
    if (filtered.length === 0) {
      return (
        <tr>
          <td colSpan={columnCount} className="px-6 py-12 text-center text-gray-500">
            {search ? 'No notices match your search' : 'No notices raised yet'}
          </td>
        </tr>
      );
    }
    return paginated.map((row, idx) => (
      <tr key={row.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors duration-150`}>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{(page - 1) * PAGE_SIZE + idx + 1}</td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatDate(row.date)}</td>
        <td className="px-6 py-4 text-sm font-medium text-gray-900">{row.title}</td>
        <td className="px-6 py-4 text-sm text-gray-600 max-w-xs break-words">{row.description}</td>
        <td className="px-6 py-4 whitespace-nowrap text-sm">
          <span className="px-3 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">{row.staff_type}</span>
        </td>
        <td className="px-6 py-4 text-sm">
          <div className="flex flex-wrap gap-1 max-w-xs">
            {(row.departments || []).map((d) => (
              <span key={d.id} title={d.dept_name} className="px-2 py-0.5 text-xs rounded bg-gray-100 text-gray-700">{d.dept_shortname}</span>
            ))}
          </div>
        </td>
        {abilities.manageAll && (
          <td className="px-6 py-4 text-sm text-gray-600">
            <div>{row.author_name || row.author_email || '-'}</div>
            {row.author_role && <div className="text-xs text-gray-400">{row.author_role}</div>}
          </td>
        )}
        <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
          <div className="flex items-center justify-center space-x-2">
            <button onClick={() => openEdit(row)} className="p-2 text-white transition-colors duration-200 bg-blue-600 rounded-lg hover:bg-blue-700" title="Edit notice" aria-label={`Edit ${row.title}`}>
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button onClick={() => remove(row)} className="p-2 text-white transition-colors duration-200 bg-red-600 rounded-lg hover:bg-red-700" title="Delete notice" aria-label={`Delete ${row.title}`}>
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </td>
      </tr>
    ));
  };

  const renderContent = () => {
    if (loadError) {
      return <div className="p-4 rounded border border-red-200 text-red-700 bg-red-50">{loadError}</div>;
    }
    if (!loading && !abilities.create) {
      return <div className="p-4 rounded border border-yellow-200 text-yellow-800 bg-yellow-50">You do not have permission to raise notices.</div>;
    }
    return (
      <>
        <div className="flex flex-col items-start justify-between gap-4 mb-6 sm:flex-row sm:items-center">
          <div className="relative w-full sm:w-72">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search notices..."
              className="w-full py-2 pl-10 pr-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <button
            onClick={openCreate}
            disabled={loading}
            className="flex items-center justify-center w-full px-6 py-3 font-medium text-white transition-all duration-300 rounded-lg shadow-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 sm:w-auto"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Raise Notice
          </button>
        </div>

        <div className="mb-10 overflow-hidden bg-white shadow-xl rounded-xl">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-blue-600">
                <tr>
                  {['S.No', 'Date', 'Title', 'Description', 'Staff Type', 'Departments', ...(abilities.manageAll ? ['Raised By'] : [])].map((h) => (
                    <th key={h} className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">{h}</th>
                  ))}
                  <th className="px-6 py-4 text-center text-xs font-medium text-white uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">{renderBody()}</tbody>
            </table>
          </div>

          {filtered.length > PAGE_SIZE && (
            <div className="flex justify-end items-center gap-2 px-6 py-4">
              <button className="px-3 py-1 rounded border border-gray-300 bg-white text-gray-700 disabled:opacity-50" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>Prev</button>
              <span className="text-sm text-gray-700">Page {page} of {totalPages}</span>
              <button className="px-3 py-1 rounded border border-gray-300 bg-white text-gray-700 disabled:opacity-50" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next</button>
            </div>
          )}
        </div>
      </>
    );
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <Header />
      <div className="flex flex-1 min-h-0">
        <SidebarComponent />
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto">
            <div className="mb-10 text-center">
              <h1 className="mb-2 text-4xl font-extrabold text-gray-900">Notice Board</h1>
              <p className="text-lg text-gray-600">
                {abilities.manageAll ? 'Raise notices and manage notices raised by every office' : 'Raise and manage the notices you have published'}
              </p>
            </div>

            {renderContent()}

            {isModalOpen && (
              <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="notice-modal-title">
                <div className="flex items-end justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                  <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={saving ? undefined : closeModal} />

                  <div className="inline-block overflow-hidden text-left align-bottom transition-all transform bg-white rounded-lg shadow-xl sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full">
                    <div className="px-6 py-4 bg-blue-600 flex items-center justify-between">
                      <h3 id="notice-modal-title" className="text-lg font-medium leading-6 text-white">{editingId ? 'Edit Notice' : 'Raise Notice'}</h3>
                      <button className="text-white hover:text-gray-200" onClick={closeModal} disabled={saving} aria-label="Close">
                        <svg className="w-6 h-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>

                    <div className="px-6 py-5 bg-white">
                      {formError && <div className="mb-4 p-3 rounded border border-red-200 text-red-700 bg-red-50 text-sm">{formError}</div>}

                      <form className="space-y-5" onSubmit={submit} noValidate>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          <div className="md:col-span-2">
                            <label htmlFor="notice-title" className="block mb-2 text-sm font-medium text-gray-700">Title *</label>
                            <input id="notice-title" type="text" maxLength={MAX_TEXT_LENGTH} value={form.title} onChange={(e) => setField('title', e.target.value)} className={inputClass(fieldErrors.title)} placeholder="Notice title" />
                            <FieldError message={fieldErrors.title} />
                          </div>

                          <div>
                            <label htmlFor="notice-date" className="block mb-2 text-sm font-medium text-gray-700">Date *</label>
                            <input id="notice-date" type="date" value={form.date} onChange={(e) => setField('date', e.target.value)} className={inputClass(fieldErrors.date)} />
                            <FieldError message={fieldErrors.date} />
                          </div>

                          <div>
                            <label htmlFor="notice-staff-type" className="block mb-2 text-sm font-medium text-gray-700">Staff Type *</label>
                            <select id="notice-staff-type" value={form.staff_type} onChange={(e) => setField('staff_type', e.target.value)} className={inputClass(fieldErrors.staff_type)}>
                              {staffTypes.map((type) => <option key={type} value={type}>{type}</option>)}
                            </select>
                            <FieldError message={fieldErrors.staff_type} />
                          </div>

                          <div className="md:col-span-2">
                            <label htmlFor="notice-description" className="block mb-2 text-sm font-medium text-gray-700">Description *</label>
                            <textarea id="notice-description" rows={3} maxLength={MAX_TEXT_LENGTH} value={form.description} onChange={(e) => setField('description', e.target.value)} className={inputClass(fieldErrors.description)} placeholder="What staff need to know" />
                            <div className="flex justify-between">
                              <FieldError message={fieldErrors.description} />
                              <span className="mt-1 ml-auto text-xs text-gray-400">{form.description.length}/{MAX_TEXT_LENGTH}</span>
                            </div>
                          </div>

                          <div className="md:col-span-2" role="group" aria-labelledby="notice-departments-label">
                            <div className="flex items-center justify-between mb-2">
                              <span id="notice-departments-label" className="text-sm font-medium text-gray-700">Departments * <span className="font-normal text-gray-400">({form.department_ids.length} selected)</span></span>
                              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                                <input type="checkbox" checked={allSelected} onChange={toggleAllDepartments} className="rounded border-gray-300" />
                                Select all
                              </label>
                            </div>
                            <div className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-56 overflow-y-auto p-3 border rounded-lg ${fieldErrors.department_ids ? 'border-red-400' : 'border-gray-200'}`}>
                              {departments.map((d) => (
                                <label key={d.id} title={d.dept_name} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                                  <input type="checkbox" checked={form.department_ids.includes(d.id)} onChange={() => toggleDepartment(d.id)} className="rounded border-gray-300" />
                                  <span className="truncate">{d.dept_shortname}</span>
                                </label>
                              ))}
                            </div>
                            <FieldError message={fieldErrors.department_ids} />
                          </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-2">
                          <button type="button" onClick={closeModal} disabled={saving} className="px-6 py-2.5 font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50">Cancel</button>
                          <button type="submit" disabled={saving} className="px-6 py-2.5 font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
                            {saving ? 'Saving...' : editingId ? 'Update Notice' : 'Raise Notice'}
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
