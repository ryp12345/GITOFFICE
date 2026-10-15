import React, { useEffect, useState } from 'react';
import { exportStaffTds, getStaffTds } from '../../../api/staffPayrollApi';
import { getErrorMessage } from '../../../utils/errors';
import { MONTH_NAMES, formatINR, lastTenYears, monthNameOf } from './tabFormat';

// Financial-year order, as in the Laravel TDS view: April … March.
const FY_MONTHS = [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3];

// Laravel ESTB staff view → "TDS" (urlcontroller::tds and ::export).
export default function Tds({ staff }) {
  const [filters, setFilters] = useState({ from_month: '4', to_month: '3', year: String(new Date().getFullYear()) });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!staff?.id) return undefined;
    let cancelled = false;
    setLoading(true);
    setError('');
    getStaffTds(staff.id, filters)
      .then((res) => { if (!cancelled) setData(res?.data || null); })
      .catch((err) => {
        if (cancelled) return;
        setData(null);
        setError(getErrorMessage(err, 'Failed to load TDS details'));
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [staff?.id, filters]);

  const handleExport = async () => {
    setExporting(true);
    setError('');
    try {
      const blob = await exportStaffTds(staff.id, filters);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `TDS_Report_${staff.id}_${filters.year}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to export file.'));
    } finally {
      setExporting(false);
    }
  };

  const setFilter = (key) => (e) => setFilters((prev) => ({ ...prev, [key]: e.target.value }));
  const rows = data?.rows || [];
  const totals = data?.totals;

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl font-bold text-blue-700">TDS Details</h2>
        {data && (
          <div className="text-sm text-gray-600">
            Financial Year: <b>{data.financial_year}</b> &nbsp;|&nbsp; Assessment Year: <b>{data.assessment_year}</b>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <label className="text-sm font-medium text-gray-700">
          From Month
          <select data-readonly-allow className="mt-1 block w-40 rounded-md border border-gray-300 px-3 py-2"
            value={filters.from_month} onChange={setFilter('from_month')}>
            {FY_MONTHS.map((m) => <option key={m} value={String(m)}>{MONTH_NAMES[m - 1]}</option>)}
          </select>
        </label>
        <label className="text-sm font-medium text-gray-700">
          To Month
          <select data-readonly-allow className="mt-1 block w-40 rounded-md border border-gray-300 px-3 py-2"
            value={filters.to_month} onChange={setFilter('to_month')}>
            {FY_MONTHS.map((m) => <option key={m} value={String(m)}>{MONTH_NAMES[m - 1]}</option>)}
          </select>
        </label>
        <label className="text-sm font-medium text-gray-700">
          Financial Year Starting
          <select data-readonly-allow className="mt-1 block w-40 rounded-md border border-gray-300 px-3 py-2"
            value={filters.year} onChange={setFilter('year')}>
            {lastTenYears().map((y) => <option key={y} value={String(y)}>{y}</option>)}
          </select>
        </label>
        <button
          data-readonly-allow
          onClick={handleExport}
          disabled={exporting || !rows.length}
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm font-semibold disabled:opacity-50"
        >
          {exporting ? 'Exporting...' : 'Export to Excel'}
        </button>
      </div>

      {error && <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="overflow-auto rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full">
          <thead className="bg-gray-100">
            <tr>
              {['Month', 'Basic (₹)', 'Gross (₹)', 'Additional Income (₹)', 'Income Tax (₹)'].map((h) => (
                <th key={h} className="px-3 py-2 border-b text-left text-sm font-semibold text-gray-700">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="px-3 py-6 text-center text-sm text-gray-400">Loading...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={5} className="px-3 py-6 text-center text-sm text-gray-400">No salary records found.</td></tr>
            ) : (
              <>
                {rows.map((row) => (
                  <tr key={row.id} className="even:bg-gray-50">
                    <td className="px-3 py-2 border-b text-sm">{monthNameOf(row.salary_month)}</td>
                    <td className="px-3 py-2 border-b text-sm">₹ {formatINR(row.basic)}</td>
                    <td className="px-3 py-2 border-b text-sm">₹ {formatINR(row.gross_salary)}</td>
                    <td className="px-3 py-2 border-b text-sm">₹ {formatINR(row.additional_income)}</td>
                    <td className="px-3 py-2 border-b text-sm">₹ {formatINR(row.income_tax)}</td>
                  </tr>
                ))}
                {totals && (
                  <tr className="bg-blue-50 font-semibold">
                    <td className="px-3 py-2 text-sm">Total</td>
                    <td className="px-3 py-2 text-sm">₹ {formatINR(totals.basic)}</td>
                    <td className="px-3 py-2 text-sm">₹ {formatINR(totals.gross)}</td>
                    <td className="px-3 py-2 text-sm">₹ {formatINR(totals.additional)}</td>
                    <td className="px-3 py-2 text-sm">₹ {formatINR(totals.income_tax)}</td>
                  </tr>
                )}
              </>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
