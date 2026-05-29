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
  const [downloadingReport, setDownloadingReport] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [hodMonthlySummary, setHodMonthlySummary] = useState(null);
  const [summaryError, setSummaryError] = useState('');
  const [monthlyData, setMonthlyData] = useState(null);
  const [missingDates, setMissingDates] = useState([]);
  const [leaveDates, setLeaveDates] = useState([]);
  const [logsByEmployee, setLogsByEmployee] = useState({});
  const [tableSearch, setTableSearch] = useState('');
  const [tablePage, setTablePage] = useState(1);
  const TABLE_PAGE_SIZE = 10;
  const [showModalFor, setShowModalFor] = useState(null);
  const canvasRef = useRef(null);
  const chartInstance = useRef(null);

  const { user } = useAuth();
  const endpointPrefix = '/biometric';
  const isHodUser = isRoleMatch(user?.role, ROLE_HOD);

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
    const shouldLoadEmployeeView = Boolean(selectedEmployee);
    if (!shouldLoadEmployeeView && !isHodUser) return alert('Select employee');

    setLoading(true);
    if (isHodUser && !shouldLoadEmployeeView) {
      setSummaryLoading(true);
      setSummaryError('');
    }

    try {
      const requests = [];
      if (shouldLoadEmployeeView) {
        requests.push(api.get(`${endpointPrefix}/monthly`, { params: { employee: selectedEmployee, month, year } }));
      }
      if (isHodUser && !shouldLoadEmployeeView) {
        requests.push(api.get(`${endpointPrefix}/monthly/hod-summary`, { params: { month, year } }));
      }

      const responses = await Promise.all(requests);
      const res = shouldLoadEmployeeView ? responses[0] : null;
      const hodSummaryRes = shouldLoadEmployeeView ? null : responses[0];
      const data = res?.data || {};
      // Laravel returns: employeeLogs, averageDurations, logsByEmployee, missinglog_array, selectedEmployee
      if (shouldLoadEmployeeView) {
        setMonthlyData(data);
      } else {
        setMonthlyData(null);
      }
      // Recompute missing dates client-side to avoid incorrect server results:
      const serverMissing = Array.isArray(data.missinglog_array) ? data.missinglog_array : [];
      const empLogs = data.employeeLogs || {};
      let holidayDateSet = new Set();
      try {
        const holRes = await api.get('/holidayrhs');
        const holPayload = Array.isArray(holRes?.data?.data)
          ? holRes.data.data
          : Array.isArray(holRes?.data)
            ? holRes.data
            : [];
        holidayDateSet = new Set(
          holPayload
            .filter((h) => String(h?.type || '').toLowerCase() === 'holiday')
            .map((h) => String(h?.start || h?.holidayrh_date || '').slice(0, 10))
            .filter(Boolean)
        );
      } catch (_holidayErr) {
        holidayDateSet = new Set();
      }
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
        // exclude holidays from holidayrh table
        if (holidayDateSet.has(iso)) return false;
        if (empLogKeys.has(iso)) return false;
        // some servers return different formats; also check formatted key
        const formatted = `${String(dt.getDate()).padStart(2,'0')}-${dt.toLocaleString('default',{month:'short'})}-${dt.getFullYear()}`;
        if (empLogKeys.has(formatted)) return false;
        return true;
      });
      setMissingDates(shouldLoadEmployeeView ? filteredMissing : []);
      setLeaveDates(shouldLoadEmployeeView ? (Array.isArray(data.leave_dates) ? data.leave_dates : []) : []);
      setLogsByEmployee(shouldLoadEmployeeView ? (data.logsByEmployee || {}) : {});

      if (isHodUser && !shouldLoadEmployeeView) {
        setHodMonthlySummary(hodSummaryRes?.data || null);
      } else {
        setHodMonthlySummary(null);
        setSummaryError('');
      }
    } catch (err) {
      setMonthlyData(null);
      setMissingDates([]);
      setLeaveDates([]);
      setLogsByEmployee({});
      if (isHodUser && !selectedEmployee) {
        setHodMonthlySummary(null);
        setSummaryError(err?.response?.data?.message || 'Failed to load department monthly summary');
      } else {
        setSummaryError('');
      }
    } finally {
      setLoading(false);
      if (isHodUser) setSummaryLoading(false);
    }
  };

  const downloadHodMonthlyReport = async () => {
    if (!isHodUser) return;
    setDownloadingReport(true);
    try {
      const response = await api.get(`${endpointPrefix}/monthly/download-hod`, {
        params: { month, year },
        responseType: 'blob'
      });

      const contentDisposition = response?.headers?.['content-disposition'] || '';
      const fileNameMatch = contentDisposition.match(/filename="?([^";]+)"?/i);
      const fileName = fileNameMatch?.[1] || `Biometric_Report_${month}_${year}.xlsx`;

      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to download report');
    } finally {
      setDownloadingReport(false);
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

  const isFirstOrThirdSaturday = (value) => {
    if (!value) return false;
    const d = new Date(value);
    if (Number.isNaN(d.getTime()) || d.getDay() !== 6) return false;
    const weekOfMonth = Math.floor((d.getDate() - 1) / 7) + 1;
    return weekOfMonth === 1 || weekOfMonth === 3;
  };

  const isOnLeaveDate = (value) => {
    if (!value) return false;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return false;
    const iso = d.toISOString().slice(0, 10);
    return leaveDates.includes(iso);
  };

  useEffect(() => {
    if (!monthlyData || !monthlyData.employeeLogs) {
      if (chartInstance.current) { chartInstance.current.destroy(); chartInstance.current = null; }
      return;
    }
    const labels = Object.keys(monthlyData.employeeLogs).sort((a,b) => new Date(a) - new Date(b));
    const selectedMonthLabel = new Date(year, month - 1).toLocaleString('default', { month: 'long' });
    const labelsFormatted = labels.map((d) => {
      const dt = new Date(d);
      if (Number.isNaN(dt.getTime())) return d;
      return String(dt.getDate());
    });
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
          x: { title: { display: true, text: `Date (${selectedMonthLabel} ${year})` }, ticks: { autoSkip: false, maxRotation: 0 } }
        }
      }
    });

    return () => { if (chartInstance.current) { chartInstance.current.destroy(); chartInstance.current = null; } };
  }, [monthlyData, month, year]);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <Header />
      <div className="flex flex-1 min-h-0">
        <Sidebar />
        <main className="flex-1 overflow-auto p-6">
          <div className="min-h-full overflow-hidden rounded-xl bg-white shadow-xl">
            <div className="border-b border-slate-200 px-6 py-5">
              <h2 className="text-2xl font-semibold text-slate-900">Monthwise Biometric Details</h2>
              <p className="mt-1 text-sm text-slate-600">Search an employee and view the monthwise biometric log summary in a single boxed layout.</p>
            </div>

            <div className="space-y-6 p-6">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <form onSubmit={submit} className="flex flex-wrap items-center gap-3">
                  <label className="font-bold">Select Employee:</label>
                  {staffFetchError && (
                    <div className="w-full text-sm text-red-600 mt-1">{staffFetchError}</div>
                  )}
                  <select value={selectedEmployee} onChange={(e) => setSelectedEmployee(e.target.value)} className="border p-2 rounded bg-white">
                    <option value="">Select Employee</option>
                    {employees.slice().sort((a,b)=> (a.fname||'').localeCompare(b.fname||'')).map((emp, idx) => (
                      <option key={emp.id ?? emp.EmployeeCode ?? emp.employeecode ?? idx} value={emp.EmployeeCode || emp.employeecode}>{emp.fname} {emp.mname||''} {emp.lname}</option>
                    ))}
                  </select>

                  <label className="font-bold">Month:</label>
                  <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="border p-2 rounded bg-white">
                    {Array.from({length:12}, (_,i)=>i+1).map(m=> (
                      <option key={m} value={m}>{new Date(0,m-1).toLocaleString('default',{month:'long'})}</option>
                    ))}
                  </select>

                  <label className="font-bold">Year:</label>
                  <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="border p-2 rounded bg-white">
                    {Array.from({length: (new Date().getFullYear()-2023)}, (_,i)=>2024+i).map(y=> (<option key={y} value={y}>{y}</option>))}
                  </select>

                  <button type="submit" className="rounded bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700">Search</button>
                  {isHodUser && (
                    <button
                      type="button"
                      onClick={downloadHodMonthlyReport}
                      disabled={downloadingReport}
                      className="rounded bg-emerald-600 px-4 py-2 text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {downloadingReport ? 'Downloading...' : 'Download Report'}
                    </button>
                  )}
                </form>
              </div>

              {loading && <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">Loading...</div>}

              {isHodUser && !selectedEmployee && summaryLoading && (
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">Loading monthly department summary...</div>
              )}

              {isHodUser && !selectedEmployee && summaryError && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{summaryError}</div>
              )}

              {isHodUser && !selectedEmployee && hodMonthlySummary && Array.isArray(hodMonthlySummary.rows) && hodMonthlySummary.rows.length > 0 && (
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
                  <div className="border-b border-slate-200 px-4 py-3">
                    <h4 className="text-base font-bold text-slate-900">
                      Department Monthly Report Preview ({new Date(year, month - 1).toLocaleString('default', { month: 'long' })} {year})
                    </h4>
                    {/* <p className="text-xs text-slate-600">This table mirrors the Download Report sheet for all staff.</p> */}
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-100">
                          <th rowSpan={2} className="sticky left-0 z-10 border border-slate-200 bg-slate-100 px-3 py-2 text-left font-semibold">Employee Name</th>
                          {hodMonthlySummary.days.map((d) => (
                            <th key={`d-${d.date}`} colSpan={2} className="border border-slate-200 px-2 py-2 text-center font-semibold">{d.label}</th>
                          ))}
                        </tr>
                        <tr className="bg-slate-50">
                          {hodMonthlySummary.days.flatMap((d) => ([
                            <th key={`in-${d.date}`} className="border border-slate-200 px-2 py-1 text-center font-medium">In</th>,
                            <th key={`out-${d.date}`} className="border border-slate-200 px-2 py-1 text-center font-medium">Out</th>
                          ]))}
                        </tr>
                      </thead>
                      <tbody>
                        {hodMonthlySummary.rows.map((row, rowIdx) => (
                          <tr key={`${row.employeeCode}-${rowIdx}`} className={rowIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                            <td className="sticky left-0 z-10 border border-slate-200 bg-inherit px-3 py-2 font-medium">{row.employeeName}</td>
                            {hodMonthlySummary.days.flatMap((d) => ([
                              <td key={`${row.employeeCode}-${d.date}-in`} className="border border-slate-200 px-2 py-1 text-center">{row.punches?.[d.date]?.in || ''}</td>,
                              <td key={`${row.employeeCode}-${d.date}-out`} className="border border-slate-200 px-2 py-1 text-center">{row.punches?.[d.date]?.out || ''}</td>
                            ]))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {monthlyData && (
                <div className="space-y-6">
                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <h4 className="text-lg font-bold">Employee Logs for {new Date(year, month-1).toLocaleString('default',{month:'long'})} {year}</h4>
                      <h4 className="text-sm font-semibold">Employee Name: {selectedEmpObj ? `${selectedEmpObj.fname} ${selectedEmpObj.mname? selectedEmpObj.mname+' ':''}${selectedEmpObj.lname}` : ''}</h4>
                    </div>

                    <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <h5 className="text-lg font-bold">Employee Code: {selectedEmployee}</h5>
                      <h5 className="text-lg font-bold">Average work Duration : {monthlyData?.averageDurations?.[selectedEmployee] ?? ''}</h5>
                    </div>
                  </div>

                  <div className="grid grid-cols-12 gap-4">
                    <div className="col-span-12 lg:col-span-8">
                      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                        <canvas ref={canvasRef} style={{width:'100%',height:200}} />
                      </div>
                    </div>
                    <div className="col-span-12 lg:col-span-4">
                      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                        <h5 className="font-bold">Punch Missing Dates</h5>
                        <div className="mt-3 rounded-md border border-gray-200 overflow-hidden">
                          <table className="w-full text-sm">
                            <thead className="bg-gray-50">
                              <tr className="text-left text-sm font-semibold text-gray-700"><th className="px-3 py-2 border-b">Date</th></tr>
                            </thead>
                            <tbody>
                              {(missingDates || []).map((d,i)=> {
                                const highlightSaturday = isFirstOrThirdSaturday(d);
                                const highlightLeave = isOnLeaveDate(d);
                                const rowClass = highlightLeave
                                  ? 'bg-emerald-100'
                                  : (highlightSaturday
                                    ? 'bg-amber-100'
                                    : (i % 2 === 0 ? 'bg-white' : 'bg-slate-50'));
                                return (
                                  <tr key={i} className={rowClass}>
                                    <td className={`px-3 py-2 border-b ${highlightLeave ? 'font-semibold text-emerald-900' : (highlightSaturday ? 'font-semibold text-amber-900' : '')}`}>
                                      {formatDate(d)}{highlightLeave ? ' (On Leave)' : (highlightSaturday ? ' (1st/3rd Sat)' : '')}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Daily table */}
                  <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
                    <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="relative w-full sm:w-64">
                        <input value={tableSearch} onChange={(e)=>{ setTableSearch(e.target.value); setTablePage(1); }} placeholder="Search table..." className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 focus:border-blue-500 focus:ring-2 focus:ring-blue-500" />
                        <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
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
                                    <button onClick={() => handleOpenModal(r.dateKey)} className="rounded-lg border border-blue-300 bg-white p-2 text-blue-600 transition-colors duration-200 hover:bg-blue-100">
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12.0003 3C17.3924 3 21.8784 6.87976 22.8189 12C21.8784 17.1202 17.3924 21 12.0003 21C6.60812 21 2.12215 17.1202 1.18164 12C2.12215 6.87976 6.60812 3 12.0003 3ZM12.0003 19C16.2359 19 19.8603 16.052 20.7777 12C19.8603 7.94803 16.2359 5 12.0003 5C7.7646 5 4.14022 7.94803 3.22278 12C4.14022 16.052 7.7646 19 12.0003 19ZM12.0003 16.5C9.51498 16.5 7.50026 14.4853 7.50026 12C7.50026 9.51472 9.51498 7.5 12.0003 7.5C14.4855 7.5 16.5003 9.51472 16.5003 12C16.5003 14.4853 14.4855 16.5 12.0003 16.5ZM12.0003 14.5C13.381 14.5 14.5003 13.3807 14.5003 12C14.5003 10.6193 13.381 9.5 12.0003 9.5C10.6196 9.5 9.50026 10.6193 9.50026 12C9.50026 13.3807 10.6196 14.5 12.0003 14.5Z" /></svg>
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
                    <div className="flex items-center justify-end gap-2 px-6 py-4">
                      <button
                        className="rounded border border-gray-300 bg-white px-3 py-1 text-gray-700 disabled:opacity-50"
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
                        className="rounded border border-gray-300 bg-white px-3 py-1 text-gray-700 disabled:opacity-50"
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
                  <div className="w-full max-w-4xl rounded-lg bg-white p-4">
                    <div className="mb-2 flex items-center justify-between">
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
