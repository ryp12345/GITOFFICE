import React, { useEffect, useMemo, useState } from 'react';
import { getStaffLeaves } from '../../../api/staffPayrollApi';
import { updateLeaveEntitlement } from '../../../api/leaveEntitlementApi';
import { getErrorMessage } from '../../../utils/errors';
import { MONTH_NAMES, formatDateDMY, toInputDate } from './tabFormat';

const FIRST_YEAR = 2024; // Laravel's year pickers start at 2024

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

// Laravel ESTB staff view → "Leaves" (urlcontroller::leave_entitlement, filter_yearwise_leave and
// leave_entitlement_update): entitlement summary with edit, plus the staff's leave applications.
export default function StaffLeaves({ staff, setNotification, readOnly = false }) {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(''); // '' = Laravel's default view (active entitlements)
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [editForm, setEditForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [historyFilter, setHistoryFilter] = useState({ month: 'all', year: 'all' });

  const entitlementYears = [];
  for (let y = currentYear + 1; y >= FIRST_YEAR; y -= 1) entitlementYears.push(y);

  const fetchData = async () => {
    if (!staff?.id) return;
    setLoading(true);
    setError('');
    try {
      const res = await getStaffLeaves(staff.id, year);
      setData(res?.data || null);
    } catch (err) {
      setData(null);
      setError(getErrorMessage(err, 'Failed to load leave details'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staff?.id, year]);

  const leaveTypes = data?.leave_types || [];
  const takenTypes = data?.leave_types_taken || [];
  const leaves = data?.entitlement?.leaves || {};
  const balanceOf = (sn) => {
    const l = leaves[sn];
    if (!l || l.entitled_curr_year === undefined) return '-';
    return num(l.entitled_curr_year) + num(l.accumulated) - num(l.availed) - num(l.encashed_curr_year);
  };

  const openEdit = () => {
    const entitled = {};
    const availed = {};
    leaveTypes.forEach(({ shortname }) => { entitled[shortname] = String(leaves[shortname]?.entitled_curr_year ?? 0); });
    takenTypes.forEach(({ shortname }) => { availed[shortname] = String(leaves[shortname]?.availed ?? 0); });
    setError('');
    setEditForm({
      entitled,
      availed,
      this_year_encashed_el: String(leaves.EL?.encashed_curr_year ?? 0),
      accumulated_el: String(leaves.EL?.accumulated ?? 0),
    });
  };

  const setMapValue = (map, sn, value) => setEditForm((prev) => ({ ...prev, [map]: { ...prev[map], [sn]: value } }));

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await updateLeaveEntitlement({
        year: data?.year || currentYear,
        staff_id: staff.id,
        entitled: Object.fromEntries(Object.entries(editForm.entitled).map(([k, v]) => [k, num(v)])),
        availed: Object.fromEntries(Object.entries(editForm.availed).map(([k, v]) => [k, num(v)])),
        this_year_encashed_el: num(editForm.this_year_encashed_el),
        accumulated_el: num(editForm.accumulated_el),
      });
      setNotification?.({ show: true, message: 'Leave entitlements updated successfully.', type: 'success' });
      setEditForm(null);
      await fetchData();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to update leave entitlements.'));
    } finally {
      setSaving(false);
    }
  };

  const applications = useMemo(() => {
    const all = data?.applications || [];
    return all.filter((a) => {
      const start = toInputDate(a.start);
      if (historyFilter.year !== 'all' && String(a.year) !== historyFilter.year) return false;
      if (historyFilter.month !== 'all' && Number(start.split('-')[1]) !== Number(historyFilter.month)) return false;
      return true;
    });
  }, [data, historyFilter]);

  const historyYears = useMemo(
    () => Array.from(new Set((data?.applications || []).map((a) => String(a.year)))).sort().reverse(),
    [data]
  );

  const th = 'px-3 py-2 border-b border-r text-sm font-semibold text-gray-700 text-center';
  const td = 'px-3 py-2 border-b border-r text-sm text-center';

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h2 className="text-xl font-bold text-blue-700">Leave Entitlement</h2>
        <label className="text-sm font-medium text-gray-700">
          Year
          <select data-readonly-allow className="mt-1 block w-40 rounded-md border border-gray-300 px-3 py-2"
            value={year} onChange={(e) => setYear(e.target.value)}>
            <option value="">{currentYear} (current)</option>
            {entitlementYears.filter((y) => y !== currentYear).map((y) => <option key={y} value={String(y)}>{y}</option>)}
          </select>
        </label>
      </div>

      {error && !editForm && <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="overflow-auto rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full">
          <thead className="bg-gray-100">
            <tr>
              <th rowSpan={2} className={th}>Year</th>
              <th colSpan={leaveTypes.length || 1} className={th}>Entitled</th>
              <th colSpan={takenTypes.length || 1} className={th}>Taken</th>
              <th colSpan={leaveTypes.length || 1} className={th}>Balance</th>
              <th rowSpan={2} className={th}>EL Encashed</th>
              {!readOnly && <th rowSpan={2} className={th}>Actions</th>}
            </tr>
            <tr>
              {leaveTypes.map((t) => <th key={`e-${t.shortname}`} className={th}>{t.shortname}</th>)}
              {takenTypes.map((t) => <th key={`t-${t.shortname}`} className={th}>{t.shortname}</th>)}
              {leaveTypes.map((t) => <th key={`b-${t.shortname}`} className={th}>{t.shortname}</th>)}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={99} className="px-3 py-6 text-center text-sm text-gray-400">Loading...</td></tr>
            ) : !data ? (
              <tr><td colSpan={99} className="px-3 py-6 text-center text-sm text-gray-400">No leave data.</td></tr>
            ) : (
              <tr>
                <td className={td}>{data.year}</td>
                {leaveTypes.map((t) => <td key={`e-${t.shortname}`} className={td}>{leaves[t.shortname]?.entitled_curr_year ?? '-'}</td>)}
                {takenTypes.map((t) => <td key={`t-${t.shortname}`} className={td}>{leaves[t.shortname]?.availed ?? '-'}</td>)}
                {leaveTypes.map((t) => <td key={`b-${t.shortname}`} className={td}>{balanceOf(t.shortname)}</td>)}
                <td className={td}>{leaves.EL?.encashed_curr_year ?? '-'}</td>
                {!readOnly && (
                  <td className={td}>
                    <button onClick={openEdit} className="px-3 py-1 text-white bg-blue-600 rounded-lg hover:bg-blue-700 text-xs">Edit</button>
                  </td>
                )}
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-4 pt-4">
        <h2 className="text-xl font-bold text-blue-700">Leave History</h2>
        <div className="flex gap-4">
          <label className="text-sm font-medium text-gray-700">
            Month
            <select data-readonly-allow className="mt-1 block w-36 rounded-md border border-gray-300 px-3 py-2"
              value={historyFilter.month} onChange={(e) => setHistoryFilter((p) => ({ ...p, month: e.target.value }))}>
              <option value="all">All</option>
              {MONTH_NAMES.map((name, i) => <option key={name} value={String(i + 1)}>{name}</option>)}
            </select>
          </label>
          <label className="text-sm font-medium text-gray-700">
            Year
            <select data-readonly-allow className="mt-1 block w-28 rounded-md border border-gray-300 px-3 py-2"
              value={historyFilter.year} onChange={(e) => setHistoryFilter((p) => ({ ...p, year: e.target.value }))}>
              <option value="all">All</option>
              {historyYears.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </label>
        </div>
      </div>

      <div className="overflow-auto rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full">
          <thead className="bg-gray-100">
            <tr>
              {['S.No', 'Leave', 'Alternate Staff', 'Reason', 'Approver', 'From date', 'To date', 'No Of Days', 'Application Status', 'Leave Status', 'Year'].map((h) => (
                <th key={h} className="px-3 py-2 border-b text-left text-sm font-semibold text-gray-700">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {applications.length === 0 ? (
              <tr><td colSpan={11} className="px-3 py-6 text-center text-sm text-gray-400">No leave applications found.</td></tr>
            ) : (
              applications.map((a, idx) => (
                <tr key={a.id} className="even:bg-gray-50">
                  <td className="px-3 py-2 border-b text-sm">{idx + 1}</td>
                  <td className="px-3 py-2 border-b text-sm">{a.shortname}</td>
                  <td className="px-3 py-2 border-b text-sm">{a.alternate_name || '-'}</td>
                  <td className="px-3 py-2 border-b text-sm max-w-xs whitespace-normal">{a.reason}</td>
                  <td className="px-3 py-2 border-b text-sm">{a.approver_role || '-'}</td>
                  <td className="px-3 py-2 border-b text-sm">{formatDateDMY(a.start)}</td>
                  <td className="px-3 py-2 border-b text-sm">{formatDateDMY(a.end)}</td>
                  <td className="px-3 py-2 border-b text-sm">{a.no_of_days}</td>
                  <td className="px-3 py-2 border-b text-sm capitalize">{a.appl_status}</td>
                  <td className="px-3 py-2 border-b text-sm capitalize">{a.leave_status}</td>
                  <td className="px-3 py-2 border-b text-sm">{a.year}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {editForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h3 className="text-lg font-bold text-gray-800">Edit Leave Entitlement — {data?.year}</h3>
              <button onClick={() => !saving && setEditForm(null)} className="text-gray-500 hover:text-gray-700 text-xl font-bold">&times;</button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-5">
              {error && <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
              <section>
                <h4 className="font-semibold text-gray-700 mb-2">Entitled</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {leaveTypes.map(({ shortname }) => (
                    <label key={shortname} className="text-sm text-gray-700">{shortname}
                      <input type="number" min="0" step="0.5" className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                        value={editForm.entitled[shortname]} onChange={(e) => setMapValue('entitled', shortname, e.target.value)} />
                    </label>
                  ))}
                </div>
              </section>
              <section>
                <h4 className="font-semibold text-gray-700 mb-2">Taken</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {takenTypes.map(({ shortname }) => (
                    <label key={shortname} className="text-sm text-gray-700">{shortname}
                      <input type="number" min="0" step="0.5" className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                        value={editForm.availed[shortname]} onChange={(e) => setMapValue('availed', shortname, e.target.value)} />
                    </label>
                  ))}
                </div>
              </section>
              <section>
                <h4 className="font-semibold text-gray-700 mb-2">Balance (calculated)</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {leaveTypes.map(({ shortname }) => (
                    <div key={shortname} className="text-sm text-gray-700">{shortname}
                      <div className="mt-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                        {num(editForm.entitled[shortname]) - num(editForm.availed[shortname])}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
              <section className="grid grid-cols-2 gap-3">
                <label className="text-sm text-gray-700">This year encashed EL
                  <input type="number" min="0" className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                    value={editForm.this_year_encashed_el} onChange={(e) => setEditForm((p) => ({ ...p, this_year_encashed_el: e.target.value }))} />
                </label>
                <label className="text-sm text-gray-700">Accumulated EL
                  <input type="number" min="0" className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                    value={editForm.accumulated_el} onChange={(e) => setEditForm((p) => ({ ...p, accumulated_el: e.target.value }))} />
                </label>
              </section>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setEditForm(null)} disabled={saving} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm font-medium">Cancel</button>
                <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-semibold disabled:opacity-60">
                  {saving ? 'Saving...' : 'Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
