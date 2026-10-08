import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';

import Notification from '../../components/common/Notification';
import Header from '../../components/layout/Header';
import StaffSidebar from '../../components/layout/StaffSidebar';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import {
  getProfessionalActivities,
  createAttendedProfessionalActivity,
  updateAttendedProfessionalActivity,
  deleteAttendedProfessionalActivity,
  createConductedProfessionalActivity,
  updateConductedProfessionalActivity,
  deleteConductedProfessionalActivity,
} from '../../api/professionalActivityApi';
import { getErrorMessage } from '../../utils/errors';

const ATTENDEE_ROLES = ['Participant', 'Resource Person', 'Jury'];
const CONDUCTED_ROLES = ['Coordinator', 'Convenor', 'Member', 'Jury'];
const LEVELS = ['Local', 'National', 'International'];
const CATEGORIES = [
  'Workshop',
  'FDP',
  'Seminar',
  'Webinar',
  'STTP',
  'Certification Program',
  'MDP/EDP',
  'Hackathon',
  'Space-Talk',
  'Site Visit',
];
const SPONSORED_OPTIONS = ['Yes', 'No'];
const SPONSORED_BY_OPTIONS = ['KLS GIT', 'Other'];
const MAX_DOCUMENT_BYTES = 500 * 1024;

const ATTENDED_INITIAL_FORM = {
  title: '',
  organizer: '',
  role: '',
  level: '',
  category: '',
  sponsored: 'No',
  sponsored_by: '',
  other_sponsored: '',
  from_date: '',
  to_date: '',
};

const CONDUCTED_INITIAL_FORM = {
  title: '',
  organizer: '',
  co_organizer: '',
  level: '',
  category: '',
  sponsored: 'No',
  sponsoring_agency_name_address: '',
  place: '',
  role: '',
  from_date: '',
  to_date: '',
};

const VALIDATION_ROW_COLORS = {
  invalid: '#ffcccc',
  updated: '#fff2cc',
  valid: '#ccffcc',
};

const DOCUMENT_PATHS = {
  attended: '/uploads/professional_activity/attended',
  conducted: '/uploads/professional_activity/conducted',
};

const notApplicable = '--NA--';

function resolveDocumentUrl(kind, filename) {
  if (!filename) return '#';

  const normalized = filename.startsWith('/') ? filename : `/${filename}`;
  const apiBase = (import.meta.env.VITE_API_URL || '').trim() || api.defaults.baseURL || '';

  if (apiBase) {
    const hostOnly = String(apiBase).replace(/\/$/, '').replace(/\/api$/, '');
    return `${hostOnly}${DOCUMENT_PATHS[kind]}/${normalized.replace(/^\//, '')}`;
  }

  if (typeof window !== 'undefined') {
    return `${window.location.origin}${DOCUMENT_PATHS[kind]}${normalized}`;
  }

  return `${DOCUMENT_PATHS[kind]}${normalized}`;
}

function toInputDate(value) {
  if (!value) return '';
  const raw = String(value).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : '';
}

function formatDateDMY(value) {
  const iso = toInputDate(value);
  if (!iso) return '-';

  const [year, month, day] = iso.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthName = months[Number(month) - 1];
  return monthName ? `${day}-${monthName}-${year}` : iso;
}

// Inclusive day count, identical to the Laravel blade helper and to the server guard.
function calculateNoOfDays(fromDate, toDate) {
  if (!fromDate || !toDate || fromDate > toDate) return 0;
  return Math.round((new Date(toDate) - new Date(fromDate)) / 86400000) + 1;
}

const FIELD_CLASS =
  'block w-full px-6 py-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500';
const READONLY_DAYS_CLASS = `${FIELD_CLASS} bg-gray-100 cursor-not-allowed`;
const LABEL_CLASS = 'block mb-2 text-sm font-medium text-gray-700';

