import React, { useEffect, useMemo, useState } from 'react';
import { getAssociations } from '../../../api/associationApi';
import { getInstitutions } from '../../../api/institutionApi';
import {
  createStaffAssociation,
  deleteStaffAssociation,
  updateStaffAssociation,
} from '../../../api/staffAssociationApi';
import {
  createStaffInstitution,
  deleteStaffInstitution,
  updateStaffInstitution,
} from '../../../api/staffInstitutionApi';

function toInputDate(value) {
  if (!value) return '';

  // Preserve plain date values as-is to avoid timezone shifts.
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDateDMY(value) {
  if (!value) return '-';

  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthIndex = Number(month) - 1;
    if (monthIndex < 0 || monthIndex > 11) return '-';
    return `${day}-${monthNames[monthIndex]}-${year}`;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = String(date.getDate()).padStart(2, '0');
  const month = monthNames[date.getMonth()];
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

function calcDuration(start, end) {
  if (!start) return '-';
  const startDate = new Date(start);
  const endDate = end ? new Date(end) : new Date();
  if (isNaN(startDate) || isNaN(endDate)) return '-';
  const diff = Math.max(0, endDate - startDate);
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const years = Math.floor(days / 365);
  const months = Math.floor((days % 365) / 30);
  const remainingDays = days % 30;
  return `${years} years ${months} months ${remainingDays} days`;
}

function calcDurationDays(start, end) {
  if (!start) return 0;
  const startDate = new Date(start);
  const endDate = end ? new Date(end) : new Date();
  if (isNaN(startDate) || isNaN(endDate)) return 0;
  return Math.max(0, Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24)));
}

