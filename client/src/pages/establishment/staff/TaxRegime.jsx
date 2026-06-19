import React, { useEffect, useMemo, useState } from 'react';
import {
  createStaffTaxRegime,
  deleteStaffTaxRegime,
  getStaffTaxRegimes,
  getTaxRegimeOptions,
  updateStaffTaxRegime,
} from '../../../api/staffTaxRegimeApi';

function getDefaultFinancialYear() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const startYear = month >= 4 ? year : year - 1;
  const endYear = startYear + 1;
  return `${startYear}-${String(endYear).slice(-2)}`;
}

function normalizeFinancialYear(value) {
  if (!value) return '';
  const raw = String(value).trim();
  const rangeMatch = raw.match(/^(\d{4})\s*[-/]\s*(\d{2}|\d{4})$/);
  if (rangeMatch) {
    const start = Number(rangeMatch[1]);
    const endRaw = rangeMatch[2];
    const end = endRaw.length === 2 ? Number(`${String(start).slice(0, 2)}${endRaw}`) : Number(endRaw);
    if (end === start + 1) {
      return `${start}-${String(end).slice(-2)}`;
    }
  }

  const startOnly = raw.match(/^(\d{4})$/);
  if (startOnly) {
    const start = Number(startOnly[1]);
    return `${start}-${String(start + 1).slice(-2)}`;
  }

  return '';
}

const defaultForm = {
  tax_heads_id: '',
  financial_year: getDefaultFinancialYear(),
};

export default function TaxRegime({ staff, setNotification, onTaxRegimeUpdated }) {
  const [rows, setRows] = useState([]);
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingRow, setEditingRow] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState(defaultForm);

  const optionsMap = useMemo(() => {
    const map = new Map();
    options.forEach((option) => map.set(Number(option.id), option));
    return map;
  }, [options]);

  const fetchRows = async () => {
    if (!staff?.id) return;
    setLoading(true);
    try {
      const res = await getStaffTaxRegimes(staff.id);
      setRows(Array.isArray(res?.data) ? res.data : []);
    } catch (_e) {
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchOptions = async () => {
    setLoadingOptions(true);
    try {
      const res = await getTaxRegimeOptions();
      const data = Array.isArray(res?.data) ? res.data : [];
      setOptions(data);
    } catch (_e) {
      setOptions([]);
    } finally {
      setLoadingOptions(false);
    }
  };

  useEffect(() => {
    fetchRows();
    fetchOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staff?.id]);

  const openCreateModal = () => {
    setEditingRow(null);
    setError('');
    setForm({
      tax_heads_id: options[0]?.id ? String(options[0].id) : '',
      financial_year: getDefaultFinancialYear(),
    });
    setShowModal(true);
  };

  const openEditModal = (row) => {
    setEditingRow(row);
    setError('');
    setForm({
      tax_heads_id: row?.tax_heads_id ? String(row.tax_heads_id) : '',
      financial_year: row?.financial_year || getDefaultFinancialYear(),
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

    const taxHeadsId = Number(form.tax_heads_id);
    const normalizedFy = normalizeFinancialYear(form.financial_year);

    if (!taxHeadsId || !normalizedFy) {
      setError('Tax Regime and a valid Financial Year (e.g. 2025-26) are required');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        tax_heads_id: taxHeadsId,
        financial_year: normalizedFy,
      };

      if (editingRow?.id) {
        await updateStaffTaxRegime(staff.id, editingRow.id, payload);
        if (typeof setNotification === 'function') {
          setNotification({ show: true, message: 'Tax regime updated successfully', type: 'success' });
        }
      } else {
        await createStaffTaxRegime(staff.id, payload);
        if (typeof setNotification === 'function') {
          setNotification({ show: true, message: 'Tax regime added successfully', type: 'success' });
        }
      }

      await fetchRows();
      if (typeof onTaxRegimeUpdated === 'function') await onTaxRegimeUpdated();
      closeModal();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to save tax regime');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row) => {
    setError('Delete is not allowed for Tax Regime records.');
    return;
  };

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl font-bold text-blue-700">Tax Regime Details</h2>
        <button
          onClick={openCreateModal}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-semibold flex items-center gap-2"
          disabled={loadingOptions}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Tax Regime
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
              <th className="px-3 py-2 border-b text-left text-sm font-semibold text-gray-700">Tax Regime</th>
              <th className="px-3 py-2 border-b text-left text-sm font-semibold text-gray-700">Financial Year</th>
              <th className="px-3 py-2 border-b text-left text-sm font-semibold text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className="px-3 py-6 text-center text-sm text-gray-400">Loading...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={4} className="px-3 py-6 text-center text-sm text-gray-400">No tax regime records found.</td></tr>
            ) : (
              rows.map((row, idx) => {
                const linkedOption = optionsMap.get(Number(row.tax_heads_id));
                const regimeName = row.tax_regime_name || linkedOption?.name || '-';
                const financialYear = row.financial_year || '-';
                return (
                  <tr key={row.id || idx} className="even:bg-gray-50">
                    <td className="px-3 py-2 border-b text-sm">{idx + 1}</td>
                    <td className="px-3 py-2 border-b text-sm">{regimeName}</td>
                    <td className="px-3 py-2 border-b text-sm">{financialYear}</td>
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
                          className="p-2 text-white bg-gray-400 rounded-lg cursor-not-allowed"
                          title="Delete not allowed"
                          disabled
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-xl rounded-xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h3 className="text-lg font-bold text-gray-800">
                {editingRow ? 'Edit Tax Regime' : 'Add Tax Regime'}
              </h3>
              <button onClick={closeModal} className="text-gray-500 hover:text-gray-700 text-xl font-bold">&times;</button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Tax Regime <span className="text-red-500">*</span>
                </label>
                <select
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                  value={form.tax_heads_id}
                  onChange={(e) => setForm((prev) => ({ ...prev, tax_heads_id: e.target.value }))}
                  required
                >
                  <option value="">Choose Tax Regime</option>
                  {options.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.name}{option.year ? ` (${option.year})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Financial Year <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                  value={form.financial_year}
                  onChange={(e) => setForm((prev) => ({ ...prev, financial_year: e.target.value }))}
                  placeholder="e.g. 2025-26"
                  required
                />
                <p className="mt-1 text-xs text-gray-500">Accepted formats: 2025-26, 2025/26, or 2025</p>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 rounded border border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || loadingOptions}
                  className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {saving ? 'Saving...' : editingRow ? 'Update' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