function FieldError({ children }) {
  if (!children) return null;
  return <div className="mt-1 text-xs text-red-600">{children}</div>;
}

function SelectField({ label, name, value, options, onChange, required, error, placeholder = 'Choose One' }) {
  return (
    <div>
      <label className={LABEL_CLASS} htmlFor={`pa-${name}`}>
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <select
        id={`pa-${name}`}
        name={name}
        value={value}
        onChange={onChange}
        className={error ? `${FIELD_CLASS} border-red-500` : FIELD_CLASS}
        required={required}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <FieldError>{error}</FieldError>
    </div>
  );
}

function TextField({ label, name, value, onChange, error, required, readOnly, placeholder, type = 'text' }) {
  return (
    <div>
      <label className={LABEL_CLASS} htmlFor={`pa-${name}`}>
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        id={`pa-${name}`}
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        readOnly={readOnly}
        required={required}
        accept={type === 'file' ? 'application/pdf' : undefined}
        className={
          readOnly
            ? READONLY_DAYS_CLASS
            : error
              ? `${FIELD_CLASS} border-red-500`
              : FIELD_CLASS
        }
      />
      <FieldError>{error}</FieldError>
    </div>
  );
}

export default function ProfessionalActivities() {
  const location = useLocation();
  const { user } = useAuth?.() || {};

  const isTeaching = location.pathname.startsWith('/teaching');
  const activePath = isTeaching ? '/teaching/professional-activities' : '/nonteaching/professional-activities';

  const [activeTab, setActiveTab] = useState('attended');
  const [records, setRecords] = useState({ attended: [], conducted: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });
  const [resolvedName, setResolvedName] = useState(null);

  const [modalKind, setModalKind] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editingDocument, setEditingDocument] = useState('');
  const [form, setForm] = useState(ATTENDED_INITIAL_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [documentFile, setDocumentFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [reasonRow, setReasonRow] = useState(null);

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
      } catch (_e) {
        if (mounted) setResolvedName(fallback || null);
      }
    }

    resolveName();
    return () => {
      mounted = false;
    };
  }, [user?.id, user?.staff_id]);

  const refreshRecords = useCallback(async () => {
    try {
      const response = await getProfessionalActivities();
      const data = response?.data || {};
      setRecords({
        attended: Array.isArray(data.attended) ? data.attended : [],
        conducted: Array.isArray(data.conducted) ? data.conducted : [],
      });
      setError('');
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load professional activities'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshRecords();
  }, [refreshRecords]);

  const rows = records[activeTab] || [];

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return rows;

    return rows.filter((row) =>
      [
        row.egov_id,
        row.title,
        row.organizer,
        row.co_organizer,
        row.category,
        row.level,
        row.role,
        row.place,
        row.sponsored_by,
        row.sponsoring_agency_name_address,
      ]
        .map((value) => String(value ?? '').toLowerCase())
        .some((value) => value.includes(query))
    );
  }, [rows, search]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((previous) => {
      const next = { ...previous, [name]: value };
      if (name === 'sponsored' && value === 'No') {
        next.sponsored_by = '';
        next.other_sponsored = '';
        next.sponsoring_agency_name_address = '';
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

  const openCreateModal = (kind) => {
    setActiveTab(kind);
    setModalKind(kind);
    setEditingId(null);
    setEditingDocument('');
    setForm(kind === 'attended' ? ATTENDED_INITIAL_FORM : CONDUCTED_INITIAL_FORM);
    setDocumentFile(null);
    setFormErrors({});
    setError('');
  };

  const openEditModal = (kind, row) => {
    setModalKind(kind);
    setEditingId(row.id);
    setEditingDocument(row.document || '');
    setFormErrors({});
    setDocumentFile(null);

    if (kind === 'attended') {
      setForm({
        title: row.title || '',
        organizer: row.organizer || '',
        role: row.role || '',
        level: row.level || '',
        category: row.category || '',
        sponsored: row.sponsored || 'No',
        sponsored_by: SPONSORED_BY_OPTIONS.includes(row.sponsored_by) ? row.sponsored_by : '',
        other_sponsored:
          row.sponsored_by && !SPONSORED_BY_OPTIONS.includes(row.sponsored_by) ? row.sponsored_by : '',
        from_date: toInputDate(row.from_date),
        to_date: toInputDate(row.to_date),
      });
    } else {
      setForm({
        title: row.title || '',
        organizer: row.organizer || '',
        co_organizer: row.co_organizer || '',
        level: row.level || '',
        category: row.category || '',
        sponsored: row.sponsored || 'No',
        sponsoring_agency_name_address: row.sponsoring_agency_name_address || '',
        place: row.place || '',
        role: row.role || '',
        from_date: toInputDate(row.from_date),
        to_date: toInputDate(row.to_date),
      });
    }
  };

  const closeModal = () => {
    if (saving) return;
    setModalKind(null);
    setEditingId(null);
    setEditingDocument('');
    setFormErrors({});
    setDocumentFile(null);
  };

  const validateForm = (kind, currentForm, file, isEditing) => {
    const errors = {};

    if (!currentForm.title.trim()) errors.title = 'title is required field';

    if (kind === 'attended') {
      if (!currentForm.organizer.trim()) errors.organizer = 'organizer is required filed';
      else if (!/^[a-zA-Z\s]+$/.test(currentForm.organizer.trim())) {
        errors.organizer = 'The organizer field should contain only letters and spaces.';
      }
      if (!ATTENDEE_ROLES.includes(currentForm.role)) errors.role = 'Please select a valid option';
      if (!currentForm.sponsored) errors.sponsored = 'sponsored is required field';
      if (currentForm.sponsored === 'Yes') {
        if (!SPONSORED_BY_OPTIONS.includes(currentForm.sponsored_by)) {
          errors.sponsored_by = 'Please select a valid option';
        } else if (currentForm.sponsored_by === 'Other' && !currentForm.other_sponsored.trim()) {
          errors.other_sponsored = 'other sponsor is required field';
        }
      }
    } else {
      if (!currentForm.organizer.trim()) errors.organizer = 'organizer is required field';
      if (!currentForm.place.trim()) errors.place = 'place is required field';
      else if (!/^[a-zA-Z\s]+$/.test(currentForm.place.trim())) {
        errors.place = 'The place field should contain only letters and spaces.';
      }
      if (!CONDUCTED_ROLES.includes(currentForm.role)) errors.role = 'Please select a valid option';
      if (currentForm.sponsored === 'Yes' && !currentForm.sponsoring_agency_name_address.trim()) {
        errors.sponsoring_agency_name_address = 'sponsoring agency name address is required field';
      }
    }

    if (!LEVELS.includes(currentForm.level)) errors.level = 'Please select a valid option';
    if (!CATEGORIES.includes(currentForm.category)) errors.category = 'Please select a valid option';

    if (!currentForm.from_date) errors.from_date = 'from_date is required field';
    if (!currentForm.to_date) errors.to_date = 'to_date is required field';
    if (currentForm.from_date && currentForm.to_date && currentForm.from_date > currentForm.to_date) {
      errors.to_date = 'to_date must be greater than or equal to from_date';
    }

    const maxDays = kind === 'attended' ? 365 : 255;
    const days = calculateNoOfDays(currentForm.from_date, currentForm.to_date);
    if (!errors.to_date && days > maxDays) errors.no_of_days = `no_of_days should be max ${maxDays} days`;

    // A PDF is mandatory when creating. On edit the stored file is kept unless the
    // user picks a replacement, so an existing record can be updated without re-uploading.
    if (!file && !isEditing) errors.document = 'document is required field';
    else if (file && file.size > MAX_DOCUMENT_BYTES) {
      errors.document = 'File size is more than 500KB. Please consider re-uploading.';
    }

    return errors;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!modalKind || saving) return;

    const errors = validateForm(modalKind, form, documentFile, Boolean(editingId));
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    const payload = new FormData();
    if (modalKind === 'attended') {
      payload.append('title', form.title.trim());
      payload.append('organizer', form.organizer.trim());
      payload.append('role', form.role);
      payload.append('level', form.level);
      payload.append('category', form.category);
      payload.append('sponsored', form.sponsored);
      payload.append('sponsored_by', form.sponsored === 'Yes' ? form.sponsored_by : '');
      payload.append('other_sponsored', form.sponsored === 'Yes' ? form.other_sponsored.trim() : '');
    } else {
      payload.append('title', form.title.trim());
      payload.append('organizer', form.organizer.trim());
      payload.append('co_organizer', form.co_organizer.trim());
      payload.append('level', form.level);
      payload.append('category', form.category);
      payload.append('sponsored', form.sponsored);
      payload.append('sponsoring_agency_name_address', form.sponsoring_agency_name_address.trim());
      payload.append('place', form.place.trim());
      payload.append('role', form.role);
    }

    payload.append('from_date', form.from_date);
    payload.append('to_date', form.to_date);

    // Only send the document when one was actually chosen. FormData.append(name, null)
    // would otherwise write the literal string "null" into a text field and multer would
    // never populate req.file.
    if (documentFile) {
      payload.append('document', documentFile);
    }

    setSaving(true);
    setError('');

    try {
      if (modalKind === 'attended') {
        if (editingId) {
          await updateAttendedProfessionalActivity(editingId, payload);
          showNotification('Professional Activity updated successfully');
        } else {
          await createAttendedProfessionalActivity(payload);
          showNotification('Professional Activity added successfully.');
        }
      } else if (editingId) {
        await updateConductedProfessionalActivity(editingId, payload);
        showNotification('Professional Activity updated successfully');
      } else {
        await createConductedProfessionalActivity(payload);
        showNotification('Professional Activity added successfully.');
      }

      setModalKind(null);
      setEditingId(null);
      setDocumentFile(null);
      await refreshRecords();
    } catch (err) {
      const message =
        err?.response?.data?.message || (err?.code === 'LIMIT_FILE_SIZE' ? 'File size is more than 500KB. Please consider re-uploading.' : 'Error in Database transaction');
      setFormErrors(err?.response?.data?.errors || {});
      setError(message);
      showNotification(message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (kind, row) => {
    if (!row?.id) return;
    if (!window.confirm('Delete this professional activity record?')) return;

    try {
      if (kind === 'attended') {
        await deleteAttendedProfessionalActivity(row.id);
      } else {
        await deleteConductedProfessionalActivity(row.id);
      }
      showNotification('Professional Activity deleted successfully');
      await refreshRecords();
    } catch (err) {
      const message = getErrorMessage(err, 'Error in Database transaction');
      setError(message);
      showNotification(message, 'error');
    }
  };

  const noOfDays = calculateNoOfDays(form.from_date, form.to_date);
  const noOfDaysInvalid = Boolean(form.from_date && form.to_date && form.from_date > form.to_date);

  const iconClass = 'w-5 h-5 shrink-0';
  const ACTION_BUTTON_BASE =
    'inline-flex items-center justify-center p-2.5 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1';

  // Every icon carries its own width/height attributes and its own stroke, so the
  // global `svg { height: auto }` base rule can never collapse it and the glyph
  // never depends on inheriting paint from an ancestor.
  const ICON_PROPS = {
    xmlns: 'http://www.w3.org/2000/svg',
    width: 20,
    height: 20,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    className: iconClass,
    'aria-hidden': 'true',
    focusable: 'false',
  };

  const renderActionButtons = (row, kind) => (
    <div className="flex items-center justify-center gap-2">
      {row.validation_status === 'invalid' && (
        <button
          type="button"
          onClick={() => setReasonRow(row)}
          title="Reason"
          aria-label="View rejection reason"
          className={`${ACTION_BUTTON_BASE} text-amber-700 bg-white border-2 border-amber-400 hover:bg-amber-100 focus:ring-amber-500`}
        >
          <svg {...ICON_PROPS}>
            <path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </button>
      )}

      <a
        href={resolveDocumentUrl(kind, row.document)}
        target="_blank"
        rel="noreferrer"
        title="View Document"
        aria-label="View document"
        className={`${ACTION_BUTTON_BASE} text-blue-700 bg-white border-2 border-blue-400 hover:bg-blue-100 focus:ring-blue-500`}
      >
        <svg {...ICON_PROPS}>
          <path d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.964-7.178z" />
          <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </a>

      <button
        type="button"
        onClick={() => openEditModal(kind, row)}
        title="Edit"
        aria-label="Edit professional activity"
        className={`${ACTION_BUTTON_BASE} text-white bg-blue-700 hover:bg-blue-800 focus:ring-blue-500`}
      >
        <svg {...ICON_PROPS}>
          <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      </button>

      <button
        type="button"
        onClick={() => handleDelete(kind, row)}
        title="Delete"
        aria-label="Delete professional activity"
        className={`${ACTION_BUTTON_BASE} text-white bg-red-700 hover:bg-red-800 focus:ring-red-500`}
      >
        <svg {...ICON_PROPS}>
          <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  );

  const thClass =
    'px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider';

  // The tables carry 13 and 15 columns, so the Action column sits far off-screen on a
  // normal display. Pinning it to the right edge keeps every control reachable.
  const ACTION_TH_CLASS =
    'sticky right-0 z-20 bg-blue-600 px-6 py-4 text-center text-xs font-medium text-white uppercase tracking-wider border-l border-blue-500';

  const rowBackground = (row) => VALIDATION_ROW_COLORS[row.validation_status] || '#ffffff';

  const renderAttendedTable = () => (
    <div className="overflow-auto rounded-b-xl">
      {/* Firefox ignores position:sticky on th/td while border-collapse is collapse. */}
      <table className="min-w-full divide-y divide-gray-200" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
        <thead className="bg-blue-600">
          <tr>
            {['S.No', 'E-Gov ID', 'Title', 'Organizer', 'Role', 'Level', 'Category', 'Sponsored', 'Sponsored By', 'From Date', 'To Date', 'No OF days'].map(
              (heading) => (
                <th key={heading} className={thClass}>
                  {heading}
                </th>
              )
            )}
            <th className={ACTION_TH_CLASS}>Action</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {loading ? (
            <tr>
              <td colSpan={13} className="px-6 py-12 text-center text-gray-500">Loading...</td>
            </tr>
          ) : filteredRows.length === 0 ? (
            <tr>
              <td colSpan={13} className="px-6 py-12 text-center text-gray-500">No professional activities found.</td>
            </tr>
          ) : (
            filteredRows.map((row, index) => (
              <tr key={row.id || index} style={{ backgroundColor: VALIDATION_ROW_COLORS[row.validation_status] }}>
                <td className="px-6 py-4 text-sm text-gray-900">{index + 1}</td>
                <td className="px-6 py-4 text-sm">
                  <a
                    href={resolveDocumentUrl('attended', row.document)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    {row.egov_id}
                  </a>
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">{row.title}</td>
                <td className="px-6 py-4 text-sm text-gray-900">{row.organizer}</td>
                <td className="px-6 py-4 text-sm text-gray-900">{row.role}</td>
                <td className="px-6 py-4 text-sm text-gray-900">{row.level}</td>
                <td className="px-6 py-4 text-sm text-gray-900">{row.category}</td>
                <td className="px-6 py-4 text-sm text-gray-900">{row.sponsored}</td>
                <td className="px-6 py-4 text-sm text-gray-900">{row.sponsored === 'No' ? notApplicable : row.sponsored_by || '-'}</td>
                <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-900">{formatDateDMY(row.from_date)}</td>
                <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-900">{formatDateDMY(row.to_date)}</td>
                <td className="px-6 py-4 text-sm text-gray-900">{row.no_of_days}</td>
                <td
                  className="sticky right-0 z-10 px-6 py-4 whitespace-nowrap text-center text-sm font-medium border-l border-gray-200"
                  style={{ backgroundColor: rowBackground(row) }}
                >
                  {renderActionButtons(row, 'attended')}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

  const renderConductedTable = () => (
    <div className="overflow-auto rounded-b-xl">
      {/* Firefox ignores position:sticky on th/td while border-collapse is collapse. */}
      <table className="min-w-full divide-y divide-gray-200" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
        <thead className="bg-blue-600">
          <tr>
            {[
              'S.No',
              'E-Gov ID',
              'Title',
              'Level',
              'Organizer',
              'Co Organizer',
              'Category',
              'Sponsored',
              'Sponsoring Agency Name Address',
              'From Date',
              'To Date',
              'Place',
              'No Of Days',
              'Role',
            ].map((heading) => (
              <th key={heading} className={thClass}>
                {heading}
              </th>
            ))}
            <th className={ACTION_TH_CLASS}>Action</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {loading ? (
            <tr>
              <td colSpan={15} className="px-6 py-12 text-center text-gray-500">Loading...</td>
            </tr>
          ) : filteredRows.length === 0 ? (
            <tr>
              <td colSpan={15} className="px-6 py-12 text-center text-gray-500">No professional activities found.</td>
            </tr>
          ) : (
            filteredRows.map((row, index) => (
              <tr key={row.id || index} style={{ backgroundColor: VALIDATION_ROW_COLORS[row.validation_status] }}>
                <td className="px-6 py-4 text-sm text-gray-900">{index + 1}</td>
                <td className="px-6 py-4 text-sm">
                  <a
                    href={resolveDocumentUrl('conducted', row.document)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    {row.egov_id}
                  </a>
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">{row.title}</td>
                <td className="px-6 py-4 text-sm text-gray-900">{row.level}</td>
                <td className="px-6 py-4 text-sm text-gray-900">{row.organizer}</td>
                <td className="px-6 py-4 text-sm text-gray-900">{row.co_organizer || '-'}</td>
                <td className="px-6 py-4 text-sm text-gray-900">{row.category}</td>
                <td className="px-6 py-4 text-sm text-gray-900">{row.sponsored}</td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  {row.sponsored === 'No' ? notApplicable : row.sponsoring_agency_name_address || '-'}
                </td>
                <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-900">{formatDateDMY(row.from_date)}</td>
                <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-900">{formatDateDMY(row.to_date)}</td>
                <td className="px-6 py-4 text-sm text-gray-900">{row.place}</td>
                <td className="px-6 py-4 text-sm text-gray-900">{row.no_of_days}</td>
                <td className="px-6 py-4 text-sm text-gray-900">{row.role}</td>
                <td
                  className="sticky right-0 z-10 px-6 py-4 whitespace-nowrap text-center text-sm font-medium border-l border-gray-200"
                  style={{ backgroundColor: rowBackground(row) }}
                >
                  {renderActionButtons(row, 'conducted')}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

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
              <h1 className="mb-2 text-4xl font-extrabold text-gray-900">Professional Activities</h1>
              <p className="mt-1 text-lg font-medium text-blue-700">
                Welcome{resolvedName ? `, ${resolvedName}` : ''}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Module path: <span className="font-mono">{activePath}</span>
              </p>
            </div>

            <div className="flex flex-col items-start justify-between gap-4 mb-6 sm:flex-row sm:items-center">
              <div className="relative w-full sm:w-72">
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search professional activity..."
                  className="w-full py-2 pl-10 pr-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>

              <button
                type="button"
                onClick={() => openCreateModal(activeTab)}
                className="flex items-center justify-center w-full px-6 py-3 font-medium text-white transition-all duration-300 transform rounded-lg shadow-lg bg-blue-600 hover:bg-blue-700 hover:-translate-y-1 hover:scale-105 sm:w-auto"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" className="w-5 h-5 mr-2" fill="currentColor">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                {activeTab === 'attended' ? 'Add Attended Activity' : 'Add Conducted Activity'}
              </button>
            </div>

            {error && (
              <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-6 py-4 text-sm text-red-700">{error}</div>
            )}

            {/* No overflow-hidden here on purpose: Firefox anchors position:sticky to the
                nearest ancestor with overflow != visible. Clipping this card would make it
                the sticky scrollport and the Action column would never follow the scroll. */}
            <div className="mb-10 bg-white shadow-xl rounded-xl">
              <div className="rounded-t-xl border-b border-gray-200">
                <nav className="-mb-0.5 flex justify-center space-x-6" aria-label="Professional activity tabs">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('attended');
                      setSearch('');
                    }}
                    className={`py-4 px-2 inline-flex items-center gap-2 border-b-[3px] text-sm whitespace-nowrap ${
                      activeTab === 'attended'
                        ? 'font-semibold border-blue-600 text-blue-700'
                        : 'border-transparent text-gray-500 hover:text-blue-600'
                    }`}
                  >
                    Professional Activity Attended Details
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('conducted');
                      setSearch('');
                    }}
                    className={`py-4 px-2 inline-flex items-center gap-2 border-b-[3px] text-sm whitespace-nowrap ${
                      activeTab === 'conducted'
                        ? 'font-semibold border-blue-600 text-blue-700'
                        : 'border-transparent text-gray-500 hover:text-blue-600'
                    }`}
                  >
                    Professional Activity Conducted Details
                  </button>
                </nav>
              </div>

              {activeTab === 'attended' ? renderAttendedTable() : renderConductedTable()}
            </div>

            {modalKind && (
              <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
                <div className="flex items-end justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                  <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={closeModal} />

                  <div className="inline-block overflow-hidden text-left align-bottom transition-all transform bg-white rounded-lg shadow-xl sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full">
                    <div className="px-6 py-4 bg-blue-600">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-medium text-white">
                          {modalKind === 'attended' ? 'Professional Activity Attended' : 'Professional Activity Conducted'}
                          {' - '}
                          {editingId ? 'Edit' : 'Add'}
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
                          <div className="md:col-span-2">
                            <TextField
                              label="Title"
                              name="title"
                              value={form.title}
                              onChange={handleChange}
                              error={formErrors.title}
                              required
                              placeholder="Title"
                            />
                          </div>

                          <TextField
                            label="Organizer"
                            name="organizer"
                            value={form.organizer}
                            onChange={handleChange}
                            error={formErrors.organizer}
                            required
                            placeholder="Organizer"
                          />

                          <SelectField
                            label="Level"
                            name="level"
                            value={form.level}
                            options={LEVELS}
                            onChange={handleChange}
                            error={formErrors.level}
                            required
                            placeholder="Choose Level"
                          />

                          <SelectField
                            label="Role"
                            name="role"
                            value={form.role}
                            options={modalKind === 'attended' ? ATTENDEE_ROLES : CONDUCTED_ROLES}
                            onChange={handleChange}
                            error={formErrors.role}
                            required
                            placeholder="Choose Role"
                          />

                          <SelectField
                            label="Category"
                            name="category"
                            value={form.category}
                            options={CATEGORIES}
                            onChange={handleChange}
                            error={formErrors.category}
                            required
                            placeholder="Choose Category"
                          />

                          {modalKind === 'attended' ? (
                            <>
                              <SelectField
                                label="Sponsored"
                                name="sponsored"
                                value={form.sponsored}
                                options={SPONSORED_OPTIONS}
                                onChange={handleChange}
                                error={formErrors.sponsored}
                                required
                              />

                              {form.sponsored === 'Yes' && (
                                <>
                                  <SelectField
                                    label="Sponsored By"
                                    name="sponsored_by"
                                    value={form.sponsored_by}
                                    options={SPONSORED_BY_OPTIONS}
                                    onChange={handleChange}
                                    error={formErrors.sponsored_by}
                                    required
                                  />

                                  {form.sponsored_by === 'Other' && (
                                    <TextField
                                      label="Other Sponsor"
                                      name="other_sponsored"
                                      value={form.other_sponsored}
                                      onChange={handleChange}
                                      error={formErrors.other_sponsored}
                                      required
                                      placeholder="Other Sponsor"
                                    />
                                  )}
                                </>
                              )}
                            </>
                          ) : (
                            <>
                              <SelectField
                                label="Sponsored"
                                name="sponsored"
                                value={form.sponsored}
                                options={SPONSORED_OPTIONS}
                                onChange={handleChange}
                                error={formErrors.sponsored}
                                required
                              />

                              <TextField
                                label="Co Organizer"
                                name="co_organizer"
                                value={form.co_organizer}
                                onChange={handleChange}
                                error={formErrors.co_organizer}
                                placeholder="Co Organizer"
                              />

                              {form.sponsored === 'Yes' && (
                                <TextField
                                  label="Sponsoring Agency Name Address"
                                  name="sponsoring_agency_name_address"
                                  value={form.sponsoring_agency_name_address}
                                  onChange={handleChange}
                                  error={formErrors.sponsoring_agency_name_address}
                                  required
                                  placeholder="Sponsoring Agency Name Address"
                                />
                              )}

                              <TextField
                                label="Place"
                                name="place"
                                value={form.place}
                                onChange={handleChange}
                                error={formErrors.place}
                                required
                                placeholder="Place"
                              />
                            </>
                          )}

                          <TextField
                            label="From Date"
                            name="from_date"
                            type="date"
                            value={form.from_date}
                            onChange={handleChange}
                            error={formErrors.from_date}
                            required
                          />

                          <TextField
                            label="To Date"
                            name="to_date"
                            type="date"
                            value={form.to_date}
                            onChange={handleChange}
                            error={formErrors.to_date}
                            required
                          />

                          <div>
                            <label className={LABEL_CLASS} htmlFor="pa-no_of_days">
                              No Of Days <span className="text-red-500">*</span>
                            </label>
                            <input
                              id="pa-no_of_days"
                              type="text"
                              readOnly
                              value={noOfDays}
                              className={
                                noOfDaysInvalid
                                  ? `${READONLY_DAYS_CLASS} border-red-500`
                                  : READONLY_DAYS_CLASS
                              }
                            />
                            <FieldError>{formErrors.no_of_days}</FieldError>
                          </div>

                          <div className="md:col-span-2">
                            {editingId && editingDocument && (
                              <div className="mb-2 flex flex-wrap items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
                                <span className="font-medium">Current document:</span>
                                <span className="font-mono break-all">{editingDocument}</span>
                                <a
                                  href={resolveDocumentUrl(modalKind, editingDocument)}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-md bg-blue-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-blue-700"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                    <path d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.964-7.178z" />
                                    <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  </svg>
                                  View
                                </a>
                              </div>
                            )}

                            <label className={LABEL_CLASS} htmlFor="pa-document">
                              Document{' '}
                              {editingId ? (
                                <span className="font-normal text-slate-600">
                                  (optional &mdash; leave empty to keep the current file)
                                </span>
                              ) : (
                                <span className="text-red-500">* Only PDF files up to 500 KB in size are accepted.</span>
                              )}
                            </label>
                            <input
                              id="pa-document"
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
                    <h3 className="text-lg font-medium text-gray-900">
                      Reason Details of Professional Activity {activeTab === 'attended' ? 'Attended' : 'Conducted'}
                    </h3>
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