export default function Association({ staff, setNotification, onAssociationUpdated }) {
  const [associationOptions, setAssociationOptions] = useState([]);
  const [institutionOptions, setInstitutionOptions] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingRow, setEditingRow] = useState(null);
  const [showInstitutionModal, setShowInstitutionModal] = useState(false);
  const [editingInstitutionRow, setEditingInstitutionRow] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    associations_id: '',
    start_date: '',
    closing_date: '',
    reason: '',
    gcr: '',
  });
  const [institutionForm, setInstitutionForm] = useState({
    institution_id: '',
    start_date: '',
    end_date: '',
    reason: '',
    gcr: '',
  });
  const [closeForever, setCloseForever] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [associationRes, institutionRes] = await Promise.all([
          getAssociations(),
          getInstitutions(),
        ]);

        const associationRows = Array.isArray(associationRes?.data?.data)
          ? associationRes.data.data
          : Array.isArray(associationRes?.data)
            ? associationRes.data
            : [];

        const institutionRows = Array.isArray(institutionRes?.data?.data)
          ? institutionRes.data.data
          : Array.isArray(institutionRes?.data)
            ? institutionRes.data
            : [];

        if (mounted) {
          setAssociationOptions(associationRows);
          setInstitutionOptions(institutionRows);
        }
      } catch (_e) {
        if (mounted) {
          setAssociationOptions([]);
          setInstitutionOptions([]);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const associationRows = Array.isArray(staff?.association_staff) && staff.association_staff.length > 0
    ? staff.association_staff.map((a) => ({
        id: a.id,
        association_id: a.association_id,
        association_name: a.association_name || a.asso_name || a.name || '-',
        start_date: a.start_date,
        tenure_end_date: a.closing_date,
        end_date: a.end_date,
        duration: a.duration || calcDuration(a.start_date, a.end_date || a.closing_date),
        status: a.status,
        reason: a.reason,
        gcr: a.gcr,
        category: a.category || '',
      }))
    : [
        {
          id: null,
          association_id: null,
          association_name: staff?.association_name,
          start_date: staff?.association_start_date,
          tenure_end_date: staff?.association_tenure_end_date || staff?.association_closing_date,
          end_date: staff?.association_end_date,
          duration: staff?.association_duration || calcDuration(staff?.association_start_date, staff?.association_end_date),
          status: staff?.association_status,
          reason: '',
          gcr: '',
          category: '',
        }
      ];

  const institutionRows = Array.isArray(staff?.institutions) && staff.institutions.length > 0
    ? staff.institutions.map((inst) => ({
        ...inst,
        id: inst.id,
        institution_id: inst.institution_id,
        institution_name: inst.institution_name || inst.name || inst.acronym || '-',
        acronym: inst.acronym || inst.institution_name || inst.name || '-',
        start_date: inst.start_date,
        end_date: inst.end_date,
        duration: inst.duration || calcDuration(inst.start_date, inst.end_date),
        status: inst.status,
      }))
    : [
        {
          id: null,
          institution_id: null,
          institution_name: staff?.institution_name,
          acronym: staff?.institution_acronym || staff?.institution_name || '-',
          start_date: staff?.institution_start_date,
          end_date: staff?.institution_end_date,
          duration: staff?.institution_duration || calcDuration(staff?.institution_start_date, staff?.institution_end_date),
          status: staff?.institution_status,
        }
      ];

  const selectedAssociationCategory = useMemo(() => {
    const id = Number(form.associations_id || 0);
    const selected = associationOptions.find(a => Number(a.id) === id);
    return selected?.category || selected?.asso_name || '';
  }, [associationOptions, form.associations_id]);

  const isContractualSelected = useMemo(() => {
    const cat = selectedAssociationCategory || '';
    return cat.toLowerCase().includes('contractual') || cat.toLowerCase().includes('temporary');
  }, [selectedAssociationCategory]);

  const openCreateModal = () => {
    setEditingRow(null);
    setError('');
    setCloseForever(false);
    setForm({
      associations_id: '',
      start_date: toInputDate(new Date()),
      closing_date: '',
      reason: '',
      gcr: '',
    });
    setShowModal(true);
  };

  const openEditModal = (row) => {
    setEditingRow(row);
    setError('');
    const isContractual = row.association_id === 4 || row.association_name === 'Contractual' || row.asso_name === 'Contractual';
    setCloseForever(isContractual ? false : false);
    setForm({
      associations_id: row.association_id ? String(row.association_id) : '',
      start_date: toInputDate(row.start_date),
      closing_date: toInputDate(row.tenure_end_date),
      reason: row.reason || '',
      gcr: row.gcr || '',
    });
    setShowModal(true);
  };

  const closeModal = () => {
    if (saving) return;
    setShowModal(false);
    setEditingRow(null);
    setError('');
  };

  const openCreateInstitutionModal = () => {
    setEditingInstitutionRow(null);
    setError('');
    setInstitutionForm({
      institution_id: '',
      start_date: toInputDate(new Date()),
      end_date: '',
      reason: '',
      gcr: '',
    });
    setShowInstitutionModal(true);
  };

  const openEditInstitutionModal = (row) => {
    setEditingInstitutionRow(row);
    setError('');
    setInstitutionForm({
      institution_id: row.institution_id ? String(row.institution_id) : '',
      start_date: toInputDate(row.start_date),
      end_date: toInputDate(row.end_date),
      reason: row.reason || '',
      gcr: row.gcr || '',
    });
    setShowInstitutionModal(true);
  };

  const closeInstitutionModal = () => {
    if (saving) return;
    setShowInstitutionModal(false);
    setEditingInstitutionRow(null);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!staff?.id) {
      setError('Staff id not found');
      return;
    }
    if (!form.associations_id || !form.start_date) {
      setError('Association and start date are required');
      return;
    }
    if (selectedAssociationCategory === 'Temporary associated' && !form.closing_date) {
      setError('Closing date is required for temporary associations');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        associations_id: Number(form.associations_id),
        start_date: form.start_date,
        closing_date: form.closing_date || null,
        reason: form.reason || null,
        gcr: form.gcr || null,
        close_forever: closeForever ? 'close_forever' : null,
      };

      if (editingRow?.id) {
        await updateStaffAssociation(staff.id, editingRow.id, payload);
        if (typeof setNotification === 'function') {
          setNotification({ show: true, message: 'Association updated successfully', type: 'success' });
        }
      } else {
        await createStaffAssociation(staff.id, payload);
        if (typeof setNotification === 'function') {
          setNotification({ show: true, message: 'Association added successfully', type: 'success' });
        }
      }

      if (typeof onAssociationUpdated === 'function') {
        await onAssociationUpdated();
      }
      closeModal();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to save association');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row) => {
    if (!row?.id || !staff?.id) return;

    const durationDays = calcDurationDays(row.start_date, row.end_date);
    const maxDays = 30;
    const durationObj = calcDuration(row.start_date, row.end_date);
    const isWithinOneMonth = durationObj.includes('0 years') && parseInt(durationObj) <= 1;

    if (row.status !== 'active' || !isWithinOneMonth) {
      setError('Delete allowed only for active association within 1 month of creation.');
      return;
    }

    if (!window.confirm('Are you sure you want to delete this association record?')) return;

    try {
      await deleteStaffAssociation(staff.id, row.id);
      if (typeof setNotification === 'function') {
        setNotification({ show: true, message: 'Association deleted successfully', type: 'success' });
      }
      if (typeof onAssociationUpdated === 'function') {
        await onAssociationUpdated();
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to delete association');
    }
  };

  const handleInstitutionSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!staff?.id) {
      setError('Staff id not found');
      return;
    }
    if (!institutionForm.institution_id || !institutionForm.start_date) {
      setError('Institution and start date are required');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        institution_id: Number(institutionForm.institution_id),
        start_date: institutionForm.start_date,
        end_date: institutionForm.end_date || null,
        reason: institutionForm.reason || null,
        gcr: institutionForm.gcr || null,
      };

      if (editingInstitutionRow?.id) {
        await updateStaffInstitution(staff.id, editingInstitutionRow.id, payload);
        if (typeof setNotification === 'function') {
          setNotification({ show: true, message: 'Institution updated successfully', type: 'success' });
        }
      } else {
        await createStaffInstitution(staff.id, payload);
        if (typeof setNotification === 'function') {
          setNotification({ show: true, message: 'Institution added successfully', type: 'success' });
        }
      }

      if (typeof onAssociationUpdated === 'function') {
        await onAssociationUpdated();
      }
      closeInstitutionModal();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to save institution');
    } finally {
      setSaving(false);
    }
  };

  const handleInstitutionDelete = async (row) => {
    if (!row?.id || !staff?.id) return;
    if (!window.confirm('Delete this institution record?')) return;

    try {
      await deleteStaffInstitution(staff.id, row.id);
      if (typeof setNotification === 'function') {
        setNotification({ show: true, message: 'Institution deleted successfully', type: 'success' });
      }
      if (typeof onAssociationUpdated === 'function') {
        await onAssociationUpdated();
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to delete institution');
    }
  };

  return (
    <div className="w-full space-y-8">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl font-bold text-blue-700">Staff Association</h2>
        <button
          onClick={openCreateModal}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-semibold"
        >
          Change Association
        </button>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="overflow-auto rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full">
          <thead className="bg-gray-100">
          <tr>
            <th className="px-3 py-2 border-b text-left text-sm font-semibold text-gray-700">S.no</th>
            <th className="px-3 py-2 border-b text-left text-sm font-semibold text-gray-700">Association</th>
            <th className="px-3 py-2 border-b text-left text-sm font-semibold text-gray-700">Start Date</th>
            <th className="px-3 py-2 border-b text-left text-sm font-semibold text-gray-700">Tenure End Date</th>
            <th className="px-3 py-2 border-b text-left text-sm font-semibold text-gray-700">End Date</th>
            <th className="px-3 py-2 border-b text-left text-sm font-semibold text-gray-700">Duration</th>
            <th className="px-3 py-2 border-b text-left text-sm font-semibold text-gray-700">Status</th>
            <th className="px-3 py-2 border-b text-left text-sm font-semibold text-gray-700">Actions</th>
          </tr>
        </thead>
        <tbody>
          {associationRows.map((a, idx) => {
            const isClosed = String(a.status || '').toLowerCase() === 'inactive';
            const duration = calcDuration(a.start_date, a.end_date);
            const isWithinOneMonth = duration.includes('0 years') && parseInt(duration) <= 1;

            return (
              <tr key={idx} className={isClosed ? 'bg-gray-300' : 'even:bg-gray-50'}>
                <td className="px-3 py-2 border-b text-sm">{idx + 1}</td>
                <td className="px-3 py-2 border-b text-sm">{a.association_name || '-'}</td>
                <td className="px-3 py-2 border-b text-sm">{formatDateDMY(a.start_date)}</td>
                <td className="px-3 py-2 border-b text-sm">
                  <span className={a.tenure_end_date ? 'text-red-500' : ''}>
                    {a.tenure_end_date ? formatDateDMY(a.tenure_end_date) : '--NA--'}
                  </span>
                </td>
                <td className="px-3 py-2 border-b text-sm">{a.end_date ? formatDateDMY(a.end_date) : '--NA--'}</td>
                <td className="px-3 py-2 border-b text-sm">{a.duration || '-'}</td>
                <td className="px-3 py-2 border-b text-sm">{a.status || '-'}</td>
                <td className="px-3 py-2 border-b text-sm">
                  <div className="flex items-center justify-center space-x-2">
                    {isClosed ? (
                      <button
                        onClick={() => openEditModal(a)}
                        className="p-2 text-white transition-colors duration-200 bg-green-600 rounded-lg hover:bg-green-700"
                        title="Activate Association"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </button>
                    ) : (
                      <button
                        onClick={() => openEditModal(a)}
                        className="p-2 text-white transition-colors duration-200 bg-blue-600 rounded-lg hover:bg-blue-700"
                        title="Edit Association"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                    )}
                    {!isClosed && isWithinOneMonth && (
                      <button
                        onClick={() => handleDelete(a)}
                        className="p-2 text-white transition-colors duration-200 bg-red-600 rounded-lg hover:bg-red-700"
                        title="Delete Association"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>

      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl font-bold text-blue-700 mb-4">Staff Institution</h2>
        <button
          onClick={openCreateInstitutionModal}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-semibold mb-4"
        >
          Change Institution
        </button>
      </div>
      <div className="overflow-auto rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full">
          <thead className="bg-gray-100">
          <tr>
            <th className="px-3 py-2 border-b text-left text-sm font-semibold text-gray-700">S.no</th>
            <th className="px-3 py-2 border-b text-left text-sm font-semibold text-gray-700">Institution</th>
            <th className="px-3 py-2 border-b text-left text-sm font-semibold text-gray-700">Start Date</th>
            <th className="px-3 py-2 border-b text-left text-sm font-semibold text-gray-700">End Date</th>
            <th className="px-3 py-2 border-b text-left text-sm font-semibold text-gray-700">Duration</th>
            <th className="px-3 py-2 border-b text-left text-sm font-semibold text-gray-700">Status</th>
            <th className="px-3 py-2 border-b text-left text-sm font-semibold text-gray-700">Action</th>
          </tr>
        </thead>
        <tbody>
          {institutionRows.map((inst, idx) => {
            const isClosed = String(inst.status || '').toLowerCase() === 'inactive';
            return (
              <tr key={idx} className={isClosed ? 'bg-gray-300' : 'even:bg-gray-50'}>
                <td className="px-3 py-2 border-b text-sm">{idx + 1}</td>
                <td className="px-3 py-2 border-b text-sm">{inst.acronym || inst.institution_name || '-'}</td>
                <td className="px-3 py-2 border-b text-sm">{formatDateDMY(inst.start_date)}</td>
                <td className="px-3 py-2 border-b text-sm">{formatDateDMY(inst.end_date)}</td>
                <td className="px-3 py-2 border-b text-sm">{inst.duration || '-'}</td>
                <td className="px-3 py-2 border-b text-sm">{inst.status || '-'}</td>
                <td className="px-3 py-2 border-b text-sm">
                  <div className="flex items-center justify-center space-x-2">
                    {isClosed ? (
                      <button
                        onClick={() => openEditInstitutionModal(inst)}
                        className="p-2 text-white transition-colors duration-200 bg-green-600 rounded-lg hover:bg-green-700"
                        title="Activate Institution"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </button>
                    ) : (
                      <button
                        onClick={() => openEditInstitutionModal(inst)}
                        className="p-2 text-white transition-colors duration-200 bg-blue-600 rounded-lg hover:bg-blue-700"
                        title="Edit Institution"
                        disabled={!inst.id}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-2xl rounded-xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h3 className="text-lg font-bold text-gray-800">
                {editingRow ? 'Edit Association' : 'Change Association'}
              </h3>
              <button onClick={closeModal} className="text-gray-500 hover:text-gray-700 text-xl font-bold">&times;</button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {editingRow?.status === 'inactive' && (
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="status"
                    value="active"
                    checked={form.status === 'active'}
                    onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
                    className="ti-form-radio"
                  />
                  <label className="text-sm text-gray-700">Make it Active</label>
                </div>
              )}

              {editingRow?.status !== 'inactive' && (
                <>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Association</label>
                      <select
                        className="w-full rounded-lg border border-gray-300 px-3 py-2"
                        value={form.associations_id}
                        onChange={(e) => {
                          const val = e.target.value;
                          setForm((prev) => ({ ...prev, associations_id: val }));
                          if (val !== '4') {
                            setCloseForever(false);
                          }
                        }}
                        required
                      >
                        <option value="">Select association</option>
                        {associationOptions.map((opt) => (
                          <option key={opt.id} value={opt.id}>{opt.asso_name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Effect from Date</label>
                      <input
                        type="date"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2"
                        value={form.start_date}
                        onChange={(e) => setForm((prev) => ({ ...prev, start_date: e.target.value }))}
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Tenure Closing Date</label>
                      <input
                        type="date"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2"
                        value={form.closing_date}
                        onChange={(e) => setForm((prev) => ({ ...prev, closing_date: e.target.value }))}
                        disabled={!isContractualSelected}
                      />
                      {!isContractualSelected && (
                        <p className="text-xs text-red-500 mt-1">Only visible for Temporary associated / Contractual</p>
                      )}
                    </div>
                  </div>

                  {isContractualSelected && (
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="close_forever_checkbox"
                        checked={closeForever}
                        onChange={(e) => setCloseForever(e.target.checked)}
                        className="ti-form-checkbox"
                      />
                      <label htmlFor="close_forever_checkbox" className="text-sm text-gray-600">
                        Close Contractual{' '}
                        <span className="text-red-500">(Check only when closing the contractual period forever)</span>
                      </label>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Reason</label>
                      <input
                        type="text"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2"
                        value={form.reason}
                        onChange={(e) => setForm((prev) => ({ ...prev, reason: e.target.value }))}
                        placeholder="Reason"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">GC Resolution</label>
                      <input
                        type="text"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2"
                        value={form.gcr}
                        onChange={(e) => setForm((prev) => ({ ...prev, gcr: e.target.value }))}
                        placeholder="GCR"
                      />
                    </div>
                  </div>
                </>
              )}

              {error && <div className="text-sm text-red-600">{error}</div>}

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={closeModal} className="px-4 py-2 rounded-md bg-gray-200 text-gray-700" disabled={saving}>Cancel</button>
                <button type="submit" className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700" disabled={saving}>
                  {saving ? 'Saving...' : editingRow?.status === 'inactive' ? 'Activate' : editingRow ? 'Update' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showInstitutionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-2xl rounded-xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h3 className="text-lg font-bold text-gray-800">
                {editingInstitutionRow ? 'Edit Institution' : 'Change Institution'}
              </h3>
              <button onClick={closeInstitutionModal} className="text-gray-500 hover:text-gray-700">X</button>
            </div>

            <form onSubmit={handleInstitutionSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Institution</label>
                  <select
                    className="w-full rounded-lg border border-gray-300 px-3 py-2"
                    value={institutionForm.institution_id}
                    onChange={(e) => setInstitutionForm((prev) => ({ ...prev, institution_id: e.target.value }))}
                    required
                  >
                    <option value="">Select institution</option>
                    {institutionOptions.map((opt) => (
                      <option key={opt.id} value={opt.id}>{opt.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Effect from Date</label>
                  <input
                    type="date"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2"
                    value={institutionForm.start_date}
                    onChange={(e) => setInstitutionForm((prev) => ({ ...prev, start_date: e.target.value }))}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">End Date</label>
                  <input
                    type="date"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2"
                    value={institutionForm.end_date}
                    onChange={(e) => setInstitutionForm((prev) => ({ ...prev, end_date: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Reason</label>
                  <input
                    type="text"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2"
                    value={institutionForm.reason}
                    onChange={(e) => setInstitutionForm((prev) => ({ ...prev, reason: e.target.value }))}
                    placeholder="Reason"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">GC Resolution</label>
                  <input
                    type="text"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2"
                    value={institutionForm.gcr}
                    onChange={(e) => setInstitutionForm((prev) => ({ ...prev, gcr: e.target.value }))}
                    placeholder="GCR"
                  />
                </div>
              </div>

              {error && <div className="text-sm text-red-600">{error}</div>}

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={closeInstitutionModal} className="px-4 py-2 rounded-md bg-gray-200 text-gray-700" disabled={saving}>Cancel</button>
                <button type="submit" className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700" disabled={saving}>
                  {saving ? 'Saving...' : editingInstitutionRow ? 'Update' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
