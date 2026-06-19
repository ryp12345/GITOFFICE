import React, { useEffect, useState } from 'react';
import {
  createStaffLaptopLoan,
  deleteStaffLaptopLoan,
  getStaffLaptopLoans,
  updateStaffLaptopLoan,
} from '../../../api/staffLaptopLoanApi';

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

function isWithinOneMonth(dateStr) {
  if (!dateStr) return false;
  const appDate = new Date(dateStr);
  const now = new Date();
  const diffMs = now - appDate;
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays <= 31;
}

const defaultForm = {
  date_of_application: '',
  configuration: '',
  amount: '',
  emi: '',
  start_date: '',
};

export default function LaptopLoan({ staff, setNotification, onLaptopLoanUpdated }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingRow, setEditingRow] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState(defaultForm);
  const [emiAuto, setEmiAuto] = useState('');

  useEffect(() => {
    if (form.amount && !isNaN(form.amount)) {
      const emi = Math.ceil(parseFloat(form.amount) / 18 / 100) * 100;
      setEmiAuto(String(emi));
    } else {
      setEmiAuto('');
    }
  }, [form.amount]);

  const fetchData = async () => {
    if (!staff?.id) return;
    setLoading(true);
    try {
      const res = await getStaffLaptopLoans(staff.id);
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
    setForm({ ...defaultForm, date_of_application: toInputDate(new Date()), start_date: toInputDate(new Date()) });
    setShowModal(true);
  };

  const openEditModal = (row) => {
    setEditingRow(row);
    setError('');
    setForm({
      date_of_application: toInputDate(row.date_of_application),
      configuration: row.configuration || '',
      amount: row.amount !== null && row.amount !== undefined ? String(row.amount) : '',
      emi: row.emi !== null && row.emi !== undefined ? String(row.emi) : '',
      start_date: toInputDate(row.start_date),
    });
    setEmiAuto('');
    setShowModal(true);
  };

  const closeModal = () => {
    if (saving) return;
    setShowModal(false);
    setEditingRow(null);
    setError('');
    setEmiAuto('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!staff?.id) { setError('Staff id not found'); return; }
    if (!form.date_of_application || !form.configuration || !form.amount || !form.start_date) {
      setError('All fields are required');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        date_of_application: form.date_of_application,
        configuration: form.configuration,
        amount: parseInt(form.amount, 10),
        emi: editingRow && !isWithinOneMonth(editingRow.date_of_application) ? editingRow.emi : (emiAuto ? parseInt(emiAuto, 10) : parseInt(form.emi, 10)),
        start_date: form.start_date,
      };

      if (editingRow?.id) {
        await updateStaffLaptopLoan(staff.id, editingRow.id, payload);
        if (typeof setNotification === 'function') {
          setNotification({ show: true, message: 'Laptop loan updated successfully', type: 'success' });
        }
      } else {
        await createStaffLaptopLoan(staff.id, payload);
        if (typeof setNotification === 'function') {
          setNotification({ show: true, message: 'Laptop loan added successfully', type: 'success' });
        }
      }

      await fetchData();
      if (typeof onLaptopLoanUpdated === 'function') await onLaptopLoanUpdated();
      closeModal();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to save laptop loan');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row) => {
    if (!row?.id || !staff?.id) return;
    if (!window.confirm('Delete this laptop loan record?')) return;
    try {
      await deleteStaffLaptopLoan(staff.id, row.id);
      if (typeof setNotification === 'function') {
        setNotification({ show: true, message: 'Laptop loan deleted successfully', type: 'success' });
      }
      await fetchData();
      if (typeof onLaptopLoanUpdated === 'function') await onLaptopLoanUpdated();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to delete laptop loan');
    }
  };

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl font-bold text-blue-700">Laptop Loan Details</h2>
        <button
          onClick={openCreateModal}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-semibold flex items-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Loan Details
        </button>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="overflow-auto rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-3 py-2 border-b text-left text-sm font-semibold text-gray-700">S.no</th>
              <th className="px-3 py-2 border-b text-left text-sm font-semibold text-gray-700">Date of Application</th>
              <th className="px-3 py-2 border-b text-left text-sm font-semibold text-gray-700">Configuration</th>
              <th className="px-3 py-2 border-b text-left text-sm font-semibold text-gray-700">Amount (₹)</th>
              <th className="px-3 py-2 border-b text-left text-sm font-semibold text-gray-700">EMI</th>
              <th className="px-3 py-2 border-b text-left text-sm font-semibold text-gray-700">Start Date</th>
              <th className="px-3 py-2 border-b text-left text-sm font-semibold text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="px-3 py-6 text-center text-sm text-gray-400">Loading...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={7} className="px-3 py-6 text-center text-sm text-gray-400">No laptop loan records found.</td></tr>
            ) : (
              rows.map((row, idx) => (
                <tr key={row.id || idx} className="even:bg-gray-50">
                  <td className="px-3 py-2 border-b text-sm">{idx + 1}</td>
                  <td className="px-3 py-2 border-b text-sm">{formatDateDMY(row.date_of_application)}</td>
                  <td className="px-3 py-2 border-b text-sm">{row.configuration || '-'}</td>
                  <td className="px-3 py-2 border-b text-sm">{row.amount ?? '-'}</td>
                  <td className="px-3 py-2 border-b text-sm">{row.emi ?? '-'}</td>
                  <td className="px-3 py-2 border-b text-sm">{formatDateDMY(row.start_date)}</td>
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
                {editingRow ? 'Edit Loan Details' : 'Add New Loan Details'}
              </h3>
              <button onClick={closeModal} className="text-gray-500 hover:text-gray-700 text-xl font-bold">&times;</button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
              )}

              {editingRow && !isWithinOneMonth(editingRow.date_of_application) && (
                <div className="rounded-md border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
                  Amount and EMI cannot be changed — only editable within one month of application date.
                </div>
              )}

              {editingRow && !isWithinOneMonth(editingRow.date_of_application) && (
                <div className="rounded-md border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800 col-span-1 md:col-span-2">
                  Update not allowed. You can only update the Amount and EMI within one month of the application date.
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Date of Application <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2"
                    value={form.date_of_application}
                    onChange={(e) => setForm((prev) => ({ ...prev, date_of_application: e.target.value }))}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Configuration <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2"
                    value={form.configuration}
                    onChange={(e) => setForm((prev) => ({ ...prev, configuration: e.target.value }))}
                    placeholder="Configuration"
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
                    className="w-full rounded-lg border border-gray-300 px-3 py-2"
                    value={form.amount}
                    onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
                    placeholder="₹ Amount"
                    disabled={editingRow && !isWithinOneMonth(editingRow.date_of_application)}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    EMI <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2"
                    value={editingRow && !isWithinOneMonth(editingRow.date_of_application) ? form.emi : (emiAuto || form.emi)}
                    onChange={(e) => setForm((prev) => ({ ...prev, emi: e.target.value }))}
                    placeholder="EMI"
                    readOnly={!!editingRow && !isWithinOneMonth(editingRow.date_of_application)}
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
                {(editingRow && !isWithinOneMonth(editingRow.date_of_application)) ? null : (
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-semibold disabled:opacity-60"
                  >
                    {saving ? 'Saving...' : editingRow ? 'Update' : 'Add'}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
