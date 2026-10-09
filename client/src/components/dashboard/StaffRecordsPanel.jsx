import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getEstablishmentDataQualityStaff } from '../../api/establishmentApi';
import { getErrorMessage } from '../../utils/errors';
import { Muted, Panel, Pager } from './DashboardUI';

// Records Establishment maintains; each row counts staff in service missing that item.
export const DATA_QUALITY_CHECKS = [
  { key: 'no_department', label: 'No department assigned' },
  { key: 'no_designation', label: 'No designation assigned' },
  { key: 'no_association', label: 'No association (Confirmed / Probationary …)' },
  { key: 'no_employee_code', label: 'No biometric employee code' },
  { key: 'duplicate_employee_code', label: 'Employee code shared with another staff' },
  { key: 'no_leave_entitlement', label: 'No leave entitlement for this year' },
  { key: 'no_superannuation_date', label: 'No superannuation date' },
  { key: 'no_increment_date', label: 'No increment date' },
  { key: 'no_qualification', label: 'No qualification recorded' },
];

const MODAL_PAGE_SIZE = 10;

// Popup listing the staff behind one count, with search, pagination and a link to each
// staff record (under staffBasePath) so it can be fixed.
function DataQualityModal({ check, staffBasePath, onClose }) {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    let active = true;
    getEstablishmentDataQualityStaff(check.key)
      .then((res) => { if (active) setRows(Array.isArray(res?.data?.data) ? res.data.data : []); })
      .catch((err) => { if (active) setError(getErrorMessage(err, 'Failed to load the staff list.')); });
    return () => { active = false; };
  }, [check.key]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!rows) return [];
    if (!q) return rows;
    return rows.filter((r) => [r.staff_name, r.employeecode, r.dept_shortname, r.design_name, r.asso_name, r.employee_type]
      .some((v) => String(v || '').toLowerCase().includes(q)));
  }, [rows, search]);

  const pages = Math.max(1, Math.ceil(filtered.length / MODAL_PAGE_SIZE));
  const current = Math.min(page, pages);
  const start = (current - 1) * MODAL_PAGE_SIZE;
  const dash = (v) => (v && String(v).trim() && String(v).trim() !== '0' ? v : <span className="text-amber-700">—</span>);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-4">
          <div>
            <h4 className="text-lg font-semibold text-slate-900">{check.label}</h4>
            <p className="text-sm text-slate-500">
              {rows ? `${rows.length} staff in service` : 'Loading…'} · click a name to open the record
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-3 py-1 text-sm text-slate-600 hover:bg-slate-50">Close</button>
        </div>

        <div className="px-6 pt-4">
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search name, code, department…"
            className="w-full rounded-lg border border-gray-300 py-2 px-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 sm:w-80"
          />
        </div>

        <div className="flex-1 overflow-auto px-6 py-4">
          {error ? <p className="text-sm text-red-600">{error}</p> : !rows ? <Muted>Loading…</Muted> : filtered.length === 0 ? (
            <Muted>{rows.length ? 'No staff match your search.' : 'Nothing to fix here.'}</Muted>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="py-2 pr-3">#</th>
                  <th className="py-2 pr-3">Name</th>
                  <th className="py-2 pr-3">Code</th>
                  <th className="py-2 pr-3">Type</th>
                  <th className="py-2 pr-3">Department</th>
                  <th className="py-2 pr-3">Designation</th>
                  <th className="py-2">Association</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.slice(start, start + MODAL_PAGE_SIZE).map((r, i) => (
                  <tr key={r.id} className="align-top">
                    <td className="py-2 pr-3 text-slate-500">{start + i + 1}</td>
                    <td className="py-2 pr-3">
                      <Link to={`${staffBasePath}/${r.id}`} className="font-medium text-blue-700 hover:underline">{r.staff_name}</Link>
                    </td>
                    <td className="py-2 pr-3 tabular-nums">{dash(r.employeecode)}</td>
                    <td className="py-2 pr-3">{dash(r.employee_type)}</td>
                    <td className="py-2 pr-3">{dash(r.dept_shortname)}</td>
                    <td className="py-2 pr-3">{dash(r.design_name)}</td>
                    <td className="py-2">{dash(r.asso_name)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {pages > 1 ? (
          <div className="border-t border-slate-200 px-6 py-3">
            <Pager start={start} pageSize={MODAL_PAGE_SIZE} total={filtered.length} current={current} pages={pages} onPage={setPage} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

// "Staff Records to Complete": one row per check; amber rows open the list of staff concerned.
export default function StaffRecordsPanel({ quality, loading, staffBasePath, manageLink }) {
  const [check, setCheck] = useState(null);
  const close = useCallback(() => setCheck(null), []);
  const issues = quality ? DATA_QUALITY_CHECKS.filter((c) => quality[c.key] > 0).length : 0;

  return (
    <Panel title="Staff Records to Complete" link={manageLink} linkLabel="manage staff">
      {check ? <DataQualityModal check={check} staffBasePath={staffBasePath} onClose={close} /> : null}
      {loading ? <Muted>Loading…</Muted> : !quality ? <Muted>Data could not be loaded.</Muted> : (
        <>
          <p className="mb-3 text-sm text-slate-600">
            {issues === 0
              ? 'All staff records are complete.'
              : `${issues} of ${DATA_QUALITY_CHECKS.length} checks need attention. Click a row to see the staff.`}
          </p>
          <ul className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {DATA_QUALITY_CHECKS.map((c) => {
              const n = quality[c.key] || 0;
              const badge = (
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${n ? 'bg-amber-200 text-amber-900' : 'bg-green-200 text-green-900'}`}>
                  {n ? n : '✓'}
                </span>
              );
              return (
                <li key={c.key}>
                  {n ? (
                    <button
                      type="button"
                      onClick={() => setCheck(c)}
                      className="flex w-full items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-left text-sm transition hover:border-amber-300 hover:bg-amber-100"
                      title="View staff"
                    >
                      <span className="text-amber-900">{c.label}</span>
                      {badge}
                    </button>
                  ) : (
                    <div className="flex items-center justify-between gap-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm">
                      <span className="text-green-900">{c.label}</span>
                      {badge}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </Panel>
  );
}
