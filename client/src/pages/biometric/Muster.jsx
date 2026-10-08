import { useEffect, useMemo, useState } from 'react';
import Header from '../../components/layout/Header';
import Sidebar from '../../components/layout/Sidebar';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { isRoleMatch, ROLE_HOD } from '../../utils/role';
import LoadError from '../../components/common/LoadError';
import SearchInput from '../../components/common/SearchInput';
import { getErrorMessage } from '../../utils/errors';

export default function MusterPage() {
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [year, setYear] = useState(today.getFullYear());
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [logDates, setLogDates] = useState([]);
  const [staff, setStaff] = useState([]);
  const [logAssoc, setLogAssoc] = useState({});
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const { user } = useAuth();
  const endpointPrefix = '/biometric';

  useEffect(() => {
    fetchMuster();
  }, []);

  async function fetchMuster() {
    setLoading(true);
    setLoadError('');
    try {
      const res = await api.get(`${endpointPrefix}/muster`, { params: { month, year } });
      const data = res?.data || {};
      setLogDates(Array.isArray(data.log_dates) ? data.log_dates : []);
      setStaff(Array.isArray(data.staffData) ? data.staffData : []);
      setLogAssoc(data.logDataAssociative || {});
    } catch (e) {
      setLogDates([]);
      setStaff([]);
      setLogAssoc({});
      setLoadError(getErrorMessage(e, 'Failed to load the muster for this month.'));
    } finally {
      setLoading(false);
    }
  }

  const monthOptions = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: new Date(0, i).toLocaleString('default', { month: 'long' }) }));
  const years = [];
  for (let y = 2024; y <= today.getFullYear(); y++) years.push(y);

  const filtered = useMemo(() => {
    const q = (search || '').trim().toLowerCase();
    if (!q) return staff;
    // Staff Id is the column shown in the table, so it must be searchable too
    return staff.filter(s => [s.id, s.staffname, s.EmployeeCode, s.active_departments]
      .some((field) => field != null && String(field).toLowerCase().includes(q)));
  }, [staff, search]);

  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  useEffect(() => { setPage(1); }, [search, staff]);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <Header />
      <div className="flex flex-1 min-h-0">
        <Sidebar />
        <main className="flex-1 overflow-auto p-6">
          <div className="min-h-full rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-semibold text-slate-900">Staff Muster</h2>

            <div className="mt-4 flex gap-3 items-center">
              <label className="font-medium">Month</label>
              <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="border rounded p-2">
                {monthOptions.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
              <label className="font-medium">Year</label>
              <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="border rounded p-2">
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              <button onClick={fetchMuster} className="bg-blue-600 text-white px-4 py-2 rounded">Check</button>
            </div>

            <div className="mt-6">
              <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <SearchInput value={search} onChange={setSearch} placeholder="Search by staff id, name or department" />
                {!loading && !loadError && (
                  <div className="text-sm text-gray-600">
                    {search.trim() ? `${filtered.length} of ${staff.length} staff` : `${staff.length} staff`}
                  </div>
                )}
              </div>

              <div className="overflow-auto">
              {loading ? (<div>Loading...</div>) : loadError ? (
                <LoadError message={loadError} onRetry={fetchMuster} />
              ) : (
                <table className="min-w-full border-collapse table-auto">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="p-2 border">Staff Id</th>
                      <th className="p-2 border">Staff Name</th>
                      <th className="p-2 border">Dept</th>
                      {logDates.map(d => (
                        <th key={d.LogDate} className={`p-2 border ${(() => { const date = new Date(year, month - 1, d.LogDate); const dow = date.getDay(); return (dow === 0 || dow === 6) ? 'text-red-500' : ''; })()}`}>{d.LogDate}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.length === 0 ? (
                      <tr><td colSpan={3 + logDates.length} className="p-6 text-center text-gray-500">
                        {search.trim() && staff.length > 0
                          ? <>No staff match "{search.trim()}". <button type="button" onClick={() => setSearch('')} className="text-blue-600 underline">Clear search</button></>
                          : 'No records found'}
                      </td></tr>
                    ) : paginated.map((s, idx) => (
                      <tr key={s.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50`}>
                        <td className="p-2 border">{s.id}</td>
                        <td className="p-2 border">{s.staffname}</td>
                        <td className="p-2 border">{s.active_departments}</td>
                        {logDates.map(d => {
                          const days = logAssoc[String(s.EmployeeCode)] || [];
                          const present = days.includes(Number(d.LogDate));
                          if (present) return <td key={d.LogDate} className="p-2 border text-blue-600">P</td>;
                          const onLeaveObj = Array.isArray(s.leave_staff_applications) && s.leave_staff_applications.find(l => {
                            try {
                              const st = new Date(l.start).getDate();
                              const en = new Date(l.end).getDate();
                              return st <= Number(d.LogDate) && en >= Number(d.LogDate);
                            } catch (e) { return false; }
                          });
                          if (onLeaveObj) { return <td key={d.LogDate} className="p-2 border text-yellow-700">{onLeaveObj.shortname || 'L'}</td>; }
                          return <td key={d.LogDate} className="p-2 border text-red-500">X</td>;
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              </div>

              {/* Pagination Controls */}
              {filtered.length > PAGE_SIZE && (
                <div className="flex justify-end items-center gap-2 mt-3">
                  <button className="px-3 py-1 rounded border border-gray-300 bg-white text-gray-700 disabled:opacity-50" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Prev</button>
                  <span className="text-sm text-gray-700">Page {page} of {Math.ceil(filtered.length / PAGE_SIZE)}</span>
                  <button className="px-3 py-1 rounded border border-gray-300 bg-white text-gray-700 disabled:opacity-50" onClick={() => setPage(p => Math.min(Math.ceil(filtered.length / PAGE_SIZE), p + 1))} disabled={page === Math.ceil(filtered.length / PAGE_SIZE)}>Next</button>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
