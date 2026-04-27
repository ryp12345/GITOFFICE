import React, { useEffect, useState } from 'react';
import {
  createStaffSocietyShare,
  deleteStaffSocietyShare,
  getStaffSocietyShares,
  updateStaffSocietyShare,
} from '../../../api/staffSocietyShareApi';

function toInputDate(value) {
  if (!value) return '';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
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

const defaultForm = {
  member_id: '',
  amount: '',
  start_date: '',
  end_date: '',
};

export default function SocietyShare({ staff, setNotification, onSocietyShareUpdated }) {
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
      const res = await getStaffSocietyShares(staff.id);
      setRows(Array.isArray(res?.data) ? res.data : []);
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
    setForm({ ...defaultForm, start_date: toInputDate(new Date()) });
    setShowModal(true);
  };

  const openEditModal = (row) => {
    setEditingRow(row);
    setError('');
    setForm({
      member_id: row.member_id || '',
      amount: row.amount !== null && row.amount !== undefined ? String(row.amount) : '',
      start_date: toInputDate(row.start_date),
      end_date: toInputDate(row.end_date),
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

    if (!staff?.id) { setError('Staff id not found'); return; }
    if (!form.member_id || !form.amount || !form.start_date) {
      setError('Member ID, Amount, and Start Date are required');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        member_id: form.member_id,
        amount: parseFloat(form.amount),
        start_date: form.start_date,
        end_date: form.end_date || null,
      };

      if (editingRow?.id) {
        await updateStaffSocietyShare(staff.id, editingRow.id, payload);
        if (typeof setNotification === 'function') {
          setNotification({ show: true, message: 'Society share updated successfully', type: 'success' });
        }
      } else {
        await createStaffSocietyShare(staff.id, payload);
        if (typeof setNotification === 'function') {
          setNotification({ show: true, message: 'Society share added successfully', type: 'success' });
        }
      }

      await fetchData();
      if (typeof onSocietyShareUpdated === 'function') await onSocietyShareUpdated();
      closeModal();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to save society share');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row) => {
    if (!row?.id || !staff?.id) return;
    if (!window.confirm('Delete this society share record?')) return;
    try {
      await deleteStaffSocietyShare(staff.id, row.id);
      if (typeof setNotification === 'function') {
        setNotification({ show: true, message: 'Society share deleted successfully', type: 'success' });
      }
      await fetchData();
      if (typeof onSocietyShareUpdated === 'function') await onSocietyShareUpdated();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to delete society share');
    }
  };

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl font-bold text-blue-700">Society Share Details</h2>
        <button
          onClick={openCreateModal}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-semibold flex items-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Share Details
        </button>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="overflow-auto rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-3 py-2 border-b text-left text-sm font-semibold text-gray-700">S.No</th>
              <th className="px-3 py-2 border-b text-left text-sm font-semibold text-gray-700">Member ID</th>
              <th className="px-3 py-2 border-b text-left text-sm font-semibold text-gray-700">Amount (₹)</th>
              <th className="px-3 py-2 border-b text-left text-sm font-semibold text-gray-700">Start Date</th>
              <th className="px-3 py-2 border-b text-left text-sm font-semibold text-gray-700">End Date</th>
              <th className="px-3 py-2 border-b text-left text-sm font-semibold text-gray-700">Status</th>
              <th className="px-3 py-2 border-b text-left text-sm font-semibold text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="px-3 py-6 text-center text-sm text-gray-400">Loading...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={7} className="px-3 py-6 text-center text-sm text-gray-400">No society share records found.</td></tr>
            ) : (
              rows.map((row, idx) => (
                <tr key={row.id || idx} className="even:bg-gray-50">
                  <td className="px-3 py-2 border-b text-sm">{idx + 1}</td>
                  <td className="px-3 py-2 border-b text-sm">{row.member_id || '-'}</td>
                  <td className="px-3 py-2 border-b text-sm">{row.amount ?? '-'}</td>
                  <td className="px-3 py-2 border-b text-sm">{formatDateDMY(row.start_date)}</td>
                  <td className="px-3 py-2 border-b text-sm">{formatDateDMY(row.end_date)}</td>
                  <td className="px-3 py-2 border-b text-sm">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${row.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                      {row.status || '-'}
                    </span>
                  </td>
                  <td className="px-3 py-2 border-b text-sm">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEditModal(row)}
                        className="p-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors duration-200"
                        title="Edit"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(row)}
                        className="p-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors duration-200"
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
                {editingRow ? 'Edit Share Details' : 'Add New Share Details'}
              </h3>
              <button onClick={closeModal} className="text-gray-500 hover:text-gray-700 text-xl font-bold">&times;</button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Member ID <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2"
                    value={form.member_id}
                    onChange={(e) => setForm((prev) => ({ ...prev, member_id: e.target.value }))}
                    placeholder="Member ID"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Amount (₹) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2"
                    value={form.amount}
                    onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
                    placeholder="Enter Amount"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Start Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2"
                    value={form.start_date}
                    onChange={(e) => setForm((prev) => ({ ...prev, start_date: e.target.value }))}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2"
                    value={form.end_date}
                    onChange={(e) => setForm((prev) => ({ ...prev, end_date: e.target.value }))}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 text-sm font-medium"
                  disabled={saving}
                >
                  Close
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm font-semibold disabled:opacity-60"
                  disabled={saving}
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
