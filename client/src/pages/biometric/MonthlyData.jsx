import { useEffect, useMemo, useState, useRef } from 'react';
import Chart from 'chart.js/auto';
import Header from '../../components/layout/Header';
import Sidebar from '../../components/layout/Sidebar';
import api from '../../api/axios';
import { getMyStaff } from '../../api/hodApi';
import { useAuth } from '../../context/AuthContext';
import { isRoleMatch, ROLE_HOD, ROLE_TEACHING, ROLE_NON_TEACHING } from '../../utils/role';

export default function MonthlyDataPage() {
  const [employees, setEmployees] = useState([]);
  const [staffFetchError, setStaffFetchError] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(false);
  const [monthlyData, setMonthlyData] = useState(null);
  const [missingDates, setMissingDates] = useState([]);
  const [logsByEmployee, setLogsByEmployee] = useState({});
  const [tableSearch, setTableSearch] = useState('');
  const [tablePage, setTablePage] = useState(1);
  const TABLE_PAGE_SIZE = 10;
  const [showModalFor, setShowModalFor] = useState(null);
  const canvasRef = useRef(null);
  const chartInstance = useRef(null);

  const { user } = useAuth();
  const endpointPrefix = '/biometric';

  useEffect(() => {
    async function fetchEmployees() {
      try {
        let list = [];
        // If the logged-in user is a staff (teaching or non-teaching), show only their own record
        if (user && (isRoleMatch(user.role, ROLE_TEACHING) || isRoleMatch(user.role, ROLE_NON_TEACHING))) {
          try {
            if (user.staff_id) {
              const res = await api.get(`/staff/${user.staff_id}`);
              const s = res?.data?.data || res?.data || null;
              if (s) {
                const normalized = [{
                  id: s.id || s.staff_id || null,
                  EmployeeCode: s.employeecode != null ? String(s.employeecode) : (s.EmployeeCode ? String(s.EmployeeCode) : ''),
                  employeecode: s.employeecode != null ? String(s.employeecode) : (s.EmployeeCode ? String(s.EmployeeCode) : ''),
                  fname: s.fname || '',
                  mname: s.mname || '',
                  lname: s.lname || '',
                  full_name: [s.fname, s.mname, s.lname].filter(Boolean).join(' ').trim(),
                  ...s
                }];
                list = normalized;
                setEmployees(list);
                if (normalized[0]?.EmployeeCode) setSelectedEmployee(normalized[0].EmployeeCode);
                setStaffFetchError('');
                return;
              }
            }
            // fallback: fetch staff list and find by user_id
            const resList = await api.get('/staff');
            const rows = Array.isArray(resList?.data?.data) ? resList.data.data : Array.isArray(resList?.data) ? resList.data : [];
            const row = rows.find(r => Number(r.user_id) === Number(user.id));
            if (row) {
              const normalized = [{
                id: row.id || row.staff_id || null,
                EmployeeCode: row.employeecode != null ? String(row.employeecode) : (row.EmployeeCode ? String(row.EmployeeCode) : ''),
                employeecode: row.employeecode != null ? String(row.employeecode) : (row.EmployeeCode ? String(row.EmployeeCode) : ''),
                fname: row.fname || '',
                mname: row.mname || '',
                lname: row.lname || '',
                full_name: [row.fname, row.mname, row.lname].filter(Boolean).join(' ').trim(),
                ...row
              }];
              list = normalized;
              setEmployees(list);
              if (normalized[0]?.EmployeeCode) setSelectedEmployee(normalized[0].EmployeeCode);
              setStaffFetchError('');
              return;
            }
          } catch (err) {
            console.error('Failed to resolve staff for MonthlyData (staff user):', err);
          }
        }
        if (user && isRoleMatch(user.role, ROLE_HOD)) {
            const res = await getMyStaff();
            const payload = res?.data?.data || res?.data || {};
            // payload may be an object: { department, teachingStaff: [], nonTeachingStaff: [] }
            if (Array.isArray(payload)) {
              list = payload;
            } else if (payload && (Array.isArray(payload.teachingStaff) || Array.isArray(payload.nonTeachingStaff))) {
              const teach = Array.isArray(payload.teachingStaff) ? payload.teachingStaff : [];
              const nonteach = Array.isArray(payload.nonTeachingStaff) ? payload.nonTeachingStaff : [];
              // normalize shape to match /staff responses: ensure EmployeeCode and name fields
              list = [...teach, ...nonteach].map((r) => ({
                id: r.staff_id || r.id || null,
                EmployeeCode: r.employeecode != null ? String(r.employeecode) : (r.employeecode ? String(r.employeecode) : ''),
                employeecode: r.employeecode != null ? String(r.employeecode) : '',
                fname: r.fname || '',
                mname: r.mname || '',
                lname: r.lname || '',
                full_name: [r.fname, r.mname, r.lname].filter(Boolean).join(' ').trim(),
                ...r
              }));
            } else {
              list = [];
            }
        } else {
          const res = await api.get('/staff');
          list = Array.isArray(res?.data?.data) ? res.data.data : Array.isArray(res?.data) ? res.data : [];
        }
        setEmployees(list);
        setStaffFetchError('');
      } catch (e) {
        console.error('Failed to load staff for MonthlyData:', e);
        setEmployees([]);
        const msg = e?.response?.data?.message || e.message || 'Failed to fetch staff';
        setStaffFetchError(msg);
      }
    }
    fetchEmployees();
  }, []);

  const submit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!selectedEmployee) return alert('Select employee');
    setLoading(true);
    try {
      const res = await api.get(`${endpointPrefix}/monthly`, { params: { employee: selectedEmployee, month, year } });
      const data = res?.data || {};
      // Laravel returns: employeeLogs, averageDurations, logsByEmployee, missinglog_array, selectedEmployee
      setMonthlyData(data);
      // Recompute missing dates client-side to avoid incorrect server results:
      const serverMissing = Array.isArray(data.missinglog_array) ? data.missinglog_array : [];
      const empLogs = data.employeeLogs || {};
      // build set of employee log keys normalized to ISO YYYY-MM-DD
      const empLogKeys = new Set(Object.keys(empLogs || {}).map(k => {
        const kd = new Date(k);
        return Number.isNaN(kd.getTime()) ? String(k) : kd.toISOString().slice(0,10);
      }));
      const filteredMissing = serverMissing.filter(d => {
        if (!d) return false;
        const dt = new Date(d);
        if (Number.isNaN(dt.getTime())) return false;
        // exclude Sundays
        if (dt.getDay() === 0) return false;
        // normalize to ISO for comparison
        const iso = dt.toISOString().slice(0,10);
        if (empLogKeys.has(iso)) return false;
        // some servers return different formats; also check formatted key
        const formatted = `${String(dt.getDate()).padStart(2,'0')}-${dt.toLocaleString('default',{month:'short'})}-${dt.getFullYear()}`;
        if (empLogKeys.has(formatted)) return false;
        return true;
      });
      setMissingDates(filteredMissing);
      setLogsByEmployee(data.logsByEmployee || {});
    } catch (err) {
      setMonthlyData(null);
      setMissingDates([]);
      setLogsByEmployee({});
    } finally {
      setLoading(false);
    }
  };

  const selectedEmpObj = useMemo(() => {
    return employees.find(e => String(e.EmployeeCode) === String(selectedEmployee)) || monthlyData?.selectedEmployee || null;
  }, [employees, selectedEmployee, monthlyData]);

  const handleOpenModal = (date) => setShowModalFor(date);
  const handleCloseModal = () => setShowModalFor(null);

  const logsForDate = (date) => {
    const empLogs = logsByEmployee[selectedEmployee] || {};
    // server may return logsByEmployee as an array of raw logs for the employee
    if (Array.isArray(empLogs)) {
      return empLogs.filter(l => (l.LogDate_Date || l.LogDate) === date);
    }
    // or as an object keyed by date
    const entries = empLogs[date] || [];
    return entries;
  };

  const formatDate = (value) => {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    const day = String(d.getDate()).padStart(2, '0');
    const month = d.toLocaleString('default', { month: 'short' });
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const formatTime = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  };

  useEffect(() => {
    if (!monthlyData || !monthlyData.employeeLogs) {
      if (chartInstance.current) { chartInstance.current.destroy(); chartInstance.current = null; }
      return;
    }
    const labels = Object.keys(monthlyData.employeeLogs).sort((a,b) => new Date(a) - new Date(b));
    const labelsFormatted = labels.map(d => formatDate(d));
    const dataVals = labels.map(d => {
      const dur = monthlyData.employeeLogs[d].duration; // 'HH:MM:SS'
      if (!dur) return 0;
      const parts = dur.split(':').map(Number);
      const secs = parts[0]*3600 + parts[1]*60 + parts[2];
      return secs / 3600; // convert to hours to match Laravel chart
    });

    const ctx = canvasRef.current?.getContext?.('2d');
    if (!ctx) return;
    if (chartInstance.current) chartInstance.current.destroy();
    chartInstance.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labelsFormatted,
        datasets: [{
          label: 'Daily Work Duration (Hours)',
          data: dataVals,
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          borderColor: 'rgba(75, 192, 192, 1)',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: true,
            title: { display: true, text: 'Work Duration (Hours)' }
          },
          x: { title: { display: true, text: 'Date' }, ticks: { autoSkip: false, maxRotation: 0 } }
        }
      }
    });

    return () => { if (chartInstance.current) { chartInstance.current.destroy(); chartInstance.current = null; } };
  }, [monthlyData]);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <Header />
      <div className="flex flex-1 min-h-0">
        <Sidebar />
        <main className="flex-1 overflow-auto p-6">
          <div className="min-h-full rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-semibold text-slate-900">Monthwise Biometric Details</h2>

            <form onSubmit={submit} className="mt-4 flex flex-wrap gap-3 items-center">
              <label className="font-bold">Select Employee:</label>
              {staffFetchError && (
                <div className="w-full text-sm text-red-600 mt-2">{staffFetchError}</div>
              )}
              <select value={selectedEmployee} onChange={(e) => setSelectedEmployee(e.target.value)} className="border p-2 rounded">
                <option value="">Select Employee</option>
                {employees.sort((a,b)=> (a.fname||'').localeCompare(b.fname||'')).map((emp, idx) => (
                  <option key={emp.id ?? emp.EmployeeCode ?? emp.employeecode ?? idx} value={emp.EmployeeCode || emp.employeecode}>{emp.fname} {emp.mname||''} {emp.lname}</option>
                ))}
              </select>

              <label className="font-bold">Month:</label>
              <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="border p-2 rounded">
                {Array.from({length:12}, (_,i)=>i+1).map(m=> (
                  <option key={m} value={m}>{new Date(0,m-1).toLocaleString('default',{month:'long'})}</option>
                ))}
              </select>

              <label className="font-bold">Year:</label>
              <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="border p-2 rounded">
                {Array.from({length: (new Date().getFullYear()-2023)}, (_,i)=>2024+i).map(y=> (<option key={y} value={y}>{y}</option>))}
              </select>

              <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">Search</button>
            </form>

            <div className="mt-6">
              {loading && <div className="p-4">Loading...</div>}

              {monthlyData && (
                <div className="mt-4">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-lg font-bold">Employee Logs for {new Date(year, month-1).toLocaleString('default',{month:'long'})} {year}</h4>
                    <h4 className="text-sm font-semibold">Employee Name: {selectedEmpObj ? `${selectedEmpObj.fname} ${selectedEmpObj.mname? selectedEmpObj.mname+' ':''}${selectedEmpObj.lname}` : ''}</h4>
                  </div>

                  <div className="flex items-center justify-between mb-3">
                    <h5 className="text-lg font-bold">Employee Code: {selectedEmployee}</h5>
                    <h5 className="text-lg font-bold">Average work Duration : {monthlyData?.averageDurations?.[selectedEmployee] ?? ''}</h5>
                  </div>

                  <div className="grid grid-cols-12 gap-4">
                    <div className="col-span-8">
                      <div className="box bg-white p-4 rounded shadow">
                        <canvas ref={canvasRef} style={{width:'100%',height:200}} />
                      </div>
                    </div>
                    <div className="col-span-4">
                      <div className="box bg-white p-4 rounded shadow">
                        <h5 className="font-bold">Punch Missing Dates</h5>
                            <div className="mt-2 rounded-md border border-gray-200 overflow-hidden">
                              <table className="w-full text-sm">
                                <thead className="bg-gray-50">
                                  <tr className="text-left text-sm font-semibold text-gray-700"><th className="px-3 py-2 border-b">Date</th></tr>
                                </thead>
                                <tbody>
                                  {(missingDates || []).map((d,i)=> (
                                      <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                                        <td className="px-3 py-2 border-b">{formatDate(d)}</td>
                                      </tr>
                                    ))}
                                </tbody>
                              </table>
                            </div>
                      </div>
                    </div>
                  </div>

                  {/* Daily table */}
                  <div className="mt-4 mb-6 overflow-hidden bg-white shadow-xl rounded-xl">
                    <div className="flex items-center justify-between p-4">
                      <div className="relative w-64">
                        <input value={tableSearch} onChange={(e)=>{ setTableSearch(e.target.value); setTablePage(1); }} placeholder="Search table..." className="w-full py-2 pl-10 pr-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                      </div>
                      <div className="text-sm text-gray-700">Showing {Math.min((tablePage-1)*TABLE_PAGE_SIZE+1,0)} - {Math.min(tablePage*TABLE_PAGE_SIZE, Object.keys(monthlyData.employeeLogs||{}).length)} of {Object.keys(monthlyData.employeeLogs||{}).length}</div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-blue-600">
                          <tr>
                            <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">S.No</th>
                            <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Date</th>
                            <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Entry Log</th>
                            <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Entry Device</th>
                            <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Exit Log</th>
                            <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Exit Device</th>
                            <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Duration</th>
                            <th className="px-6 py-4 text-center text-xs font-medium text-white uppercase tracking-wider">Action</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {(() => {
                            const rowsArr = monthlyData.employeeLogs ? Object.entries(monthlyData.employeeLogs).map(([dateKey, log]) => ({ dateKey, ...log })) : [];
                            const q = tableSearch.trim().toLowerCase();
                              const filteredRows = rowsArr.filter((r) => (
                              formatDate(r.dateKey).toLowerCase().includes(q) ||
                              (r.entryDevice||'').toLowerCase().includes(q) ||
                              (r.exitDevice||'').toLowerCase().includes(q)
                            ));
                            const start = (tablePage - 1) * TABLE_PAGE_SIZE;
                            const pageRows = filteredRows.slice(start, start + TABLE_PAGE_SIZE);
                            if (pageRows.length === 0) return (<tr><td colSpan={8} className="px-6 py-12 text-center text-gray-500">No logs found</td></tr>);
                            return pageRows.map((r, idx) => (
                              <tr key={r.dateKey} className="border-b">
                                <td className="px-3 py-2 align-middle">{start + idx + 1}</td>
                                <td className="px-3 py-2 align-middle">{formatDate(r.dateKey)}</td>
                                <td className="px-3 py-2 align-middle text-green-600">{r.entryLog ? formatTime(r.entryLog.LogDate) : ''}</td>
                                <td className="px-3 py-2 align-middle">{r.entryDevice || ''}</td>
                                <td className="px-3 py-2 align-middle text-red-600">{r.exitLog ? formatTime(r.exitLog.LogDate) : ''}</td>
                                <td className="px-3 py-2 align-middle">{r.exitDevice || ''}</td>
                                <td className="px-3 py-2 align-middle">{r.duration || ''}</td>
                                <td className="px-3 py-2 align-middle">
                                  <div className="flex items-center justify-center space-x-2">
                                    <button onClick={() => handleOpenModal(r.dateKey)} className="p-2 text-blue-600 transition-colors duration-200 bg-white rounded-lg hover:bg-blue-100 border border-blue-300">
                                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12.0003 3C17.3924 3 21.8784 6.87976 22.8189 12C21.8784 17.1202 17.3924 21 12.0003 21C6.60812 21 2.12215 17.1202 1.18164 12C2.12215 6.87976 6.60812 3 12.0003 3ZM12.0003 19C16.2359 19 19.8603 16.052 20.7777 12C19.8603 7.94803 16.2359 5 12.0003 5C7.7646 5 4.14022 7.94803 3.22278 12C4.14022 16.052 7.7646 19 12.0003 19ZM12.0003 16.5C9.51498 16.5 7.50026 14.4853 7.50026 12C7.50026 9.51472 9.51498 7.5 12.0003 7.5C14.4855 7.5 16.5003 9.51472 16.5003 12C16.5003 14.4853 14.4855 16.5 12.0003 16.5ZM12.0003 14.5C13.381 14.5 14.5003 13.3807 14.5003 12C14.5003 10.6193 13.381 9.5 12.0003 9.5C10.6196 9.5 9.50026 10.6193 9.50026 12C9.50026 13.3807 10.6196 14.5 12.0003 14.5Z" /></svg>
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ));
                          })()}
                        </tbody>
                      </table>
                    </div>
                    {/* Pagination Controls */}
                    <div className="flex justify-end items-center gap-2 px-6 py-4">
                      <button
                        className="px-3 py-1 rounded border border-gray-300 bg-white text-gray-700 disabled:opacity-50"
                        onClick={() => setTablePage(p => Math.max(1, p - 1))}
                        disabled={tablePage === 1}
                      >
                        Prev
                      </button>
                      <span className="text-sm text-gray-700">
                        Page {tablePage} of {Math.max(1, Math.ceil((Object.entries(monthlyData.employeeLogs||{}).filter(([dateKey, log]) => {
                          const q = tableSearch.trim().toLowerCase();
                          return formatDate(dateKey).toLowerCase().includes(q) || (log.entryDevice||'').toLowerCase().includes(q) || (log.exitDevice||'').toLowerCase().includes(q);
                        }).length) / TABLE_PAGE_SIZE))}
                      </span>
                      <button
                        className="px-3 py-1 rounded border border-gray-300 bg-white text-gray-700 disabled:opacity-50"
                        onClick={() => setTablePage(p => Math.min(Math.ceil(Object.entries(monthlyData.employeeLogs||{}).filter(([dateKey, log]) => {
                          const q = tableSearch.trim().toLowerCase();
                          return formatDate(dateKey).toLowerCase().includes(q) || (log.entryDevice||'').toLowerCase().includes(q) || (log.exitDevice||'').toLowerCase().includes(q);
                        }).length / TABLE_PAGE_SIZE), p + 1))}
                        disabled={tablePage === Math.ceil(Object.entries(monthlyData.employeeLogs||{}).filter(([dateKey, log]) => {
                          const q = tableSearch.trim().toLowerCase();
                          return formatDate(dateKey).toLowerCase().includes(q) || (log.entryDevice||'').toLowerCase().includes(q) || (log.exitDevice||'').toLowerCase().includes(q);
                        }).length / TABLE_PAGE_SIZE)}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Modal for logs on date */}
              {showModalFor && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                  <div className="bg-white rounded-lg max-w-4xl w-full p-4">
                      <div className="flex justify-between items-center mb-2">
                      <h3 className="font-bold">Log Details - {formatDate(showModalFor)}</h3>
                      <button onClick={handleCloseModal} className="px-2 py-1">Close</button>
                    </div>
                    <div className="mb-3 flex justify-between">
                      <div className="text-sm"><b>Employee Name:</b> {selectedEmpObj ? `${selectedEmpObj.fname} ${selectedEmpObj.mname? selectedEmpObj.mname+' ':''}${selectedEmpObj.lname}` : ''}</div>
                      <div className="text-sm"><b>Employee Code:</b> {selectedEmployee}</div>
                    </div>
                    <div className="table-bordered rounded-sm ti-custom-table-head overflow-auto">
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-blue-600">
                            <tr>
                              <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Log Date</th>
                              <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Log Time</th>
                              <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Log Device</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {(() => {
                              const raw = logsForDate(showModalFor) || [];
                              if (raw.length > 0) {
                                return raw.map((log, i) => (
                                  <tr key={i} className="border-b">
                                    <td className="px-3 py-2 text-sm text-gray-900">{log.LogDate_Date || formatDate(log.LogDate)}</td>
                                    <td className="px-3 py-2 text-sm text-gray-700">{log.LogDate_Time || formatTime(log.LogDate)}</td>
                                    <td className="px-3 py-2 text-sm text-gray-700">{log.DeviceFName || log.DeviceFname || ''}</td>
                                  </tr>
                                ));
                              }
                              const fallback = monthlyData?.employeeLogs?.[showModalFor];
                              if (fallback) {
                                const rows = [];
                                if (fallback.entryLog) rows.push({ LogDate: fallback.entryLog.LogDate, DeviceFName: fallback.entryDevice });
                                if (fallback.exitLog) rows.push({ LogDate: fallback.exitLog.LogDate, DeviceFName: fallback.exitDevice });
                                return rows.map((log, i) => (
                                  <tr key={i} className="border-b">
                                    <td className="px-3 py-2 text-sm text-gray-900">{formatDate(log.LogDate)}</td>
                                    <td className="px-3 py-2 text-sm text-gray-700">{formatTime(log.LogDate)}</td>
                                    <td className="px-3 py-2 text-sm text-gray-700">{log.DeviceFName || ''}</td>
                                  </tr>
                                ));
                              }
                              return (<tr><td colSpan={3} className="px-6 py-12 text-center text-gray-500">No logs for this date</td></tr>);
                            })()}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
