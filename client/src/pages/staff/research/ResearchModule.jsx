import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import Notification from '../../../components/common/Notification';
import Header from '../../../components/layout/Header';
import StaffSidebar from '../../../components/layout/StaffSidebar';
import { useAuth } from '../../../context/AuthContext';
import api from '../../../api/axios';
import {
  getResearchRecords,
  createResearchRecord,
  updateResearchRecord,
  deleteResearchRecord,
} from '../../../api/researchApi';
import { RESEARCH_RESOURCES } from './researchConfig';
import {
  ACTION_BUTTON_BASE,
  ACTION_TH_CLASS,
  FIELD_CLASS,
  LABEL_CLASS,
  READONLY_FIELD_CLASS,
  TH_CLASS,
  VALIDATION_ROW_COLORS,
  calculateNoOfDays,
  formatDateDMY,
  iconProps,
  notApplicable,
  rowBackground,
  toInputDate,
} from './researchShared';
import { getErrorMessage } from '../../../utils/errors';

const MAX_DOCUMENT_BYTES = 500 * 1024;

// Mirrors the Laravel public/Uploads/Research/* folder names so a document written by either
// application resolves under the same path.
const RESEARCH_DOCUMENT_FOLDERS = {
  'conference-attended': 'Conference_Attended',
  'conference-conducted': 'Conference_Conducted',
  publication: 'Publications',
  'book-chapter': 'Book_Chapters',
  'funded-project': 'fundedproject',
  consultancy: 'Consultancy',
  patent: 'patents',
  copyright: 'Copyrights',
  'reviewer-editor': 'Review_Editor',
  achievement: 'Achievement',
};

function documentPathFor(resource) {
  return `/uploads/research/${RESEARCH_DOCUMENT_FOLDERS[resource]}`;
}

function resolveDocumentUrl(resource, filename) {
  if (!filename) return '#';

  const normalized = filename.startsWith('/') ? filename : `/${filename}`;
  const apiBase = (import.meta.env.VITE_API_URL || '').trim() || api.defaults.baseURL || '';

  if (apiBase) {
    const hostOnly = String(apiBase).replace(/\/$/, '').replace(/\/api$/, '');
    return `${hostOnly}${documentPathFor(resource)}${normalized}`;
  }

  if (typeof window !== 'undefined') {
    return `${window.location.origin}${documentPathFor(resource)}${normalized}`;
  }

  return `${documentPathFor(resource)}${normalized}`;
}

function FieldError({ children }) {
  if (!children) return null;
  return <div className="mt-1 text-xs text-red-600">{children}</div>;
}

function initialForm(config) {
  return config.fields.reduce((accumulator, field) => {
    accumulator[field.name] = '';
    return accumulator;
  }, {});
}

function formFromRow(config, row) {
  return config.fields.reduce((accumulator, field) => {
    const value = row[field.name];
    accumulator[field.name] = field.type === 'date' ? toInputDate(value) : value == null ? '' : String(value);
    return accumulator;
  }, {});
}

function isFieldVisible(field, form) {
  if (!field.showWhen) return true;
  return form[field.showWhen.field] === field.showWhen.value;
}

