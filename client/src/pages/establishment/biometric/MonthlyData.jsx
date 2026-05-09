import { useEffect, useMemo, useState } from 'react';
import Header from '../../../components/layout/Header';
import Sidebar from '../../../components/layout/Sidebar';
import api from '../../../api/axios';

export default function MonthlyDataPage() {
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const PAGE_SIZE = 10;

  useEffect(() => {
    async function fetchMonthly() {
      try {
        setLoading(true);
        const res = await api.get('/biometric/monthly');
        const rows = Array.isArray(res?.data?.data) ? res.data.data : Array.isArray(res?.data) ? res.data : [];
        setAttendance(rows);
      } catch (e) {
        setAttendance([]);
      } finally {
        setLoading(false);
      }
    }

    fetchMonthly();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return attendance;
    return attendance.filter(r => (
      (r.EmployeeName || r.full_name || r.employeeName || r.EmployeeCode || '').toString().toLowerCase().includes(q) ||
      (r.DepartmentName || r.department || '').toString().toLowerCase().includes(q)
    ));
  }, [attendance, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <Header />
      <div className="flex flex-1 min-h-0">
        <Sidebar />
        <main className="flex-1 overflow-auto p-6">
          <div className="min-h-full rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-semibold text-slate-900">Biometric - Monthly Data</h2>
            <div className="mt-6">
              <div className="relative w-full sm:w-72 mb-4">
                <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search attendance..." className="w-full py-2 pl-10 pr-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-blue-600">
                    <tr className="text-left text-xs font-semibold text-slate-600 border-b">
                      <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Sl.No</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Employee</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Department</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Days Present</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Days Absent</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan={5} className="p-6 text-center">Loading...</td></tr>
                    ) : paginated.length === 0 ? (
                      <tr><td colSpan={5} className="p-6 text-center">No monthly data available</td></tr>
                    ) : (
                      paginated.map((row, idx) => (
                        <tr key={idx} className="border-b">
                          <td className="px-3 py-2 align-middle">{(page - 1) * PAGE_SIZE + idx + 1}</td>
                          <td className="px-3 py-2 align-middle">{row.EmployeeName || row.employeeName || row.full_name || row.EmployeeCode}</td>
                          <td className="px-3 py-2 align-middle">{row.DepartmentName || row.department || ''}</td>
                          <td className="px-3 py-2 align-middle">{row.days_present ?? row.present ?? ''}</td>
                          <td className="px-3 py-2 align-middle">{row.days_absent ?? row.absent ?? ''}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {filtered.length > PAGE_SIZE && (
                <div className="flex justify-end items-center gap-2 mt-4">
                  <button className="px-3 py-1 rounded border border-gray-300 bg-white text-gray-700 disabled:opacity-50" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Prev</button>
                  <span className="text-sm text-gray-700">Page {page} of {totalPages}</span>
                  <button className="px-3 py-1 rounded border border-gray-300 bg-white text-gray-700 disabled:opacity-50" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next</button>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
