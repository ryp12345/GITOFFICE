import React, { useEffect, useState } from 'react';
import {
  createStaffRemunerations,
  deleteStaffRemuneration,
  getStaffRemunerations,
  updateStaffRemuneration,
} from '../../../api/staffPayrollApi';
import { getErrorMessage } from '../../../utils/errors';
import { formatDateDMY, formatINR, toInputDate } from './tabFormat';

const emptyRow = () => ({ remunerationhead_id: '', amount: '', date_of_disbursement: '' });

// Laravel ESTB staff view → "Remuneration" (staffremunerationheads for this staff).
export default function Remuneration({ staff, setNotification, readOnly = false }) {
  const [rows, setRows] = useState([]);
  const [heads, setHeads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(null); // null | { mode: 'add' } | { mode: 'edit', row }
  const [formRows, setFormRows] = useState([emptyRow()]);
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    if (!staff?.id) return;
    setLoading(true);
    try {
      const res = await getStaffRemunerations(staff.id);
      setRows(Array.isArray(res?.data) ? res.data : []);
      setHeads(Array.isArray(res?.heads) ? res.heads : []);
    } catch (err) {
      setRows([]);
      setError(getErrorMessage(err, 'Failed to load remunerations'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staff?.id]);

  const openAdd = () => {
    setError('');
    setFormRows([emptyRow()]);
    setModal({ mode: 'add' });
  };

  const openEdit = (row) => {
    setError('');
    setFormRows([{
      remunerationhead_id: String(row.remunerationhead_id),
      amount: row.amount !== null && row.amount !== undefined ? String(row.amount) : '',
      date_of_disbursement: toInputDate(row.date_of_disbursement),
    }]);
    setModal({ mode: 'edit', row });
  };

  const closeModal = () => {
    if (saving) return;
    setModal(null);
    setError('');
  };

  const setField = (idx, key, value) => {
    setFormRows((prev) => prev.map((r, i) => (i === idx ? { ...r, [key]: value } : r)));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (formRows.some((r) => !r.remunerationhead_id || r.amount === '' || !r.date_of_disbursement)) {
      setError('Remuneration head, amount and date of disbursement are required for every row');
      return;
    }
    const payload = formRows.map((r) => ({
      remunerationhead_id: Number(r.remunerationhead_id),
      amount: Number(r.amount),
      date_of_disbursement: r.date_of_disbursement,
    }));

    setSaving(true);
    try {
      if (modal.mode === 'edit') {
        await updateStaffRemuneration(staff.id, modal.row.id, payload[0]);
        setNotification?.({ show: true, message: 'Remuneration updated successfully', type: 'success' });
      } else {
        await createStaffRemunerations(staff.id, payload);
        setNotification?.({ show: true, message: 'Remuneration added successfully', type: 'success' });
      }
      await fetchData();
      setSaving(false);
      setModal(null);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to save remuneration'));
      setSaving(false);
    }
  };

  const handleDelete = async (row) => {
    if (!window.confirm('Delete this remuneration?')) return;
    try {
      await deleteStaffRemuneration(staff.id, row.id);
      setNotification?.({ show: true, message: 'Staff remuneration deleted successfully', type: 'success' });
      await fetchData();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to delete remuneration'));
    }
  };

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl font-bold text-blue-700">Remuneration Details</h2>
        {!readOnly && (
          <button
            onClick={openAdd}
            disabled={!heads.length}
            title={heads.length ? '' : 'No remuneration heads are configured'}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-semibold disabled:opacity-50"
          >
            + Add Remuneration
          </button>
        )}
      </div>

      {error && !modal && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="overflow-auto rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-3 py-2 border-b text-left text-sm font-semibold text-gray-700">Sl.No</th>
              <th className="px-3 py-2 border-b text-left text-sm font-semibold text-gray-700">Remuneration Head</th>
              <th className="px-3 py-2 border-b text-left text-sm font-semibold text-gray-700">Amount (₹)</th>
              <th className="px-3 py-2 border-b text-left text-sm font-semibold text-gray-700">Date of Disbursement</th>
              <th className="px-3 py-2 border-b text-left text-sm font-semibold text-gray-700">Financial Year</th>
              {!readOnly && <th className="px-3 py-2 border-b text-left text-sm font-semibold text-gray-700">Action</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-3 py-6 text-center text-sm text-gray-400">Loading...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={6} className="px-3 py-6 text-center text-sm text-gray-400">No remuneration records found.</td></tr>
            ) : (
              rows.map((row, idx) => (
                <tr key={row.id} className="even:bg-gray-50">
                  <td className="px-3 py-2 border-b text-sm">{idx + 1}</td>
                  <td className="px-3 py-2 border-b text-sm">{row.remuneration_head}</td>
                  <td className="px-3 py-2 border-b text-sm">{formatINR(row.amount)}</td>
                  <td className="px-3 py-2 border-b text-sm">{formatDateDMY(row.date_of_disbursement)}</td>
                  <td className="px-3 py-2 border-b text-sm">{row.financial_year || '-'}</td>
                  {!readOnly && (
                    <td className="px-3 py-2 border-b text-sm">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEdit(row)} className="px-3 py-1 text-white bg-blue-600 rounded-lg hover:bg-blue-700 text-xs">Edit</button>
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

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-3xl rounded-xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h3 className="text-lg font-bold text-gray-800">{modal.mode === 'edit' ? 'Edit Remuneration' : 'Add Remuneration'}</h3>
              <button onClick={closeModal} className="text-gray-500 hover:text-gray-700 text-xl font-bold">&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
              <table className="min-w-full">
                <thead>
                  <tr>
                    <th className="px-2 py-1 text-left text-sm font-semibold text-gray-700">Remuneration Head</th>
                    <th className="px-2 py-1 text-left text-sm font-semibold text-gray-700">Amount</th>
                    <th className="px-2 py-1 text-left text-sm font-semibold text-gray-700">Date of Disbursement</th>
                    {modal.mode === 'add' && <th className="px-2 py-1" />}
                  </tr>
                </thead>
                <tbody>
                  {formRows.map((r, idx) => (
                    // eslint-disable-next-line react/no-array-index-key
                    <tr key={idx}>
                      <td className="px-2 py-1">
                        <select
                          className="w-full rounded-lg border border-gray-300 px-3 py-2"
                          value={r.remunerationhead_id}
                          onChange={(e) => setField(idx, 'remunerationhead_id', e.target.value)}
                          required
                        >
                          <option value="">Select head</option>
                          {heads.map((h) => <option key={h.id} value={h.id}>{h.remuneration_head}</option>)}
                        </select>
                      </td>
                      <td className="px-2 py-1">
                        <input type="number" min="0" step="0.01" className="w-full rounded-lg border border-gray-300 px-3 py-2"
                          value={r.amount} onChange={(e) => setField(idx, 'amount', e.target.value)} required />
                      </td>
                      <td className="px-2 py-1">
                        <input type="date" className="w-full rounded-lg border border-gray-300 px-3 py-2"
                          value={r.date_of_disbursement} onChange={(e) => setField(idx, 'date_of_disbursement', e.target.value)} required />
                      </td>
                      {modal.mode === 'add' && (
                        <td className="px-2 py-1">
                          {formRows.length > 1 && (
                            <button type="button" onClick={() => setFormRows((prev) => prev.filter((_, i) => i !== idx))}
                              className="px-3 py-2 bg-red-500 text-white rounded-md text-sm">Remove</button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
              {modal.mode === 'add' && (
                <button type="button" onClick={() => setFormRows((prev) => [...prev, emptyRow()])}
                  className="px-4 py-2 bg-green-500 text-white rounded-md text-sm">+ Add more</button>
              )}
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={closeModal} disabled={saving} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm font-medium">Cancel</button>
                <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-semibold disabled:opacity-60">
                  {saving ? 'Saving...' : modal.mode === 'edit' ? 'Update' : 'Add'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
