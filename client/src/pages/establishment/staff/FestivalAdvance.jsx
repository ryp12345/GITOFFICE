import React, { useEffect, useState } from 'react';
import {
  createStaffFestivalAdvance,
  deleteStaffFestivalAdvance,
  getStaffFestivalAdvances,
  updateStaffFestivalAdvance,
} from '../../../api/staffPayrollApi';
import { getErrorMessage } from '../../../utils/errors';
import { formatDateDMY, toInputDate } from './tabFormat';

const defaultForm = { fyear: '', amount: '', start_date: '' };

// Laravel ESTB staff view → "Festival Advance" (shown for Non-Teaching staff only).
export default function FestivalAdvance({ staff, setNotification, readOnly = false }) {
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
      const res = await getStaffFestivalAdvances(staff.id);
      setRows(Array.isArray(res?.data) ? res.data : []);
    } catch (err) {
      setRows([]);
      setError(getErrorMessage(err, 'Failed to load festival advances'));
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
    // Laravel fixes the year to the current year on the add form.
    setForm({ fyear: String(new Date().getFullYear()), amount: '', start_date: toInputDate(new Date()) });
    setShowModal(true);
  };

  const openEditModal = (row) => {
    setEditingRow(row);
    setError('');
    setForm({
      fyear: row.fyear !== null && row.fyear !== undefined ? String(row.fyear) : '',
      amount: row.amount !== null && row.amount !== undefined ? String(row.amount) : '',
      start_date: toInputDate(row.start_date),
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
    if (!form.amount || !form.start_date) {
      setError('Amount and Start Date are required');
      return;
    }

    setSaving(true);
    try {
      const payload = { amount: parseInt(form.amount, 10), start_date: form.start_date };
      if (editingRow?.id) {
        await updateStaffFestivalAdvance(staff.id, editingRow.id, payload);
        setNotification?.({ show: true, message: 'Festival advance updated successfully', type: 'success' });
      } else {
        await createStaffFestivalAdvance(staff.id, payload);
        setNotification?.({ show: true, message: 'Festival advance added successfully', type: 'success' });
      }
      await fetchData();
      setSaving(false);
      closeModal();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to save festival advance'));
      setSaving(false);
    }
  };

  const handleDelete = async (row) => {
    if (!row?.id || !window.confirm('Delete this festival advance?')) return;
    try {
      await deleteStaffFestivalAdvance(staff.id, row.id);
      setNotification?.({ show: true, message: 'Festival advance deleted successfully', type: 'success' });
      await fetchData();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to delete festival advance'));
    }
  };

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl font-bold text-blue-700">Festival Advance Details</h2>
        {!readOnly && (
          <button
            onClick={openCreateModal}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-semibold"
          >
            + Add Festival Advance
          </button>
        )}
      </div>

      {error && !showModal && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="overflow-auto rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-3 py-2 border-b text-left text-sm font-semibold text-gray-700">S.no</th>
              <th className="px-3 py-2 border-b text-left text-sm font-semibold text-gray-700">Year</th>
              <th className="px-3 py-2 border-b text-left text-sm font-semibold text-gray-700">Amount (₹)</th>
              <th className="px-3 py-2 border-b text-left text-sm font-semibold text-gray-700">Start Date</th>
              {!readOnly && <th className="px-3 py-2 border-b text-left text-sm font-semibold text-gray-700">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="px-3 py-6 text-center text-sm text-gray-400">Loading...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={5} className="px-3 py-6 text-center text-sm text-gray-400">No festival advance records found.</td></tr>
            ) : (
              rows.map((row, idx) => (
                <tr key={row.id} className="even:bg-gray-50">
                  <td className="px-3 py-2 border-b text-sm">{idx + 1}</td>
                  <td className="px-3 py-2 border-b text-sm">{row.fyear ?? '-'}</td>
                  <td className="px-3 py-2 border-b text-sm">{row.amount ?? '-'}</td>
                  <td className="px-3 py-2 border-b text-sm">{formatDateDMY(row.start_date)}</td>
                  {!readOnly && (
                    <td className="px-3 py-2 border-b text-sm">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEditModal(row)} className="px-3 py-1 text-white bg-blue-600 rounded-lg hover:bg-blue-700 text-xs">Edit</button>
                        <button onClick={() => handleDelete(row)} className="px-3 py-1 text-white bg-red-600 rounded-lg hover:bg-red-700 text-xs">Delete</button>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-xl rounded-xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h3 className="text-lg font-bold text-gray-800">{editingRow ? 'Edit Festival Advance' : 'Add Festival Advance'}</h3>
              <button onClick={closeModal} className="text-gray-500 hover:text-gray-700 text-xl font-bold">&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Year</label>
                  <input type="text" className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2" value={form.fyear} readOnly />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Amount (₹) <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    min="0"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2"
                    value={form.amount}
                    onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Start Date <span className="text-red-500">*</span></label>
                  <input
                    type="date"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2"
                    value={form.start_date}
                    onChange={(e) => setForm((prev) => ({ ...prev, start_date: e.target.value }))}
                    required
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={closeModal} disabled={saving} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm font-medium">Cancel</button>
                <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-semibold disabled:opacity-60">
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
