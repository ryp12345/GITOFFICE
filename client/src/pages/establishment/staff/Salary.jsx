import React, { useEffect, useState } from 'react';
import { getStaffSalaries } from '../../../api/staffPayrollApi';
import { getErrorMessage } from '../../../utils/errors';
import { MONTH_NAMES, formatINR, lastTenYears, monthNameOf } from './tabFormat';

// Laravel ESTB staff view → "Salary" (urlcontroller::salary). Filters are marked data-readonly-allow
// so they keep working in the read-only staff views.
export default function Salary({ staff }) {
  const now = new Date();
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [year, setYear] = useState(String(now.getFullYear()));
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!staff?.id) return undefined;
    let cancelled = false;
    setLoading(true);
    setError('');
    getStaffSalaries(staff.id, { month, year })
      .then((res) => { if (!cancelled) setRows(Array.isArray(res?.data?.rows) ? res.data.rows : []); })
      .catch((err) => {
        if (cancelled) return;
        setRows([]);
        setError(getErrorMessage(err, 'Failed to load salary details'));
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [staff?.id, month, year]);

  return (
    <div className="w-full space-y-6">
      <h2 className="text-xl font-bold text-blue-700">Salary Details</h2>

      <div className="flex flex-wrap gap-4">
        <label className="text-sm font-medium text-gray-700">
          Select Month
          <select data-readonly-allow className="mt-1 block w-40 rounded-md border border-gray-300 px-3 py-2"
            value={month} onChange={(e) => setMonth(e.target.value)}>
            <option value="all">All</option>
            {MONTH_NAMES.map((name, i) => <option key={name} value={String(i + 1)}>{name}</option>)}
          </select>
        </label>
        <label className="text-sm font-medium text-gray-700">
          Select Year
          <select data-readonly-allow className="mt-1 block w-40 rounded-md border border-gray-300 px-3 py-2"
            value={year} onChange={(e) => setYear(e.target.value)}>
            {lastTenYears().map((y) => <option key={y} value={String(y)}>{y}</option>)}
          </select>
        </label>
      </div>

      {error && <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="overflow-auto rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full">
          <thead className="bg-gray-100">
            <tr>
              {['Month', 'Basic', 'DA', 'Gross', 'Net', 'Income Tax', 'Total Deductions'].map((h) => (
                <th key={h} className="px-3 py-2 border-b text-left text-sm font-semibold text-gray-700">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="px-3 py-6 text-center text-sm text-gray-400">Loading...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={7} className="px-3 py-6 text-center text-sm text-gray-400">No salary records found.</td></tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="even:bg-gray-50">
                  <td className="px-3 py-2 border-b text-sm">{monthNameOf(row.salary_month)}</td>
                  <td className="px-3 py-2 border-b text-sm">{formatINR(row.basic)}</td>
                  <td className="px-3 py-2 border-b text-sm">{formatINR(row.da)}</td>
                  <td className="px-3 py-2 border-b text-sm">{formatINR(row.gross_salary)}</td>
                  <td className="px-3 py-2 border-b text-sm">{formatINR(row.net_salary)}</td>
                  <td className="px-3 py-2 border-b text-sm">{formatINR(row.income_tax)}</td>
                  <td className="px-3 py-2 border-b text-sm">{formatINR(row.total_deductions)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
