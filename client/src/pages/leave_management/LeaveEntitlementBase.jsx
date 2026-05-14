import { useEffect, useMemo, useState } from 'react';
import Header from '../../components/layout/Header';
import Notification from '../../components/common/Notification';

const startYear = 2024;
const PAGE_SIZE = 10;

const dedupeLeaveTypes = (types) => {
  if (!Array.isArray(types)) return [];
  const seen = new Set();
  const unique = [];
  for (const item of types) {
    const shortname = String(item?.shortname || '').trim().toUpperCase();
    if (!shortname || seen.has(shortname)) continue;
    seen.add(shortname);
    unique.push({ ...item, shortname });
  }
  return unique;
};

export default function LeaveEntitlementBase({
  Sidebar,
  headerTitle,
  fetchMeta,
  fetchRows,
  showDepartmentSelector = false,
}) {
  const token = (typeof window !== 'undefined' && window.__APP_TOKEN__) || null;

  const [year, setYear] = useState(new Date().getFullYear());
  const [departmentId, setDepartmentId] = useState('');

  const [departments, setDepartments] = useState([]);
  const [currentDepartment, setCurrentDepartment] = useState(null);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [leaveTypesTaken, setLeaveTypesTaken] = useState([]);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);

  const [notification, setNotification] = useState({ show: false, message: '', type: '' });

  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const list = [];
    for (let y = startYear; y <= currentYear + 1; y += 1) list.push(y);
    return list;
  }, []);

  const showNotification = (message, type = 'error') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: '' }), 4000);
  };

  const toDisplayNumber = (value) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : 0;
  };

  const filteredRows = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((row) => {
      const searchable = [String(row.id ?? ''), String(row.name ?? ''), String(row.dept_shortname ?? ''), String(year)].join(' ').toLowerCase();
      return searchable.includes(query);
    });
  }, [rows, searchTerm, year]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));

  const paginatedRows = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredRows.slice(start, start + PAGE_SIZE);
  }, [filteredRows, page]);

  const loadMeta = async () => {
    try {
      const res = await fetchMeta(token);
      const data = res.data?.data || {};
      setDepartments(data.departments || []);
      setLeaveTypes(dedupeLeaveTypes(data.leave_types));
      setLeaveTypesTaken(dedupeLeaveTypes(data.leave_types_taken));
      if (data.default_year) setYear(Number(data.default_year));
    } catch (err) {
      showNotification(err.response?.data?.message || err.message || 'Failed to load entitlement metadata');
    }
  };

  const loadRows = async (targetYear = year, targetDepartmentId = departmentId) => {
    setLoading(true);
    try {
      const res = await fetchRows({ year: targetYear, departmentId: targetDepartmentId }, token);
      const payload = res.data?.data || {};
      setRows(payload.data || []);
      if (payload.current_department) {
        setCurrentDepartment(payload.current_department);
      }
      if (!leaveTypes.length && Array.isArray(payload.leave_types)) setLeaveTypes(dedupeLeaveTypes(payload.leave_types));
      if (!leaveTypesTaken.length && Array.isArray(payload.leave_types_taken)) setLeaveTypesTaken(dedupeLeaveTypes(payload.leave_types_taken));
      if (!departments.length && Array.isArray(payload.departments)) setDepartments(payload.departments);
    } catch (err) {
      setRows([]);
      showNotification(err.response?.data?.message || err.message || 'Failed to load leave entitlements');
    }
    setLoading(false);
  };

  useEffect(() => { loadMeta(); }, []);
  useEffect(() => { loadRows(year, departmentId); }, [year, departmentId]);
  useEffect(() => { setPage(1); }, [year, departmentId, searchTerm, rows]);
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);

  const displayHeader = useMemo(() => {
    if (String(headerTitle).toLowerCase() === 'hod') {
      if (currentDepartment && (currentDepartment.dept_name || currentDepartment.dept_shortname)) {
        return `Welcome HOD ${currentDepartment.dept_name || currentDepartment.dept_shortname}`;
      }
      const dept = (departments && departments[0]) || (rows && rows[0] ? { dept_name: rows[0].dept_shortname, dept_shortname: rows[0].dept_shortname } : null);
      if (dept && (dept.dept_name || dept.dept_shortname)) {
        return `Welcome HOD ${dept.dept_name || dept.dept_shortname}`;
      }
    }
    return headerTitle;
  }, [headerTitle, departments, rows, currentDepartment]);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <Header />
      <div className="flex flex-1 min-h-0">
        {Sidebar && <Sidebar />}
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto">
            <Notification show={notification.show} message={notification.message} type={notification.type} onClose={() => setNotification({ show: false, message: '', type: '' })} />

            <div className="mb-6 flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-medium text-gray-900">{displayHeader}</h3>
                <p className="mt-2 text-lg text-gray-700">Leave Entitlement for - <span className="text-blue-600 font-semibold">{year || new Date().getFullYear()}</span></p>
              </div>

              {String(headerTitle).toLowerCase() === 'hod' && (
                <div className="flex items-center gap-3">
                  <div className="flex flex-col items-center">
                    <label className="text-sm font-semibold text-gray-700 mb-1">Calendar Year</label>
                    <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="py-2 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                      {yearOptions.map((optionYear) => (
                        <option key={optionYear} value={optionYear}>{optionYear}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>

            {showDepartmentSelector ? (
              <>
                <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-700">Department</label>
                    <select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} className="w-full py-2 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                      <option value="">Select department</option>
                      {departments.map((department) => (
                        <option key={department.id} value={department.id}>{department.dept_name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-700">Calendar Year</label>
                    <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="w-full py-2 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                      {yearOptions.map((optionYear) => (
                        <option key={optionYear} value={optionYear}>{optionYear}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex flex-col items-start justify-between gap-4 mb-4 sm:flex-row sm:items-center">
                  <div className="relative w-full sm:w-72">
                    <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search entitlement..." className="w-full py-2 pl-10 pr-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>
              </>
            ) : (
              <div className="mb-6 flex items-center gap-4 flex-nowrap">
                <div className="relative w-full sm:w-72 mr-4">
                  <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search entitlement..." className="w-full py-2 pl-10 pr-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                {String(headerTitle).toLowerCase() !== 'hod' && (
                  <div className="w-48 flex-shrink-0">
                    <label className="block mb-2 text-sm font-medium text-gray-700">Calendar Year</label>
                    <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="w-full py-2 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                      {yearOptions.map((optionYear) => (
                        <option key={optionYear} value={optionYear}>{optionYear}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}

            <div className="overflow-hidden bg-white shadow-xl rounded-xl">
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse">
                  <thead className="bg-blue-600 text-white">
                    <tr>
                      <th className="px-4 py-3 border text-left text-xs font-semibold uppercase" rowSpan="2">Sl. No</th>
                      <th className="px-4 py-3 border text-left text-xs font-semibold uppercase" rowSpan="2">Department</th>
                      <th className="px-4 py-3 border text-left text-xs font-semibold uppercase" rowSpan="2">Emp. ID</th>
                      <th className="px-4 py-3 border text-left text-xs font-semibold uppercase" rowSpan="2">Employee Name</th>
                      <th className="px-4 py-3 border text-left text-xs font-semibold uppercase" rowSpan="2">Year</th>
                      <th className="px-4 py-3 border text-center text-xs font-semibold uppercase" colSpan={leaveTypes.length}>Entitled + Accumulated-Encashed</th>
                      <th className="px-4 py-3 border text-center text-xs font-semibold uppercase" colSpan={leaveTypesTaken.length}>Taken</th>
                      <th className="px-4 py-3 border text-center text-xs font-semibold uppercase" colSpan={leaveTypes.length}>Balance</th>
                    </tr>
                    <tr>
                      {leaveTypes.map((leaveType) => (
                        <th key={`entitled-${leaveType.shortname}`} className="px-3 py-2 border text-xs font-semibold uppercase">{leaveType.shortname}</th>
                      ))}
                      {leaveTypesTaken.map((leaveType) => (
                        <th key={`taken-${leaveType.shortname}`} className="px-3 py-2 border text-xs font-semibold uppercase">{leaveType.shortname}</th>
                      ))}
                      {leaveTypes.map((leaveType) => (
                        <th key={`balance-${leaveType.shortname}`} className="px-3 py-2 border text-xs font-semibold uppercase">{leaveType.shortname}</th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={5 + leaveTypes.length * 2 + leaveTypesTaken.length} className="px-4 py-12 text-center text-gray-500">Loading...</td>
                      </tr>
                    ) : filteredRows.length === 0 ? (
                      <tr>
                        <td colSpan={5 + leaveTypes.length * 2 + leaveTypesTaken.length} className="px-4 py-12 text-center text-gray-500">No records found</td>
                      </tr>
                    ) : (
                      paginatedRows.map((row, index) => (
                        <tr key={row.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-4 py-3 border text-sm text-gray-700">{(page - 1) * PAGE_SIZE + index + 1}</td>
                          <td className="px-4 py-3 border text-sm text-gray-700">{row.dept_shortname || 'N/A'}</td>
                          <td className="px-4 py-3 border text-sm font-semibold text-gray-900">{row.id}</td>
                          <td className="px-4 py-3 border text-sm text-gray-700">{row.name}</td>
                          <td className="px-4 py-3 border text-sm text-gray-700">{year}</td>

                          {leaveTypes.map((leaveType) => {
                            const leaveData = row.leaves?.[leaveType.shortname];
                            return (
                              <td key={`entitled-${row.id}-${leaveType.shortname}`} className="px-4 py-3 border text-sm text-center text-gray-700">{toDisplayNumber(leaveData?.entitled_accumulated)}</td>
                            );
                          })}

                          {leaveTypesTaken.map((leaveType) => {
                            const leaveData = row.leaves?.[leaveType.shortname];
                            return (
                              <td key={`taken-${row.id}-${leaveType.shortname}`} className="px-4 py-3 border text-sm text-center text-gray-700">{toDisplayNumber(leaveData?.availed)}</td>
                            );
                          })}

                          {leaveTypes.map((leaveType) => {
                            const leaveData = row.leaves?.[leaveType.shortname];
                            return (
                              <td key={`balance-${row.id}-${leaveType.shortname}`} className="px-4 py-3 border text-sm text-center text-gray-700">{toDisplayNumber(leaveData?.balance)}</td>
                            );
                          })}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {!loading && filteredRows.length > PAGE_SIZE && (
                <div className="flex justify-end items-center gap-2 px-6 pb-6 pt-4 border-t border-gray-200 bg-gray-50">
                  <button className="px-3 py-1 rounded border border-gray-300 bg-white text-gray-700 disabled:opacity-50" onClick={() => setPage((prev) => Math.max(1, prev - 1))} disabled={page === 1}>Prev</button>
                  <span className="text-sm text-gray-700">Page {page} of {totalPages}</span>
                  <button className="px-3 py-1 rounded border border-gray-300 bg-white text-gray-700 disabled:opacity-50" onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))} disabled={page === totalPages}>Next</button>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
