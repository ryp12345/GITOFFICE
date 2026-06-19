import React, { useEffect, useState } from 'react';
import {
  createStaffAnnualIncrement,
  deleteStaffAnnualIncrement,
  getStaffAnnualIncrements,
  updateStaffAnnualIncrement,
} from '../../../api/staffAnnualIncrementApi';

function toInputDate(value) {
  if (!value) return '';
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

const ADDITIONAL_DAYS_TYPE_OPTIONS = [
  { value: 'Current Year', label: 'Current Year' },
  { value: 'Permanent', label: 'Permanent' },
];

const defaultForm = {
  wef: '',
  additional_days: '',
  additional_days_type: 'Permanent',
  gc: '',
  reason: '',
  basic: '',
};

export default function AnnualIncrement({ staff, setNotification, onAnnualIncrementUpdated }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingRow, setEditingRow] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState(defaultForm);

  const fetchData = async () => {
    if (!staff?.id) return;
    setLoading(true);
    try {
      const res = await getStaffAnnualIncrements(staff.id);
      const data = Array.isArray(res?.data) ? res.data : [];
      setRows(data);
    } catch (_e) {
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staff?.id]);

  const openCreateModal = () => {
    setEditingRow(null);
    setError('');
    setForm({ ...defaultForm, wef: toInputDate(new Date()) });
    setShowModal(true);
  };

  const openEditModal = (row) => {
    setEditingRow(row);
    setError('');
    setForm({
      wef: toInputDate(row.wef),
      additional_days: row.additional_days !== null && row.additional_days !== undefined ? String(row.additional_days) : '',
      additional_days_type: row.additional_days_type || 'Permanent',
      gc: row.gc || '',
      reason: row.reason || '',
      basic: row.basic !== null && row.basic !== undefined ? String(row.basic) : '',
    });
    setShowModal(true);
  };

  const closeModal = () => {
    if (saving) return;
    setShowModal(false);
    setEditingRow(null);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!staff?.id) {
      setError('Staff id not found');
      return;
    }
    if (!form.wef || !form.gc || !form.reason || !form.basic) {
      setError('WEF, GC, Reason and Basic Pay are required');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        wef: form.wef,
        additional_days: form.additional_days ? parseInt(form.additional_days, 10) : 0,
        additional_days_type: form.additional_days_type,
        gc: form.gc,
        reason: form.reason,
        basic: Number(form.basic),
      };

      if (editingRow?.id) {
        await updateStaffAnnualIncrement(staff.id, editingRow.id, payload);
        if (typeof setNotification === 'function') {
          setNotification({ show: true, message: 'Annual increment updated successfully', type: 'success' });
        }
      } else {
        await createStaffAnnualIncrement(staff.id, payload);
        if (typeof setNotification === 'function') {
          setNotification({ show: true, message: 'Annual increment added successfully', type: 'success' });
        }
      }

      await fetchData();
      if (typeof onAnnualIncrementUpdated === 'function') {
        await onAnnualIncrementUpdated();
      }
      closeModal();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to save annual increment');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row) => {
    if (!row?.id || !staff?.id) return;
    if (!window.confirm('Delete this annual increment record?')) return;

    try {
      await deleteStaffAnnualIncrement(staff.id, row.id);
      if (typeof setNotification === 'function') {
        setNotification({ show: true, message: 'Annual increment deleted successfully', type: 'success' });
      }
      await fetchData();
      if (typeof onAnnualIncrementUpdated === 'function') {
        await onAnnualIncrementUpdated();
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to delete annual increment');
    }
  };

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl font-bold text-blue-700">Annual Increment Details</h2>
        <button
          onClick={openCreateModal}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-semibold flex items-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Annual Increment
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
              <th className="px-3 py-2 border-b text-left text-sm font-semibold text-gray-700">Basic</th>
              <th className="px-3 py-2 border-b text-left text-sm font-semibold text-gray-700">With Effect From</th>
              <th className="px-3 py-2 border-b text-left text-sm font-semibold text-gray-700">Increment Postponed By</th>
              <th className="px-3 py-2 border-b text-left text-sm font-semibold text-gray-700">GC</th>
              <th className="px-3 py-2 border-b text-left text-sm font-semibold text-gray-700">Reason</th>
              <th className="px-3 py-2 border-b text-left text-sm font-semibold text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-sm text-gray-400">Loading...</td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-sm text-gray-400">No annual increment records found.</td>
              </tr>
            ) : (
              rows.map((row, idx) => (
                <tr key={row.id || idx} className="even:bg-gray-50">
                  <td className="px-3 py-2 border-b text-sm">{idx + 1}</td>
                  <td className="px-3 py-2 border-b text-sm">{row.basic || '-'}</td>
                  <td className="px-3 py-2 border-b text-sm">{formatDateDMY(row.wef)}</td>
                  <td className="px-3 py-2 border-b text-sm">{row.additional_days ?? '-'}</td>
                  <td className="px-3 py-2 border-b text-sm">{row.gc || '-'}</td>
                  <td className="px-3 py-2 border-b text-sm">{row.reason || '-'}</td>
                  <td className="px-3 py-2 border-b text-sm">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEditModal(row)}
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

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-2xl rounded-xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h3 className="text-lg font-bold text-gray-800">
                {editingRow ? 'Edit Annual Increment' : 'Add Annual Increment'}
              </h3>
              <button onClick={closeModal} className="text-gray-500 hover:text-gray-700 text-xl font-bold">&times;</button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    With Effect From <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2"
                    value={form.wef}
                    onChange={(e) => setForm((prev) => ({ ...prev, wef: e.target.value }))}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Increment Postponed By (days) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2"
                    value={form.additional_days}
                    onChange={(e) => setForm((prev) => ({ ...prev, additional_days: e.target.value }))}
                    placeholder="Number of days"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Postponement Type <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-4 mt-1">
                    {ADDITIONAL_DAYS_TYPE_OPTIONS.map((opt) => (
                      <label key={opt.value} className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="radio"
                          name="additional_days_type"
                          value={opt.value}
                          checked={form.additional_days_type === opt.value}
                          onChange={(e) => setForm((prev) => ({ ...prev, additional_days_type: e.target.value }))}
                          required
                        />
                        {opt.label}
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    GC <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2"
                    value={form.gc}
                    onChange={(e) => setForm((prev) => ({ ...prev, gc: e.target.value }))}
                    placeholder="GC"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Reason <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2"
                    value={form.reason}
                    onChange={(e) => setForm((prev) => ({ ...prev, reason: e.target.value }))}
                    placeholder="Reason"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Basic Pay <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2"
                    value={form.basic}
                    onChange={(e) => setForm((prev) => ({ ...prev, basic: e.target.value }))}
                    placeholder="Basic pay"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-semibold disabled:opacity-60"
                >
                  {saving ? 'Saving...' : editingRow ? 'Update' : 'Add'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