export default function ResearchModule({ resource, title, subtitle, modulePath, tabs }) {
  const config = RESEARCH_RESOURCES[resource];
  const { user } = useAuth?.() || {};

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });
  const [resolvedName, setResolvedName] = useState(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingDocument, setEditingDocument] = useState('');
  const [form, setForm] = useState(() => initialForm(config));
  const [formErrors, setFormErrors] = useState({});
  const [documentFile, setDocumentFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [reasonRow, setReasonRow] = useState(null);

  const maxDocumentBytes = config.maxDocumentBytes || MAX_DOCUMENT_BYTES;

  const showNotification = useCallback((message, type = 'success') => {
    setNotification({ show: true, message, type });
  }, []);

  useEffect(() => {
    let mounted = true;

    async function resolveName() {
      const parts = [user?.fname, user?.mname, user?.lname].filter(Boolean);
      const fallback = parts.length ? parts.join(' ') : user?.name || user?.full_name || user?.username || '';

      try {
        if (user?.staff_id) {
          const res = await api.get(`/staff/${user.staff_id}`);
          const row = res?.data?.data || res?.data || null;
          if (row && mounted) {
            const staffParts = [row.fname, row.mname, row.lname].filter(Boolean);
            setResolvedName(row.name || (staffParts.length ? staffParts.join(' ') : null) || null);
            return;
          }
        }

        if (user?.id) {
          const listRes = await api.get('/staff');
          const rows = Array.isArray(listRes?.data?.data) ? listRes.data.data : [];
          const row = rows.find((item) => Number(item?.user_id) === Number(user.id));
          if (row && mounted) {
            const staffParts = [row.fname, row.mname, row.lname].filter(Boolean);
            setResolvedName(row.name || (staffParts.length ? staffParts.join(' ') : null) || null);
            return;
          }
        }

        if (mounted) setResolvedName(fallback || null);
      } catch (_error) {
        if (mounted) setResolvedName(fallback || null);
      }
    }

    resolveName();
    return () => {
      mounted = false;
    };
  }, [user?.id, user?.staff_id]);

  // The tabbed pages swap `resource` in place, so a slow response for the previous tab must not
  // overwrite the table of the tab that is now showing.
  const latestRequest = useRef(0);

  const refreshRecords = useCallback(async () => {
    const requestId = ++latestRequest.current;
    try {
      const response = await getResearchRecords(resource);
      if (requestId !== latestRequest.current) return;
      setRecords(Array.isArray(response?.data) ? response.data : []);
      setError('');
    } catch (err) {
      if (requestId !== latestRequest.current) return;
      setError(getErrorMessage(err, `Failed to load ${config.plural.toLowerCase()}`));
    } finally {
      if (requestId === latestRequest.current) setLoading(false);
    }
  }, [resource, config.plural]);

  useEffect(() => {
    setLoading(true);
    refreshRecords();
  }, [refreshRecords]);

  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return records;

    return records.filter((row) =>
      config.searchFields
        .map((field) => String(row[field] ?? '').toLowerCase())
        .some((value) => value.includes(query))
    );
  }, [records, search, config.searchFields]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((previous) => {
      const next = { ...previous, [name]: value };

      // Clear the dependent fields the moment their parent option changes, so a stale value
      // from a previous selection is never submitted.
      config.fields.forEach((field) => {
        if (field.showWhen && field.showWhen.field === name && next[field.showWhen.field] !== field.showWhen.value) {
          next[field.name] = '';
        }
      });

      if (name === 'sponsored' && value === 'No') {
        next.sponsored_by = '';
        next.other_sponsored = '';
        next.sponsoring_agency = '';
      }

      return next;
    });
    setFormErrors((previous) => ({ ...previous, [name]: '' }));
  };

  const handleDocumentChange = (event) => {
    const file = event.target.files?.[0] || null;
    setDocumentFile(file);
    setFormErrors((previous) => ({ ...previous, document: '' }));
  };

  const openCreateModal = () => {
    setEditingId(null);
    setEditingDocument('');
    setForm(initialForm(config));
    setDocumentFile(null);
    setFormErrors({});
    setError('');
    setModalOpen(true);
  };

  const openEditModal = (row) => {
    setEditingId(row.id);
    setEditingDocument(row.document || '');
    setForm(formFromRow(config, row));
    setDocumentFile(null);
    setFormErrors({});
    setError('');
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
    setEditingId(null);
    setEditingDocument('');
    setFormErrors({});
    setDocumentFile(null);
  };

  const validateForm = (currentForm, file, isEditing) => {
    const errors = {};

    config.fields.forEach((field) => {
      if (!field.required || !isFieldVisible(field, currentForm)) return;

      const raw = currentForm[field.name];
      const value = typeof raw === 'string' ? raw.trim() : raw;
      if (!value) {
        errors[field.name] = `${field.label} is required field`;
      }
    });

    const hasFrom = config.fields.some((field) => field.name === 'from_date');
    if (hasFrom && currentForm.from_date && currentForm.to_date && currentForm.from_date > currentForm.to_date) {
      errors.to_date = 'to_date must be greater than or equal to from_date';
    }

    // A PDF is mandatory when creating. On edit the stored file is kept unless the user picks a
    // replacement, so an existing record can be corrected without re-uploading.
    if (!file && !isEditing) errors.document = 'document is required field';
    else if (file && file.size > maxDocumentBytes) {
      errors.document = `File size is more than ${Math.round(maxDocumentBytes / 1024)}KB. Please consider re-uploading.`;
    }

    return errors;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (saving) return;

    const errors = validateForm(form, documentFile, Boolean(editingId));
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    const payload = new FormData();
    config.fields.forEach((field) => {
      if (field.type === 'computedDays') return;
      if (!isFieldVisible(field, form)) return;
      payload.append(field.name, String(form[field.name] ?? '').trim());
    });

    // Only send the document when one was actually chosen. FormData.append(name, null) would
    // otherwise write the literal string "null" and multer would never populate req.file.
    if (documentFile) {
      payload.append('document', documentFile);
    }

    setSaving(true);
    setError('');

    try {
      if (editingId) {
        await updateResearchRecord(resource, editingId, payload);
        showNotification(`${config.singular} updated successfully`);
      } else {
        await createResearchRecord(resource, payload);
        showNotification(`${config.singular} added successfully.`);
      }

      setModalOpen(false);
      setEditingId(null);
      setEditingDocument('');
      setDocumentFile(null);
      await refreshRecords();
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        (err?.code === 'LIMIT_FILE_SIZE'
          ? `File size is more than ${Math.round(maxDocumentBytes / 1024)}KB. Please consider re-uploading.`
          : 'Error in Database transaction');
      setFormErrors(err?.response?.data?.errors || {});
      setError(message);
      showNotification(message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row) => {
    if (!row?.id) return;
    if (!window.confirm(`Delete this ${config.singular.toLowerCase()} record?`)) return;

    try {
      await deleteResearchRecord(resource, row.id);
      showNotification(`${config.singular} deleted successfully`);
      await refreshRecords();
    } catch (err) {
      const message = getErrorMessage(err, 'Error in Database transaction');
      setError(message);
      showNotification(message, 'error');
    }
  };

  const computedDays = calculateNoOfDays(form.from_date, form.to_date);
  const computedDaysInvalid = Boolean(form.from_date && form.to_date && form.from_date > form.to_date);

  const renderActionButtons = (row) => (
    <div className="flex items-center justify-center gap-2">
      {row.validation_status === 'invalid' && (
        <button
          type="button"
          onClick={() => setReasonRow(row)}
          title="Reason"
          aria-label="View rejection reason"
          className={`${ACTION_BUTTON_BASE} text-amber-700 bg-white border-2 border-amber-400 hover:bg-amber-100 focus:ring-amber-500`}
        >
          <svg {...iconProps()}>
            <path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </button>
      )}

      <a
        href={resolveDocumentUrl(resource, row.document)}
        target="_blank"
        rel="noreferrer"
        title="View Document"
        aria-label="View document"
        className={`${ACTION_BUTTON_BASE} text-blue-700 bg-white border-2 border-blue-400 hover:bg-blue-100 focus:ring-blue-500`}
      >
        <svg {...iconProps()}>
          <path d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.964-7.178z" />
          <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </a>

      <button
        type="button"
        onClick={() => openEditModal(row)}
        title="Edit"
        aria-label={`Edit ${config.singular.toLowerCase()}`}
        className={`${ACTION_BUTTON_BASE} text-white bg-blue-700 hover:bg-blue-800 focus:ring-blue-500`}
      >
        <svg {...iconProps()}>
          <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      </button>

      <button
        type="button"
        onClick={() => handleDelete(row)}
        title="Delete"
        aria-label={`Delete ${config.singular.toLowerCase()}`}
        className={`${ACTION_BUTTON_BASE} text-white bg-red-700 hover:bg-red-800 focus:ring-red-500`}
      >
        <svg {...iconProps()}>
          <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  );

  const renderCellValue = (row, column) => {
    const value = row[column.key];

    if (column.type === 'date') return formatDateDMY(value);

    if (column.type === 'egov') {
      // Only Achievement opts out (hasEgovId: false); every other config leaves it undefined.
      if (config.hasEgovId === false && column.key === 'egov_id') return '-';
      if (!value) return '-';
      return (
        <a href={resolveDocumentUrl(resource, row.document)} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
          {value}
        </a>
      );
    }

    if (column.type === 'link') {
      if (!value) return '-';
      return (
        <a href={value} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
          {value}
        </a>
      );
    }

    if (column.notApplicableWhen) {
      const driver = row[column.notApplicableWhen];
      if (driver === 'No') return notApplicable;
    }

    if (value === null || value === undefined || value === '') return '-';
    return String(value);
  };

  const renderField = (field) => {
    if (!isFieldVisible(field, form)) return null;

    const error = formErrors[field.name];
    const value = form[field.name] ?? '';
    const id = `rs-${field.name}`;

    if (field.type === 'select') {
      return (
        <div key={field.name} className={field.span === 2 ? 'md:col-span-2' : undefined}>
          <label className={LABEL_CLASS} htmlFor={id}>
            {field.label} {field.required && <span className="text-red-500">*</span>}
          </label>
          <select
            id={id}
            name={field.name}
            value={value}
            onChange={handleChange}
            className={error ? `${FIELD_CLASS} border-red-500` : FIELD_CLASS}
            required={field.required}
          >
            <option value="">{field.placeholder || 'Choose One'}</option>
            {field.options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <FieldError>{error}</FieldError>
        </div>
      );
    }

    if (field.type === 'computedDays') {
      return (
        <div key={field.name}>
          <label className={LABEL_CLASS} htmlFor={id}>
            {field.label} {field.required && <span className="text-red-500">*</span>}
          </label>
          <input
            id={id}
            type="text"
            readOnly
            value={computedDays}
            className={computedDaysInvalid ? `${READONLY_FIELD_CLASS} border-red-500` : READONLY_FIELD_CLASS}
          />
          <FieldError>{error}</FieldError>
        </div>
      );
    }

    if (field.type === 'textarea') {
      return (
        <div key={field.name} className={field.span === 2 ? 'md:col-span-2' : undefined}>
          <label className={LABEL_CLASS} htmlFor={id}>
            {field.label} {field.required && <span className="text-red-500">*</span>}
          </label>
          <textarea
            id={id}
            name={field.name}
            value={value}
            onChange={handleChange}
            placeholder={field.placeholder}
            rows={3}
            className={error ? `${FIELD_CLASS} border-red-500` : FIELD_CLASS}
          />
          <FieldError>{error}</FieldError>
        </div>
      );
    }

    return (
      <div key={field.name} className={field.span === 2 ? 'md:col-span-2' : undefined}>
        <label className={LABEL_CLASS} htmlFor={id}>
          {field.label} {field.required && <span className="text-red-500">*</span>}
        </label>
        <input
          id={id}
          type={field.type === 'date' ? 'date' : field.type === 'number' ? 'number' : 'text'}
          name={field.name}
          value={value}
          onChange={handleChange}
          placeholder={field.placeholder}
          required={field.required}
          className={error ? `${FIELD_CLASS} border-red-500` : FIELD_CLASS}
        />
        <FieldError>{error}</FieldError>
      </div>
    );
  };

  const columnCount = config.columns.length;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <Header />
      <div className="flex flex-1 min-h-0">
        <StaffSidebar />
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto">
            <Notification
              show={notification.show}
              message={notification.message}
              type={notification.type}
              onClose={() => setNotification({ show: false, message: '', type: '' })}
            />

            <div className="mb-6">
              <h1 className="mb-2 text-4xl font-extrabold text-gray-900">{title}</h1>
              {subtitle && <p className="mt-1 text-lg font-medium text-blue-700">{subtitle}</p>}
              <p className="mt-1 text-sm text-slate-600">
                {resolvedName ? `Welcome, ${resolvedName}` : 'Welcome'}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Module path: <span className="font-mono">{modulePath}</span>
              </p>
            </div>

            <div className="flex flex-col items-start justify-between gap-4 mb-6 sm:flex-row sm:items-center">
                <div className="relative w-full sm:w-72">
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder={`Search ${config.plural.toLowerCase()}...`}
                    className="w-full py-2 pl-10 pr-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>

                <button
                  type="button"
                  onClick={openCreateModal}
                  className="flex items-center justify-center w-full px-6 py-3 font-medium text-white transition-all duration-300 transform rounded-lg shadow-lg bg-blue-600 hover:bg-blue-700 hover:-translate-y-1 hover:scale-105 sm:w-auto"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" className="w-5 h-5 mr-2" fill="currentColor">
                    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                  Add {config.singular}
                </button>
              </div>

            {error && (
              <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-6 py-4 text-sm text-red-700">{error}</div>
            )}

            {/* No overflow-hidden here on purpose: Firefox anchors position:sticky to the
                nearest ancestor with overflow != visible. Clipping this card would make it the
                sticky scrollport and the Action column would never follow the scroll. */}
            <div className="mb-10 bg-white shadow-xl rounded-xl">
              {tabs ? (
                <div className="rounded-t-xl border-b border-gray-200">
                  <nav className="-mb-0.5 flex justify-center space-x-6 overflow-x-auto" aria-label={`${title} tabs`}>
                    {tabs.items.map((tab) => (
                      <button
                        key={tab.resource}
                        type="button"
                        onClick={() => tabs.onSelect(tab.resource)}
                        className={`py-4 px-2 inline-flex items-center gap-2 border-b-[3px] text-sm whitespace-nowrap ${
                          tabs.activeResource === tab.resource
                            ? 'font-semibold border-blue-600 text-blue-700'
                            : 'border-transparent text-gray-500 hover:text-blue-600'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </nav>
                </div>
              ) : (
                <div className="rounded-t-xl border-b border-gray-200 px-6 py-4">
                  <h2 className="text-sm font-semibold border-blue-600 text-blue-700 inline-flex items-center gap-2 border-b-[3px] pb-3">
                    {config.plural} Details
                  </h2>
                </div>
              )}

              <div className="overflow-auto rounded-b-xl">
                <table className="min-w-full divide-y divide-gray-200" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
                  <thead className="bg-blue-600">
                    <tr>
                      <th className={TH_CLASS}>S.No</th>
                      {config.columns.map((column) => (
                        <th key={column.key} className={TH_CLASS}>
                          {column.label}
                        </th>
                      ))}
                      <th className={ACTION_TH_CLASS}>Action</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {loading ? (
                      <tr>
                        <td colSpan={columnCount + 2} className="px-6 py-12 text-center text-gray-500">
                          Loading...
                        </td>
                      </tr>
                    ) : filteredRecords.length === 0 ? (
                      <tr>
                        <td colSpan={columnCount + 2} className="px-6 py-12 text-center text-gray-500">
                          No {config.plural.toLowerCase()} found.
                        </td>
                      </tr>
                    ) : (
                      filteredRecords.map((row, index) => (
                        <tr key={row.id || index} style={{ backgroundColor: VALIDATION_ROW_COLORS[row.validation_status] }}>
                          <td className="px-6 py-4 text-sm text-gray-900">{index + 1}</td>
                          {config.columns.map((column) => (
                            <td key={column.key} className="px-6 py-4 text-sm text-gray-900">
                              {renderCellValue(row, column)}
                            </td>
                          ))}
                          <td
                            className="sticky right-0 z-10 px-6 py-4 whitespace-nowrap text-center text-sm font-medium border-l border-gray-200"
                            style={{ backgroundColor: rowBackground(row) }}
                          >
                            {renderActionButtons(row)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {modalOpen && (
              <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
                <div className="flex items-end justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                  <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={closeModal} />

                  <div className="inline-block overflow-hidden text-left align-bottom transition-all transform bg-white rounded-lg shadow-xl sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full">
                    <div className="px-6 py-4 bg-blue-600">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-medium text-white">
                          {config.singular} - {editingId ? 'Edit' : 'Add'}
                        </h3>
                        <button type="button" onClick={closeModal} aria-label="Close modal" className="text-white hover:text-gray-200 focus:outline-none">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    <div className="px-6 py-5 bg-white">
                      {error && <div className="mb-4 p-3 rounded border border-red-200 text-red-700 bg-red-50 text-sm">{error}</div>}

                      <form className="space-y-5" onSubmit={handleSubmit}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          {config.fields.map(renderField)}

                          <div className="md:col-span-2">
                            {editingId && editingDocument && (
                              <div className="mb-2 flex flex-wrap items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
                                <span className="font-medium">Current document:</span>
                                <span className="font-mono break-all">{editingDocument}</span>
                                <a
                                  href={resolveDocumentUrl(resource, editingDocument)}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-md bg-blue-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-blue-700"
                                >
                                  <svg {...iconProps()}>
                                    <path d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.964-7.178z" />
                                    <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  </svg>
                                  View
                                </a>
                              </div>
                            )}

                            <label className={LABEL_CLASS} htmlFor="rs-document">
                              Document{' '}
                              {editingId ? (
                                <span className="font-normal text-slate-600">
                                  (optional &mdash; leave empty to keep the current file)
                                </span>
                              ) : (
                                <span className="text-red-500">
                                  * Only PDF files up to {Math.round(maxDocumentBytes / 1024)} KB in size are accepted.
                                </span>
                              )}
                            </label>
                            <input
                              id="rs-document"
                              type="file"
                              name="document"
                              accept="application/pdf"
                              onChange={handleDocumentChange}
                              className={formErrors.document ? 'w-full text-sm text-red-600' : 'w-full text-sm text-gray-600'}
                            />
                            {documentFile && (
                              <p className="mt-1 text-xs text-slate-600">
                                New file selected: <span className="font-mono">{documentFile.name}</span> (
                                {Math.ceil(documentFile.size / 1024)} KB)
                              </p>
                            )}
                            <FieldError>{formErrors.document}</FieldError>
                          </div>
                        </div>

                        <div className="flex justify-end space-x-4 pt-4">
                          <button
                            type="button"
                            onClick={closeModal}
                            disabled={saving}
                            className="inline-flex justify-center px-6 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={saving}
                            className="inline-flex justify-center px-6 py-3 text-sm font-medium text-white border border-transparent rounded-lg shadow-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-60"
                          >
                            {saving ? 'Saving...' : editingId ? 'Update' : 'Add'}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {reasonRow && (
              <div className="fixed inset-0 z-50 flex items-center justify-center px-4" role="dialog" aria-modal="true">
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={() => setReasonRow(null)} />
                <div className="relative inline-block w-full max-w-lg p-6 text-left bg-white rounded-lg shadow-xl">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900">Reason Details of {config.singular}</h3>
                    <button type="button" aria-label="Close reason details" className="text-gray-500 hover:text-gray-800 focus:outline-none" onClick={() => setReasonRow(null)}>
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <div className="font-medium text-gray-700">Reason:</div>
                  <div className="mt-1 text-sm text-gray-900">{reasonRow.reason || 'No reason provided.'}</div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}