import { useEffect, useMemo, useState } from 'react';
import Header from '../../components/layout/Header';
import Sidebar from '../../components/layout/Sidebar';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { isRoleMatch, ROLE_HOD } from '../../utils/role';

export default function MusterPage() {
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [year, setYear] = useState(today.getFullYear());
  const [loading, setLoading] = useState(false);
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
    return staff.filter(s => (
      (s.staffname || '').toString().toLowerCase().includes(q) ||
      (s.EmployeeCode || '').toString().toLowerCase().includes(q) ||
      (s.active_departments || '').toString().toLowerCase().includes(q)
    ));
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
              {/* <div className="flex items-center justify-between mb-3">
                <div className="relative w-full sm:w-72">
                  <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search staff..." className="w-full py-2 pl-10 pr-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </div>
                <div className="ml-4 text-sm text-gray-600">Showing {filtered.length} results</div>
              </div> */}

              <div className="overflow-auto">
              {loading ? (<div>Loading...</div>) : (
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
                      <tr><td colSpan={3 + logDates.length} className="p-6 text-center text-gray-500">No records found</td></tr>
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
