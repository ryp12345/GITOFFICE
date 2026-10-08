import { useEffect, useMemo, useRef, useState } from 'react';
import Header from '../../components/layout/Header';
import Sidebar from '../../components/layout/Sidebar';
import api from '../../api/axios';
import Chart from 'chart.js/auto';
import { getMyStaff } from '../../api/hodApi';
import { useAuth } from '../../context/AuthContext';
import { isRoleMatch, ROLE_HOD, ROLE_TEACHING, ROLE_NON_TEACHING } from '../../utils/role';
import { getErrorMessage, reportError } from '../../utils/errors';
import { toast } from '../../notifications/notifier';
import LoadError from '../../components/common/LoadError';
import SearchInput from '../../components/common/SearchInput';

export default function DailyDataPage() {
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [entryExit, setEntryExit] = useState(null);
  const [totalIn, setTotalIn] = useState(null);
  const [totalOut, setTotalOut] = useState(null);
  const [totalPresent, setTotalPresent] = useState(null);
  const [totalLeave, setTotalLeave] = useState(null);
  const [totalMissing, setTotalMissing] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [missingList, setMissingList] = useState([]);
  const [showMissingModal, setShowMissingModal] = useState(false);
  const [selectedPunches, setSelectedPunches] = useState(null);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const PAGE_SIZE = 10;

  const { user } = useAuth();
  const isStaff = Boolean(user && (isRoleMatch(user.role, ROLE_TEACHING) || isRoleMatch(user.role, ROLE_NON_TEACHING) || user.staff_id));
  const endpointPrefix = '/biometric';
  const [hodEmployeeCodes, setHodEmployeeCodes] = useState(new Set());
  const [staffFetchError, setStaffFetchError] = useState('');
  const [departmentId, setDepartmentId] = useState(null);
  const [staffEmployeeCode, setStaffEmployeeCode] = useState(null);
  const isHod = Boolean(user && isRoleMatch(user.role, ROLE_HOD));
  const isStaffRole = Boolean(user && (isRoleMatch(user.role, ROLE_TEACHING) || isRoleMatch(user.role, ROLE_NON_TEACHING)));
  // The server does not scope /biometric/daily by role, so the HOD's department and a staff
  // member's own code must be known before loading. 'pending' | 'ready' | 'error'
  const [hodScopeStatus, setHodScopeStatus] = useState('pending');
  const [staffCodeStatus, setStaffCodeStatus] = useState('pending');
  // Only the status that applies to this user's role should re-trigger a load
  const scopeKey = isHod ? `hod:${hodScopeStatus}` : isStaffRole ? `staff:${staffCodeStatus}` : 'none';
  const [loadError, setLoadError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [scopeRetryKey, setScopeRetryKey] = useState(0);
  const [missingLoading, setMissingLoading] = useState(false);
  const [missingError, setMissingError] = useState('');

  const sumValues = (obj) => Object.values(obj || {}).reduce((s, v) => s + (Number(v) || 0), 0);

  const hasEntry = (row) => Boolean(row?.entryLogs || row?.entry || row?.entryLog);

  const getDeptName = (row) => row?.DepartmentName || row?.dept_shortname || row?.department || 'Unknown';

  const buildPresentByDept = (rows) => {
    const map = {};
    (rows || []).forEach((r) => {
      if (!hasEntry(r)) return;
      const dept = getDeptName(r);
      map[dept] = (map[dept] || 0) + 1;
    });
    return map;
  };

  const buildLeaveMissingByDept = (missingRows) => {
    const leaveLogsByDept = {};
    const missingLogsByDept = {};

    (missingRows || []).forEach((row) => {
      const dept = getDeptName(row);
      const onLeave = Array.isArray(row?.leave_staff_applications) && row.leave_staff_applications.length > 0;
      if (onLeave) {
        leaveLogsByDept[dept] = (leaveLogsByDept[dept] || 0) + 1;
      } else {
        missingLogsByDept[dept] = (missingLogsByDept[dept] || 0) + 1;
      }
    });

    return { leaveLogsByDept, missingLogsByDept };
  };

  const applyChartAndTotals = async (payload, rows, selectedDate) => {
    const entryFromPayload = payload.entryLogsByDept || payload.entry_logs_by_dept || {};
    const leaveFromPayload = payload.leaveLogsByDept || payload.leave_logs_by_dept || {};
    const missingFromPayload = payload.missingLogsByDept || payload.missing_logs_by_dept || {};

    const entryLogsByDept = Object.keys(entryFromPayload).length > 0 ? entryFromPayload : buildPresentByDept(rows);

    let leaveLogsByDept = leaveFromPayload;
    let missingLogsByDept = missingFromPayload;

    // Node daily endpoint does not include leave/missing buckets yet, so derive from missing list endpoint.
    let bucketsUnavailable = false;
    if (Object.keys(leaveLogsByDept).length === 0 && Object.keys(missingLogsByDept).length === 0) {
      const { list: missingRows, failed } = await fetchMissingForDate(selectedDate, { updateState: false });
      bucketsUnavailable = failed;
      const derived = buildLeaveMissingByDept(missingRows);
      leaveLogsByDept = derived.leaveLogsByDept;
      missingLogsByDept = derived.missingLogsByDept;
      if (failed) {
        toast.warning('Leave and missing-punch counts could not be loaded for this date.', { dedupeKey: 'biometric-buckets' });
      }
    }

    setChartData({ entryLogsByDept, leaveLogsByDept, missingLogsByDept });

    const presentFallback = (rows || []).filter((r) => hasEntry(r)).length;
    const presentTotal = payload.Totalpresent ?? payload.totalPresent ?? (sumValues(entryLogsByDept) || presentFallback);
    // Unknown, not zero, when the source failed
    const leaveTotal = payload.TotalLeave ?? payload.totalLeave ?? (bucketsUnavailable ? null : sumValues(leaveLogsByDept));
    const missingTotal = payload.Totalmissing ?? payload.totalMissing ?? (bucketsUnavailable ? null : sumValues(missingLogsByDept));

    setTotalPresent(presentTotal);
    setTotalLeave(leaveTotal);
    setTotalMissing(missingTotal);
  };

  // Resolve the logged-in user's own biometric code (used to scope staff to their own punches)
  useEffect(() => {
    let mounted = true;
    async function resolveMyEmployeeCode() {
      if (!user) return;
      setStaffCodeStatus('pending');
      try {
        let code = null;
        if (user.staff_id) {
          const res = await api.get(`/staff/${user.staff_id}`);
          const s = res?.data?.data || res?.data || null;
          code = s?.employeecode ?? s?.EmployeeCode ?? s?.biometric_code ?? null;
        } else if (user.id) {
          const listRes = await api.get('/staff');
          const rows = Array.isArray(listRes?.data?.data) ? listRes.data.data : Array.isArray(listRes?.data) ? listRes.data : [];
          const row = rows.find(r => Number(r.user_id) === Number(user.id));
          code = row?.employeecode ?? row?.EmployeeCode ?? row?.biometric_code ?? null;
        }
        if (!mounted) return;
        if (code) setStaffEmployeeCode(String(code));
        setStaffCodeStatus(code ? 'ready' : 'error');
      } catch (e) {
        reportError(e, { source: 'DailyData:resolveMyEmployeeCode' });
        if (mounted) setStaffCodeStatus('error');
      }
    }
    resolveMyEmployeeCode();
    return () => { mounted = false; };
  }, [user, scopeRetryKey]);

  useEffect(() => {
    let mounted = true;

    async function fetchAttendance() {
      // Never load unscoped data: wait for the HOD's department or the staff member's own code,
      // and show an error instead of falling back to the whole institution if either fails.
      if (isHod) {
        if (hodScopeStatus === 'pending') return;
        if (hodScopeStatus === 'error') {
          setAttendance([]);
          setLoadError(staffFetchError || 'Your department could not be determined, so attendance cannot be shown.');
          setLoading(false);
          return;
        }
      } else if (isStaffRole) {
        if (staffCodeStatus === 'pending') return;
        if (staffCodeStatus === 'error') {
          setAttendance([]);
          setLoadError('Your biometric employee code could not be found, so your attendance cannot be shown. Please contact the establishment section.');
          setLoading(false);
          return;
        }
      }
      try {
        setLoading(true);
        setLoadError('');
        const params = { date };
        if (user && isRoleMatch(user.role, ROLE_HOD) && departmentId) params.department_id = departmentId;
        const res = await api.get(`${endpointPrefix}/daily`, { params });
        // A newer request (date change) has started; drop this stale response
        if (!mounted) return;
        const payload = res?.data || {};

        // Save entry_exit and totals if available
        const entryExitPayload = payload.entry_exit || null;
        setEntryExit(entryExitPayload);
        if (entryExitPayload) {
          setTotalIn(entryExitPayload.oddCount ?? entryExitPayload.totalIn ?? null);
          setTotalOut(entryExitPayload.evenCount ?? entryExitPayload.totalOut ?? null);
        }

        setTotalPresent(payload.Totalpresent ?? payload.totalPresent ?? null);
        setTotalLeave(payload.TotalLeave ?? payload.totalLeave ?? null);
        setTotalMissing(payload.Totalmissing ?? payload.totalMissing ?? null);

        if (payload.combinedData && entryExitPayload) {
          const combined = Array.isArray(payload.combinedData) ? payload.combinedData : [];
          const entryExit = payload.entry_exit || {};
          const rows = combined.map((d) => {
            const code = d.EmployeeCode || d.employeeCode || (d.EmployeeCode ? String(d.EmployeeCode) : null);
            return {
              ...d,
              EmployeeCode: code,
              entryLogs: entryExit.entryLogs && code ? entryExit.entryLogs[code] ?? null : null,
              exitLogs: entryExit.exitLogs && code ? entryExit.exitLogs[code] ?? null : null,
              employeePunchLogs: entryExit.employeePunchLogs && code ? (entryExit.employeePunchLogs[code] ?? []) : (d.employeePunchLogs || []),
              punchCounts: entryExit.punchCounts && code ? (entryExit.punchCounts[code] ?? (d.punchCounts || d.punchCount || null)) : (d.punchCounts || d.punchCount || null),
              durations: entryExit.durations && code ? (entryExit.durations[code] ?? d.durations ?? d.duration ?? null) : (d.durations || d.duration || null),
            };
          });
          let filteredRows = rows;
          if (user && isRoleMatch(user.role, ROLE_HOD) && hodEmployeeCodes && hodEmployeeCodes.size > 0) {
            filteredRows = rows.filter(r => {
              const ec = (r.EmployeeCode || r.employeecode || r.biometric_code || '');
              return ec && hodEmployeeCodes.has(String(ec));
            });
          }
          if (user && (isRoleMatch(user.role, ROLE_TEACHING) || isRoleMatch(user.role, ROLE_NON_TEACHING)) && staffEmployeeCode) {
            filteredRows = filteredRows.filter(r => String(r.EmployeeCode || r.employeecode || r.biometric_code || '').trim() === String(staffEmployeeCode).trim());
          }
          setAttendance(filteredRows);
          await applyChartAndTotals(payload, filteredRows, date);
        } else {
          const rows = Array.isArray(payload.data) ? payload.data : Array.isArray(payload) ? payload : [];
          let filteredRows = rows;
          if (user && isRoleMatch(user.role, ROLE_HOD) && hodEmployeeCodes && hodEmployeeCodes.size > 0) {
            filteredRows = rows.filter(r => {
              const ec = (r.EmployeeCode || r.employeecode || r.biometric_code || '');
              return ec && hodEmployeeCodes.has(String(ec));
            });
          }
          if (user && (isRoleMatch(user.role, ROLE_TEACHING) || isRoleMatch(user.role, ROLE_NON_TEACHING)) && staffEmployeeCode) {
            filteredRows = filteredRows.filter(r => String(r.EmployeeCode || r.employeecode || r.biometric_code || '').trim() === String(staffEmployeeCode).trim());
          }
          setAttendance(filteredRows);
          await applyChartAndTotals(payload, filteredRows, date);
        }
      } catch (e) {
        if (!mounted) return;
        setAttendance([]);
        setChartData(null);
        setLoadError(getErrorMessage(e, 'Failed to load attendance for this date.'));
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchAttendance();
    return () => { mounted = false; };
  }, [user, date, hodEmployeeCodes, departmentId, staffEmployeeCode, scopeKey, reloadKey]);

  // Fetch HOD staff mapping so we can scope daily results to the HOD's department
  useEffect(() => {
    async function fetchHodStaff() {
      if (!user || !isRoleMatch(user.role, ROLE_HOD)) return;
      setHodScopeStatus('pending');
      try {
        const res = await getMyStaff();
        const payload = res?.data?.data || res?.data || {};
        let list = [];
        if (Array.isArray(payload)) list = payload;
        else if (payload && (Array.isArray(payload.teachingStaff) || Array.isArray(payload.nonTeachingStaff))) {
          const teach = Array.isArray(payload.teachingStaff) ? payload.teachingStaff : [];
          const nonteach = Array.isArray(payload.nonTeachingStaff) ? payload.nonTeachingStaff : [];
          list = [...teach, ...nonteach];
        }
        const codes = new Set(list.map(r => String(r.employeecode != null ? r.employeecode : (r.EmployeeCode || r.EmployeeCode))).filter(Boolean));
        setHodEmployeeCodes(codes);
        // set department id if returned by API payload
        const dept = payload.department || res?.data?.department || null;
        if (dept && dept.id) setDepartmentId(Number(dept.id));
        setStaffFetchError('');
        // Either the department or the staff list is enough to scope results
        setHodScopeStatus((dept && dept.id) || codes.size > 0 ? 'ready' : 'error');
      } catch (err) {
        reportError(err, { source: 'DailyData:fetchHodStaff' });
        setHodEmployeeCodes(new Set());
        setStaffFetchError(getErrorMessage(err, 'Failed to load your department staff, so attendance cannot be shown.'));
        setHodScopeStatus('error');
      }
    }
    fetchHodStaff();
  }, [user, scopeRetryKey]);

  // Render chart when chartData changes
  useEffect(() => {
    if (!chartData) return;
    const ctx = chartRef.current?.getContext?.('2d');
    if (!ctx) return;

    const entryLogsByDept = chartData.entryLogsByDept || {};
    const leaveLogsByDept = chartData.leaveLogsByDept || {};
    const missingLogsByDept = chartData.missingLogsByDept || {};

    const labels = Array.from(new Set([
      ...Object.keys(entryLogsByDept),
      ...Object.keys(leaveLogsByDept),
      ...Object.keys(missingLogsByDept),
    ]));
    const entryData = labels.map(l => entryLogsByDept[l] ?? 0);
    const leaveData = labels.map(l => leaveLogsByDept[l] ?? 0);
    const missingData = labels.map(l => missingLogsByDept[l] ?? 0);

    if (chartInstance.current) {
      chartInstance.current.destroy();
      chartInstance.current = null;
    }

    // A chart failure should leave the table usable, not take down the whole page
    try {
      chartInstance.current = new Chart(ctx, {
        type: 'bar',
        data: {
          labels,
          datasets: [
            { label: 'Punched data', data: entryData, backgroundColor: 'rgba(54,162,235,0.6)' },
            { label: 'Leaves', data: leaveData, backgroundColor: 'rgba(255,206,86,0.6)' },
            { label: 'Missing Punch', data: missingData, backgroundColor: 'rgba(255,99,132,0.6)' },
          ]
        },
        options: { responsive: true, scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true } } }
      });
    } catch (e) {
      reportError(e, { source: 'DailyData:chart' });
    }

    return () => chartInstance.current?.destroy();
  }, [chartData]);

  // Returns { list, failed }. failed is true only when every source errored, so the caller can
  // tell "nobody is missing" apart from "the missing list could not be loaded".
  const fetchMissingForDate = async (selectedDate, options = {}) => {
    const { updateState = true } = options;
    let list = [];
    let endpointsFailed = false;
    let fallbackFailed = false;
    try {
      const missingParams = { date: selectedDate };
      if (user && isRoleMatch(user.role, ROLE_HOD) && departmentId) missingParams.department_id = departmentId;
      const res = await api.get(`${endpointPrefix}/missing`, { params: missingParams });
      const data = res?.data || [];
      list = Array.isArray(data) ? data : (data.data || []);
    } catch (e) {
      try {
        const missingParams2 = { date: selectedDate };
        if (user && isRoleMatch(user.role, ROLE_HOD) && departmentId) missingParams2.department_id = departmentId;
        const res2 = await api.get(`${endpointPrefix}/missing_logs`, { params: missingParams2 });
        const data2 = res2?.data || [];
        list = Array.isArray(data2) ? data2 : (data2.data || []);
      } catch (err) {
        reportError(err, { source: 'DailyData:missingEndpoints' });
        list = [];
        endpointsFailed = true;
      }
    }

    // If the project provides a specific missing-log URL via env,
    const missingUrl = import.meta.env.VITE_BIOMETRIC_MISSING_URL;
    if ((!list || list.length === 0) && missingUrl) {
      try {
        const resp = await fetch(`${missingUrl}${missingUrl.includes('?') ? '&' : '?'}date=${encodeURIComponent(selectedDate)}`, { credentials: 'include' });
        if (resp.ok) {
          const json = await resp.json();
          const arr = Array.isArray(json) ? json : (json.data || []);
          if (arr && arr.length > 0) list = arr;
        }
      } catch (e) {
        // Optional extra source; the fallback below still runs
        reportError(e, { source: 'DailyData:missingEnvUrl' });
      }
    }

    // If API returned nothing, try to compute missing list client-side using available server APIs
    if ((!list || list.length === 0)) {
      try {
        // Get daily biometric combinedData (employees who have logs)
        const dailyParams = { date: selectedDate };
        if (user && isRoleMatch(user.role, ROLE_HOD) && departmentId) dailyParams.department_id = departmentId;
        const dailyResp = await api.get(`${endpointPrefix}/daily`, { params: dailyParams });
        const dailyData = dailyResp?.data || {};
        const combined = Array.isArray(dailyData.combinedData) ? dailyData.combinedData : (dailyData.data && Array.isArray(dailyData.data.combinedData) ? dailyData.data.combinedData : []);

        // Get staff list from server
        const staffResp = await api.get('/staff');
        const staffRows = (staffResp?.data && staffResp.data.data) ? staffResp.data.data : (Array.isArray(staffResp?.data) ? staffResp.data : []);

        const presentCodes = new Set((combined || []).map(c => String(c.EmployeeCode).trim()));

        const resolveDept = (s) => {
          if (!s) return '';
          if (s.dept_shortname) return s.dept_shortname;
          if (s.deptName) return s.deptName;
          if (s.DepartmentName) return s.DepartmentName;
          if (s.department_name) return s.department_name;
          // Prefer activedepartments first (first item = most recent/active)
          if (Array.isArray(s.activedepartments) && s.activedepartments.length) {
            const d = s.activedepartments[0];
            return d?.dept_shortname || d?.dept_name || '';
          }
          // Fallback to departments array: pick one active or first
          if (Array.isArray(s.departments) && s.departments.length) {
            const active = s.departments.find(dd => dd.status === 'active') || s.departments[0];
            return active?.dept_shortname || active?.dept_name || '';
          }
          return '';
        };

        const missingFromStaff = (staffRows || []).filter(s => {
          const code = String(s.employeecode || s.EmployeeCode || s.EmployeeCode || '').trim();
          return code && !presentCodes.has(code);
        }).map(s => ({
          EmployeeCode: String(s.employeecode || s.EmployeeCode || s.EmployeeCode || '').trim(),
          full_name: s.fname ? `${s.fname} ${s.mname || ''} ${s.lname || ''}`.trim() : (s.full_name || `${s.fname || ''} ${s.lname || ''}`.trim()),
          dept_shortname: resolveDept(s),
          leave_staff_applications: s.leave_staff_applications || []
        }));

        if (missingFromStaff.length > 0) list = missingFromStaff;
        else if (Array.isArray(attendance) && attendance.length > 0) {
          // final fallback: derive missing from attendance rows (rows without entryLogs)
          list = attendance
            .filter(r => !r.entryLogs)
            .map(r => ({
              EmployeeCode: String(r.EmployeeCode || r.employeeCode || r.EmployeeCode || '').trim(),
              full_name: r.EmployeeName || r.full_name || r.employeeName || '',
              dept_shortname: r.DepartmentName || r.department || '',
              leave_staff_applications: []
            }));
        }
      } catch (e) {
        reportError(e, { source: 'DailyData:missingFallback' });
        fallbackFailed = true;
      }
    }

    const finalList = list || [];
    const failed = endpointsFailed && fallbackFailed;
    if (updateState) {
      setMissingList(finalList);
      setMissingError(failed ? 'The missing biometric list could not be loaded. Please try again.' : '');
    }
    return { list: finalList, failed };
  };

  const openMissingModal = async () => {
    setShowMissingModal(true);
    setMissingLoading(true);
    try {
      await fetchMissingForDate(date);
    } finally {
      setMissingLoading(false);
    }
  };

  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const exportMissingToExcel = () => {
    try {
      const rows = missingList.map((v, i) => {
        const leaveText = (v.leave_staff_applications && v.leave_staff_applications.length > 0) ? v.leave_staff_applications[0].shortname : 'Missing the Leave';
        return `<tr><td>${i + 1}</td><td>${escapeHtml(v.EmployeeCode)}</td><td>${escapeHtml(v.full_name)}</td><td>${escapeHtml(v.dept_shortname)}</td><td>${escapeHtml(leaveText)}</td></tr>`;
      }).join('');
      // Built as a string, never parsed into the page, so staff names cannot inject markup
      const html = `<table><thead><tr><th>Sl No</th><th>Employee Code</th><th>Full Name</th><th>Department</th><th>Leave</th></tr></thead><tbody>${rows}</tbody></table>`;
      const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `missing_Bio_data_${date}.xls`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 0);
    } catch (e) {
      reportError(e, { source: 'DailyData:exportMissing' });
      toast.error('Failed to export the missing biometric list.');
    }
  };

  const retryLoad = () => {
    if ((isHod && hodScopeStatus === 'error') || (isStaffRole && staffCodeStatus === 'error')) {
      setScopeRetryKey((k) => k + 1);
    } else {
      setReloadKey((k) => k + 1);
    }
  };

  const filtered = useMemo(() => {
    const scoped = (isStaff && staffEmployeeCode)
      ? attendance.filter(r => {
          const code = String(r.EmployeeCode || r.employeeCode || r.EmployeeCode || '').trim();
          return code && code === String(staffEmployeeCode).trim();
        })
      : attendance;
    const q = search.trim().toLowerCase();
    if (!q) return scoped;
    // Name, employee code and department are each searchable on their own
    return scoped.filter(r => [
      r.EmployeeName, r.full_name, r.employeeName,
      r.EmployeeCode, r.employeeCode, r.employeecode,
      r.DepartmentName, r.department, r.dept_shortname,
    ].some((field) => field != null && String(field).toLowerCase().includes(q)));
  }, [attendance, search, isStaff, staffEmployeeCode]);

  // A new search or a new day's data starts again from page 1
  useEffect(() => { setPage(1); }, [search, attendance]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  const formatDateTime = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${hours}:${minutes} ${ampm}`;
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <Header />
      <div className="flex flex-1 min-h-0">
        <Sidebar />
        <main className="flex-1 overflow-auto p-6">
          <div className="min-h-full rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-semibold text-slate-900">Biometric - Daily Data</h2>
            <div className="mt-6">
              {!isStaff && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-blue-600" viewBox="0 0 24 24" fill="currentColor"><path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"></path></svg>
                    <div>
                      <div className="text-sm text-blue-600">Total In</div>
                      <div className="text-lg font-semibold">{totalIn ?? '—'}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-green-600" viewBox="0 0 24 24" fill="currentColor"><path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"></path></svg>
                    <div>
                      <div className="text-sm text-green-600">Total Out</div>
                      <div className="text-lg font-semibold">{totalOut ?? '—'}</div>
                    </div>
                  </div>
                </div>

                <div></div>

                <div className="md:col-start-3 flex items-center justify-end gap-4">
                  <div className="relative w-full sm:w-72 md:w-80">
                    <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full h-10 px-3 border border-gray-300 rounded-lg" />
                  </div>
                    {/* Re-runs the scoped load above; it used to duplicate the request without HOD/staff scoping */}
                    <button onClick={() => setReloadKey((k) => k + 1)} disabled={loading} className="h-10 inline-flex items-center justify-center px-6 min-w-[140px] bg-blue-600 text-white rounded-lg disabled:opacity-60">Refresh</button>
                </div>
              </div>
              )}

              {/* Chart and Missing button */}
              {!isStaff && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
                <div className="col-span-2 bg-white p-4 rounded shadow">
                  <canvas ref={chartRef} id="biometricChart" />
                </div>
                <div className="col-span-1">
                  <div className="border border-slate-200 rounded-lg bg-white shadow-sm">
                    <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                      <h5 className="text-m font-bold">Overview of Biometric Punch Records</h5>
                      <button onClick={openMissingModal} className="h-10 inline-flex items-center justify-center px-5 min-w-[160px] bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm whitespace-nowrap leading-none">Missing Biometric</button>
                    </div>
                    <div className="p-4">
                      <div className="grid grid-cols-12 gap-x-4">
                        <div className="col-span-12 sm:col-span-6 mb-3">
                          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                            <div className="flex flex-wrap justify-between items-center">
                              <div className="flex-auto">
                                <p className="mb-0 text-blue-600 text-sm">Total Present</p>
                                <div className="flex items-center">
                                  <span className="text-xl font-semibold text-blue-600" id="total_present_value">{totalPresent ?? 0}</span>
                                </div>
                              </div>
                              <div className="ml-3">
                                <span className="avatar avatar-sm inline-flex justify-center items-center rounded-full bg-blue-100 text-blue-600 text-lg">
                                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M14 14.252V16.3414C13.3744 16.1203 12.7013 16 12 16C8.68629 16 6 18.6863 6 22H4C4 17.5817 7.58172 14 12 14C12.6906 14 13.3608 14.0875 14 14.252ZM12 13C8.685 13 6 10.315 6 7C6 3.685 8.685 1 12 1C15.315 1 18 3.685 18 7C18 10.315 15.315 13 12 13ZM12 11C14.21 11 16 9.21 16 7C16 4.79 14.21 3 12 3C9.79 3 8 4.79 8 7C8 9.21 9.79 11 12 11Z"></path></svg>
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="col-span-12 sm:col-span-6 mb-3">
                          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                            <div className="flex flex-wrap justify-between items-center">
                              <div className="flex-auto">
                                <p className="mb-0 text-amber-600 text-sm">Total On Leave</p>
                                <div className="flex items-center">
                                  <span className="text-xl font-semibold text-amber-600" id="total_leave_value">{totalLeave ?? '—'}</span>
                                </div>
                              </div>
                              <div className="ml-3">
                                <span className="avatar avatar-sm inline-flex justify-center items-center rounded-full bg-amber-100 text-amber-600 text-lg">
                                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M14 14.252V16.3414C13.3744 16.1203 12.7013 16 12 16C8.68629 16 6 18.6863 6 22H4C4 17.5817 7.58172 14 12 14C12.6906 14 13.3608 14.0875 14 14.252ZM12 13C8.685 13 6 10.315 6 7C6 3.685 8.685 1 12 1C15.315 1 18 3.685 18 7C18 10.315 15.315 13 12 13ZM12 11C14.21 11 16 9.21 16 7C16 4.79 14.21 3 12 3C9.79 3 8 4.79 8 7C8 9.21 9.79 11 12 11Z"></path></svg>
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="col-span-12 sm:col-span-6 mb-3">
                          <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                            <div className="flex flex-wrap justify-between items-center">
                              <div className="flex-auto" >
                                <p className="mb-0 text-red-500 text-sm">Biometric Punch Missing</p>
                                <div className="flex items-center">
                                  <p className="mb-1 text-sm text-red-600 font-semibold" id="total_missing_value">{totalMissing ?? '—'}</p>
                                </div>
                              </div>
                              <div className="ml-3">
                                <span className="avatar avatar-sm inline-flex justify-center items-center rounded-full bg-amber-100 text-red-600 text-lg">
                                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M14 14.252V16.3414C13.3744 16.1203 12.7013 16 12 16C8.68629 16 6 18.6863 6 22H4C4 17.5817 7.58172 14 12 14C12.6906 14 13.3608 14.0875 14 14.252ZM12 13C8.685 13 6 10.315 6 7C6 3.685 8.685 1 12 1C15.315 1 18 3.685 18 7C18 10.315 15.315 13 12 13ZM12 11C14.21 11 16 9.21 16 7C16 4.79 14.21 3 12 3C9.79 3 8 4.79 8 7C8 9.21 9.79 11 12 11Z"></path></svg>
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              )}

              {!isStaff && (
                <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <SearchInput value={search} onChange={setSearch} placeholder="Search by name, code or department" />
                  {!loading && !loadError && (
                    <div className="text-sm text-gray-600">
                      {search.trim() ? `${filtered.length} of ${attendance.length} employees` : `${attendance.length} employees`}
                    </div>
                  )}
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-blue-600">
                    <tr className="text-left text-xs font-semibold text-slate-600 border-b">
                      <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Sl.No</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Employee</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Department</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">PunchIn</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">DeviceIn</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">PunchOut</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">DeviceOut</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">No.of.Punches</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Duration</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan={10} className="p-6 text-center">Loading...</td></tr>
                    ) : loadError ? (
                      <tr><td colSpan={10} className="p-4"><LoadError message={loadError} onRetry={retryLoad} /></td></tr>
                    ) : paginated.length === 0 ? (
                      <tr><td colSpan={10} className="p-6 text-center">
                        {search.trim() && attendance.length > 0
                          ? <>No employees match "{search.trim()}". <button type="button" onClick={() => setSearch('')} className="text-blue-600 underline">Clear search</button></>
                          : 'No attendance data available'}
                      </td></tr>
                    ) : (
                      paginated.map((row, idx) => {
                        const entry = row.entryLogs || row.entryLog || row.entry || null;
                        const exit = row.exitLogs || row.exitLog || row.exit || null;
                        const punches = row.employeePunchLogs || row.punches || [];
                        return (
                          <tr key={idx} className="border-b">
                            <td className="px-3 py-2 align-middle">{(page - 1) * PAGE_SIZE + idx + 1}</td>
                            <td className="px-3 py-2 align-middle">{row.EmployeeName || row.employeeName || row.full_name || row.EmployeeCode}</td>
                            <td className="px-3 py-2 align-middle">{row.DepartmentName || row.department || ''}</td>
                            <td className="px-3 py-2 align-middle text-green-600">{formatDateTime(entry?.LogDate_Time || entry?.LogDate || entry?.logDate || '')}</td>
                            <td className="px-3 py-2 align-middle">{entry?.DeviceFName || entry?.DeviceName || ''}</td>
                            <td className="px-3 py-2 align-middle text-red-600">{formatDateTime(exit?.LogDate_Time || exit?.LogDate || '')}</td>
                            <td className="px-3 py-2 align-middle">{exit?.DeviceFName || exit?.DeviceName || ''}</td>
                            <td className="px-3 py-2 align-middle">{row.punchCounts || row.punchCount || (Array.isArray(punches) ? punches.length : '')}</td>
                            <td className="px-3 py-2 align-middle">{row.durations || row.duration || ''}</td>
                            <td className="px-3 py-2 align-middle">
                              <button onClick={() => setSelectedPunches({
                                punches,
                                employee: row.EmployeeName || row.full_name || row.employeeName || row.EmployeeCode,
                                EmployeeCode: row.EmployeeCode || row.employeeCode || '',
                                department: row.DepartmentName || row.department || '',
                                punchCount: row.punchCounts || row.punchCount || (Array.isArray(punches) ? punches.length : 0),
                                duration: row.durations || row.duration || '',
                                entry: entry || null,
                                exit: exit || null,
                              })} className="p-2 text-blue-600 transition-colors duration-200 bg-white rounded-lg hover:bg-blue-100 border border-blue-300">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Missing biometric modal */}
              {showMissingModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                  <div className="bg-white rounded-lg max-w-3xl w-full p-4">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="font-semibold">Biometric Entry not found / On leave for <span className="text-red-500">{date}</span></h4>
                      <div className="flex items-center gap-2">
                        <button onClick={() => { exportMissingToExcel(); }} disabled={missingLoading || Boolean(missingError) || missingList.length === 0} className="text-sm bg-green-600 text-white px-2 py-1 rounded disabled:opacity-50">Export</button>
                        <button onClick={() => setShowMissingModal(false)} className="text-sm bg-gray-100 text-gray-800 px-2 py-1 rounded">Close</button>
                      </div>
                    </div>
                    <div className="overflow-auto max-h-80">
                     <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-blue-600">
                          <tr>
                            <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">S.NO</th>
                            <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Employee Code</th>
                            <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Name</th>
                            <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Department</th>
                            <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Leave</th>
                          </tr>
                        </thead>
                        <tbody>
                          {missingLoading ? (
                            <tr><td colSpan={5} className="p-4 text-center text-gray-500">Loading...</td></tr>
                          ) : missingError ? (
                            <tr><td colSpan={5} className="p-4"><LoadError message={missingError} onRetry={openMissingModal} /></td></tr>
                          ) : missingList.length === 0 ? (
                            <tr><td colSpan={5} className="p-4 text-center text-red-600">No Missing Biometric Logs</td></tr>
                          ) : missingList.map((v, i) => (
                            <tr key={i} className={(v.leave_staff_applications && v.leave_staff_applications.length > 0) ? 'bg-yellow-50' : 'bg-red-50'}>
                              <td className="px-4 py-2">{i+1}</td>
                              <td className="px-4 py-2">{v.EmployeeCode}</td>
                              <td className="px-4 py-2">{v.full_name}</td>
                              <td className="px-4 py-2">{v.dept_shortname}</td>
                              <td className="px-4 py-2">{(v.leave_staff_applications && v.leave_staff_applications.length>0) ? v.leave_staff_applications[0].shortname : 'Missing the Leave'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Selected punches modal */}
              {selectedPunches && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                  <div className="bg-white rounded-lg max-w-2xl w-full p-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
                      <div>
                        <h4 className="font-semibold">Log Details - <span className="text-blue-600">{selectedPunches.employee}</span></h4>
                        <div className="text-sm text-gray-500 mt-1 flex flex-wrap gap-3">
                          <span>Code: {selectedPunches.EmployeeCode || '-'}</span>
                          <span>Dept: {selectedPunches.department || '-'}</span>
                          <span>Punches: {selectedPunches.punchCount ?? '-'}</span>
                          <span>Duration: {selectedPunches.duration || '-'}</span>
                          <span>Entry: {formatDateTime(selectedPunches.entry?.LogDate || selectedPunches.entry?.LogDate_Time || selectedPunches.entry?.logDate || '')}</span>
                          <span>Exit: {formatDateTime(selectedPunches.exit?.LogDate || selectedPunches.exit?.LogDate_Time || selectedPunches.exit?.logDate || '')}</span>
                        </div>
                      </div>
                      <button onClick={() => setSelectedPunches(null)} className="text-slate-600 mt-2 sm:mt-0">Close</button>
                    </div>
                    <div className="overflow-auto max-h-80">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-blue-600">
                          <tr className="text-left text-xs font-semibold text-slate-600 border-b">
                            <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Log Time</th>
                            <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Log Device</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Array.isArray(selectedPunches.punches) && selectedPunches.punches.length > 0 ? (
                            selectedPunches.punches.map((p, i) => (
                              <tr key={i} className="border-b">
                                <td className="px-3 py-2">{formatDateTime(p.LogDate || p.LogDate_Time || p.LogDateTime || p.logDate || p.LogDate_String)}</td>
                                <td className="px-3 py-2">{p.DeviceFName || p.DeviceName || p.DeviceF || ''}</td>
                              </tr>
                            ))
                          ) : (
                            <tr><td colSpan={2} className="p-4 text-center">No punch records available</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

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
