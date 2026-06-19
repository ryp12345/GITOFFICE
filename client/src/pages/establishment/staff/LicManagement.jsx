import React, { useEffect, useState } from 'react';
import {
  createLicTransaction,
  createStaffLic,
  deleteLicTransaction,
  deleteStaffLic,
  getLicTransactions,
  getStaffLics,
  updateStaffLic,
} from '../../../api/staffLicApi';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const LIC_STATUSES = ['active', 'transfered', 'stopped'];

const defaultLicForm = { policy_no: '', premium: '', start_date: '' };
const defaultEditLicForm = { policy_no: '', premium: '', end_date: '', status: 'active' };
const defaultTransForm = { month: 'January', year: new Date().getFullYear(), dop: '', gst: '' };

function formatDate(val) {
  if (!val) return '-';
  return String(val).slice(0, 10);
}

function StatusBadge({ status }) {
  const s = String(status || '').toLowerCase();
  let cls = 'bg-gray-100 text-gray-600';
  if (s === 'active') cls = 'bg-green-100 text-green-700';
  else if (s === 'stopped') cls = 'bg-red-100 text-red-600';
  else if (s === 'transfered') cls = 'bg-yellow-100 text-yellow-700';
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${cls}`}>
      {status || '-'}
    </span>
  );
}

export default function LicManagement({ staff, setNotification, onLicUpdated }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Policy modal
  const [showModal, setShowModal] = useState(false);
  const [editingRow, setEditingRow] = useState(null);
  const [licForm, setLicForm] = useState(defaultLicForm);
  const [editLicForm, setEditLicForm] = useState(defaultEditLicForm);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState('');

  // Transactions panel
  const [expandedLicId, setExpandedLicId] = useState(null);
  const [transactions, setTransactions] = useState({});
  const [transLoading, setTransLoading] = useState({});
  const [showTransModal, setShowTransModal] = useState(false);
  const [transModalLicId, setTransModalLicId] = useState(null);
  const [transForm, setTransForm] = useState(defaultTransForm);
  const [savingTrans, setSavingTrans] = useState(false);
  const [transModalError, setTransModalError] = useState('');

  const fetchRows = async () => {
    if (!staff?.id) return;
    setLoading(true);
    try {
      const res = await getStaffLics(staff.id);
      setRows(Array.isArray(res?.data) ? res.data : []);
    } catch (_e) {
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staff?.id]);

  // ─── Policy CRUD ──────────────────────────────────────────────────────────

  const openCreateModal = () => {
    setEditingRow(null);
    setLicForm(defaultLicForm);
    setModalError('');
    setShowModal(true);
  };

  const openEditModal = (row) => {
    setEditingRow(row);
    setEditLicForm({
      policy_no: row.policy_no || '',
      premium: row.premium || '',
      end_date: formatDate(row.end_date) === '-' ? '' : formatDate(row.end_date),
      status: row.status || 'active',
    });
    setModalError('');
    setShowModal(true);
  };

  const closeModal = () => {
    if (saving) return;
    setShowModal(false);
    setEditingRow(null);
    setModalError('');
  };

  const handleLicSubmit = async (e) => {
    e.preventDefault();
    setModalError('');

    if (!staff?.id) { setModalError('Staff id not found'); return; }

    if (editingRow) {
      const start = editLicForm.start_date || licForm.start_date;
      const end = editLicForm.end_date;
      if (start && end && start > end) {
        setModalError('End date cannot be earlier than start date');
        return;
      }
    }

    setSaving(true);
    try {
      if (editingRow?.id) {
        const payload = {
          policy_no: editLicForm.policy_no,
          premium: editLicForm.premium,
          end_date: editLicForm.end_date || null,
          status: editLicForm.status,
        };
        await updateStaffLic(staff.id, editingRow.id, payload);
        if (typeof setNotification === 'function')
          setNotification({ show: true, message: 'LIC policy updated successfully', type: 'success' });
      } else {
        const payload = {
          policy_no: licForm.policy_no,
          premium: licForm.premium,
          start_date: licForm.start_date,
        };
        await createStaffLic(staff.id, payload);
        if (typeof setNotification === 'function')
          setNotification({ show: true, message: 'LIC policy added successfully', type: 'success' });
      }
      await fetchRows();
      if (typeof onLicUpdated === 'function') await onLicUpdated();
      closeModal();
    } catch (err) {
      setModalError(err?.response?.data?.message || 'Failed to save LIC policy');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteLic = async (row) => {
    if (!row?.id || !staff?.id) return;
    if (!window.confirm(`Delete LIC policy ${row.policy_no}? This will also delete all its transactions.`)) return;
    try {
      await deleteStaffLic(staff.id, row.id);
      if (typeof setNotification === 'function')
        setNotification({ show: true, message: 'LIC policy deleted', type: 'success' });
      if (expandedLicId === row.id) setExpandedLicId(null);
      await fetchRows();
      if (typeof onLicUpdated === 'function') await onLicUpdated();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to delete LIC policy');
    }
  };

  // ─── Transactions ─────────────────────────────────────────────────────────

  const toggleTransactions = async (licId) => {
    if (expandedLicId === licId) {
      setExpandedLicId(null);
      return;
    }
    setExpandedLicId(licId);
    if (transactions[licId]) return; // already loaded
    setTransLoading((prev) => ({ ...prev, [licId]: true }));
    try {
      const res = await getLicTransactions(staff.id, licId);
      setTransactions((prev) => ({ ...prev, [licId]: Array.isArray(res?.data) ? res.data : [] }));
    } catch (_e) {
      setTransactions((prev) => ({ ...prev, [licId]: [] }));
    } finally {
      setTransLoading((prev) => ({ ...prev, [licId]: false }));
    }
  };

  const refreshTransactions = async (licId) => {
    setTransLoading((prev) => ({ ...prev, [licId]: true }));
    try {
      const res = await getLicTransactions(staff.id, licId);
      setTransactions((prev) => ({ ...prev, [licId]: Array.isArray(res?.data) ? res.data : [] }));
    } catch (_e) {
      setTransactions((prev) => ({ ...prev, [licId]: [] }));
    } finally {
      setTransLoading((prev) => ({ ...prev, [licId]: false }));
    }
  };

  const openTransModal = (licId) => {
    setTransModalLicId(licId);
    setTransForm({ ...defaultTransForm });
    setTransModalError('');
    setShowTransModal(true);
  };

  const closeTransModal = () => {
    if (savingTrans) return;
    setShowTransModal(false);
    setTransModalLicId(null);
    setTransModalError('');
  };

  const handleTransSubmit = async (e) => {
    e.preventDefault();
    setTransModalError('');
    if (!staff?.id || !transModalLicId) { setTransModalError('Invalid reference'); return; }

    setSavingTrans(true);
    try {
      const payload = {
        month: transForm.month,
        year: transForm.year,
        dop: transForm.dop,
        gst: transForm.gst || 0,
      };
      await createLicTransaction(staff.id, transModalLicId, payload);
      if (typeof setNotification === 'function')
        setNotification({ show: true, message: 'Transaction added successfully', type: 'success' });
      await refreshTransactions(transModalLicId);
      closeTransModal();
    } catch (err) {
      setTransModalError(err?.response?.data?.message || 'Failed to add transaction');
    } finally {
      setSavingTrans(false);
    }
  };

  const handleDeleteTransaction = async (licId, transId) => {
    if (!window.confirm('Delete this transaction?')) return;
    try {
      await deleteLicTransaction(staff.id, licId, transId);
      if (typeof setNotification === 'function')
        setNotification({ show: true, message: 'Transaction deleted', type: 'success' });
      await refreshTransactions(licId);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to delete transaction');
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl font-bold text-blue-700">LIC Management</h2>
        <button
          onClick={openCreateModal}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-semibold flex items-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add LIC Policy
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
              <th className="px-3 py-2 border-b text-left text-sm font-semibold text-gray-700">Policy No</th>
              <th className="px-3 py-2 border-b text-left text-sm font-semibold text-gray-700">Premium</th>
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
              <tr><td colSpan={7} className="px-3 py-6 text-center text-sm text-gray-400">No LIC policies found.</td></tr>
            ) : (
              rows.map((row, idx) => (
                <React.Fragment key={row.id || idx}>
                  <tr className="even:bg-gray-50">
                    <td className="px-3 py-2 border-b text-sm">{idx + 1}</td>
                    <td className="px-3 py-2 border-b text-sm font-medium">{row.policy_no || '-'}</td>
                    <td className="px-3 py-2 border-b text-sm">{row.premium != null ? `₹${row.premium}` : '-'}</td>
                    <td className="px-3 py-2 border-b text-sm">{formatDate(row.start_date)}</td>
                    <td className="px-3 py-2 border-b text-sm">{formatDate(row.end_date)}</td>
                    <td className="px-3 py-2 border-b text-sm"><StatusBadge status={row.status} /></td>
                    <td className="px-3 py-2 border-b text-sm">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleTransactions(row.id)}
                          className={`px-2 py-1 rounded text-xs font-semibold border transition-colors ${expandedLicId === row.id ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-indigo-600 border-indigo-300 hover:bg-indigo-50'}`}
                          title="View Transactions"
                        >
                          Transactions
                        </button>
                        <button
                          onClick={() => openEditModal(row)}
                          className="p-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                          title="Edit"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeleteLic(row)}
                          className="p-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                          title="Delete"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* Transactions sub-panel */}
                  {expandedLicId === row.id && (
                    <tr>
                      <td colSpan={7} className="px-4 py-3 bg-indigo-50 border-b">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-bold text-indigo-700">
                              Transactions — Policy {row.policy_no}
                            </h4>
                            <button
                              onClick={() => openTransModal(row.id)}
                              className="px-3 py-1 bg-indigo-600 text-white rounded text-xs font-semibold hover:bg-indigo-700 flex items-center gap-1"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                              Add Transaction
                            </button>
                          </div>

                          {transLoading[row.id] ? (
                            <p className="text-xs text-gray-400">Loading transactions...</p>
                          ) : (transactions[row.id] || []).length === 0 ? (
                            <p className="text-xs text-gray-400">No transactions found for this policy.</p>
                          ) : (
                            <div className="overflow-auto rounded border border-indigo-200 bg-white">
                              <table className="min-w-full text-xs">
                                <thead className="bg-indigo-100">
                                  <tr>
                                    <th className="px-3 py-2 border-b text-left font-semibold text-indigo-800">S.No</th>
                                    <th className="px-3 py-2 border-b text-left font-semibold text-indigo-800">Month</th>
                                    <th className="px-3 py-2 border-b text-left font-semibold text-indigo-800">Year</th>
                                    <th className="px-3 py-2 border-b text-left font-semibold text-indigo-800">Date of Posting</th>
                                    <th className="px-3 py-2 border-b text-left font-semibold text-indigo-800">GST</th>
                                    <th className="px-3 py-2 border-b text-left font-semibold text-indigo-800">Actions</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {(transactions[row.id] || []).map((t, ti) => (
                                    <tr key={t.id || ti} className="even:bg-indigo-50">
                                      <td className="px-3 py-1.5 border-b">{ti + 1}</td>
                                      <td className="px-3 py-1.5 border-b">{t.month || '-'}</td>
                                      <td className="px-3 py-1.5 border-b">{t.years || '-'}</td>
                                      <td className="px-3 py-1.5 border-b">{formatDate(t.dop)}</td>
                                      <td className="px-3 py-1.5 border-b">{t.gst != null ? `₹${t.gst}` : '-'}</td>
                                      <td className="px-3 py-1.5 border-b">
                                        <button
                                          onClick={() => handleDeleteTransaction(row.id, t.id)}
                                          className="p-1 text-white bg-red-500 rounded hover:bg-red-600 transition-colors"
                                          title="Delete transaction"
                                        >
                                          <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                          </svg>
                                        </button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Policy Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h3 className="text-lg font-bold text-gray-800">
                {editingRow ? 'Edit LIC Policy' : 'Add LIC Policy'}
              </h3>
              <button onClick={closeModal} className="text-gray-500 hover:text-gray-700 text-xl font-bold">&times;</button>
            </div>
            <form onSubmit={handleLicSubmit} className="p-6 space-y-4">
              {modalError && (
                <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{modalError}</div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Policy No <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  value={editingRow ? editLicForm.policy_no : licForm.policy_no}
                  onChange={(e) => editingRow
                    ? setEditLicForm((p) => ({ ...p, policy_no: e.target.value }))
                    : setLicForm((p) => ({ ...p, policy_no: e.target.value }))}
                  required
                  min={1}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Premium <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  value={editingRow ? editLicForm.premium : licForm.premium}
                  onChange={(e) => editingRow
                    ? setEditLicForm((p) => ({ ...p, premium: e.target.value }))
                    : setLicForm((p) => ({ ...p, premium: e.target.value }))}
                  required
                  min={0}
                />
              </div>

              {!editingRow ? (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Start Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    value={licForm.start_date}
                    onChange={(e) => setLicForm((p) => ({ ...p, start_date: e.target.value }))}
                    required
                  />
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">End Date</label>
                    <input
                      type="date"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                      value={editLicForm.end_date}
                      onChange={(e) => setEditLicForm((p) => ({ ...p, end_date: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Status</label>
                    <select
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                      value={editLicForm.status}
                      onChange={(e) => setEditLicForm((p) => ({ ...p, status: e.target.value }))}
                    >
                      {LIC_STATUSES.map((s) => (
                        <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50"
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60"
                  disabled={saving}
                >
                  {saving ? 'Saving...' : editingRow ? 'Update' : 'Add Policy'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Transaction Modal */}
      {showTransModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h3 className="text-lg font-bold text-gray-800">Add Transaction</h3>
              <button onClick={closeTransModal} className="text-gray-500 hover:text-gray-700 text-xl font-bold">&times;</button>
            </div>
            <form onSubmit={handleTransSubmit} className="p-6 space-y-4">
              {transModalError && (
                <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{transModalError}</div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Month <span className="text-red-500">*</span>
                </label>
                <select
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  value={transForm.month}
                  onChange={(e) => setTransForm((p) => ({ ...p, month: e.target.value }))}
                  required
                >
                  {MONTHS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Year <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  value={transForm.years}
                  onChange={(e) => setTransForm((p) => ({ ...p, years: e.target.value }))}
                  required
                  min={2000}
                  max={2100}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Date of Posting <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  value={transForm.dop}
                  onChange={(e) => setTransForm((p) => ({ ...p, dop: e.target.value }))}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">GST</label>
                <input
                  type="number"
                  step="0.01"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  value={transForm.gst}
                  onChange={(e) => setTransForm((p) => ({ ...p, gst: e.target.value }))}
                  min={0}
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeTransModal}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50"
                  disabled={savingTrans}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60"
                  disabled={savingTrans}
                >
                  {savingTrans ? 'Saving...' : 'Add Transaction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
