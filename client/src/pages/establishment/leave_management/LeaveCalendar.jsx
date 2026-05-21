import { useCallback, useEffect, useMemo, useState } from 'react';
import Notification from '../../../components/common/Notification';
import Header from '../../../components/layout/Header';
import Sidebar from '../../../components/layout/Sidebar';
import { useAuth } from '../../../context/AuthContext';
import axios from '../../../api/axios';
import { getHolidayRHList } from '../../../api/holidayrhApi';

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

function toDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function extractDateKey(value) {
  if (!value) return null;
  const raw = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return toDateStr(parsed);
}

function formatDate(value) {
  if (!value) return '-';
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-');
    const monthIndex = Number(month) - 1;
    if (monthIndex < 0 || monthIndex > 11) return '-';
    return `${day}-${monthNames[monthIndex]}-${year}`;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  const day = String(date.getDate()).padStart(2, '0');
  const month = monthNames[date.getMonth()];
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

function getApplicationDate(row) {
  return row?.application_date || row?.applied_on || row?.applied_at || row?.appliedDate || row?.applicationDate || row?.created_at || row?.createdAt || '';
}

function getStaffName(row) {
  if (!row) return '-';
  if (row.staff_name) return row.staff_name;
  if (row.staffName) return row.staffName;
  const parts = [row.fname, row.mname, row.lname].filter(Boolean);
  if (parts.length) return parts.join(' ');
  if (row.name) return row.name;
  if (row.full_name) return row.full_name;
  return '-';
}

function getAlternateName(row) {
  if (!row) return '-';
  return row.alternate_staff || row.alternate_staff_name || row.alternateName || row.alternate || row.additional_alternate_staff || row.additional_alternate || '-';
}

function isFirstOrThirdSaturday(date) {
  if (date.getDay() !== 6) return false;
  const day = date.getDate();
  const nth = Math.ceil(day / 7);
  return nth === 1 || nth === 3;
}

function getStatusClass(status) {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'pending') return 'bg-gray-500 text-white';
  if (normalized === 'recommended') return 'bg-yellow-500 text-white';
  if (normalized === 'approved') return 'bg-green-500 text-white';
  if (normalized === 'rejected') return 'bg-red-500 text-white';
  if (normalized === 'cancelled') return 'bg-red-500 text-white';
  return 'bg-gray-400 text-white';
}

function buildCalendarGrid(year, month) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const grid = [];
  let day = 1 - firstDay;
  for (let row = 0; row < 6; row++) {
    const week = [];
    for (let col = 0; col < 7; col++, day++) {
      if (day < 1 || day > daysInMonth) week.push(null);
      else week.push(new Date(year, month, day));
    }
    grid.push(week);
    if (day > daysInMonth) break;
  }
  return grid;
}

function Calendar({ year, month, onYearChange, onMonthChange, holidayMap, rhMap, leaveMap, availableYears, onDateClick }) {
  const today = toDateStr(new Date());
  const grid = useMemo(() => buildCalendarGrid(year, month), [year, month]);

  const getDayStyle = (date) => {
    if (!date) return '';
    const key = toDateStr(date);
    const dow = date.getDay();
    if (holidayMap[key]) return 'bg-red-100 text-red-800 font-medium';
    if (rhMap[key]) return 'bg-yellow-100 text-yellow-800 font-medium';
    if (isFirstOrThirdSaturday(date)) return 'bg-orange-100 text-orange-800 font-medium';
    if (dow === 0) return 'bg-slate-100 text-slate-400';
    return 'text-slate-700';
  };

  const years = Array.isArray(availableYears) && availableYears.length
    ? availableYears
    : Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 1 + i);

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-2 sm:px-4 py-2.5 sm:py-3 bg-slate-50 border-b border-slate-200">
        <button onClick={() => { const d = new Date(year, month - 1, 1); onYearChange(d.getFullYear()); onMonthChange(d.getMonth()); }} className="p-1 rounded hover:bg-slate-200 text-slate-600">&#8249;</button>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <select value={month} onChange={(e) => onMonthChange(Number(e.target.value))} className="text-xs sm:text-sm font-semibold bg-transparent border-none outline-none cursor-pointer text-slate-800">
            {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
          </select>
          <select value={year} onChange={(e) => onYearChange(Number(e.target.value))} className="text-xs sm:text-sm font-semibold bg-transparent border-none outline-none cursor-pointer text-slate-800">
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        <button onClick={() => { const d = new Date(year, month + 1, 1); onYearChange(d.getFullYear()); onMonthChange(d.getMonth()); }} className="p-1 rounded hover:bg-slate-200 text-slate-600">&#8250;</button>
      </div>

      <div className="grid grid-cols-7 border-b border-slate-100">
        {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d) => (
          <div key={d} className="py-1.5 sm:py-2 text-center text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wide">{d}</div>
        ))}
      </div>

          <div className="divide-y divide-slate-100">
        {grid.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7">
            {week.map((date, di) => {
              if (!date) return <div key={di} className="h-20 sm:h-24 bg-slate-50/50" />;

              const key = toDateStr(date);
              const isToday = key === today;
              const holidayTitle = holidayMap[key];
              const rhTitle = rhMap[key];
              const dayLeaves = Array.isArray(leaveMap?.[key]) ? leaveMap[key] : (leaveMap?.[key] ? [leaveMap[key]] : []);
              const isFTS = isFirstOrThirdSaturday(date);
              const isSun = date.getDay() === 0;

              const firstApp = dayLeaves[0] || null;
              const statusTextClass = firstApp
                ? (String(firstApp.appl_status || firstApp.status || '').toLowerCase() === 'approved' ? 'text-green-700' : String(firstApp.appl_status || firstApp.status || '').toLowerCase() === 'rejected' ? 'text-red-500 line-through' : 'text-indigo-700')
                : '';

              return (
                <div
                  key={di}
                  className={`h-20 sm:h-24 p-1 border-l border-slate-100 first:border-l-0 flex flex-col cursor-pointer hover:ring-1 hover:ring-blue-300 ${getDayStyle(date)}`}
                  onClick={(e) => {
                    // If clicking on the Leave List box, do nothing here (handled below)
                    if (e.target.classList.contains('leave-list-box')) return;
                    // Otherwise, open apply modal
                    onDateClick?.(key, null);
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <span className={`self-end text-[10px] sm:text-xs w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center rounded-full font-medium ${isToday ? 'bg-blue-600 text-white' : ''}`}>{date.getDate()}</span>
                  {holidayTitle && <span className="text-[9px] sm:text-[10px] leading-tight mt-auto line-clamp-2 text-red-700">{holidayTitle}</span>}
                  {rhTitle && <span className="text-[9px] sm:text-[10px] leading-tight mt-auto line-clamp-2 text-yellow-700">{rhTitle}</span>}
                  {isFTS && !holidayTitle && !rhTitle && <span className="text-[9px] sm:text-[10px] leading-tight mt-auto text-orange-600">{Math.ceil(date.getDate() / 7) === 1 ? '1st Sat' : '3rd Sat'}</span>}
                  {isSun && !holidayTitle && !rhTitle && !dayLeaves.length && <span className="text-[10px] leading-tight mt-auto text-slate-400">Sunday</span>}
                  {dayLeaves.length > 0 && (
                    <span
                      className="leave-list-box mt-auto px-1 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] sm:text-[11px] font-semibold border border-blue-300 cursor-pointer"
                      style={{ display: 'inline-block', minWidth: 0 }}
                      title="View/Edit/Cancel Leaves"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDateClick?.(key, { app: dayLeaves[0], status: dayLeaves[0].appl_status || dayLeaves[0].status });
                      }}
                      role="button"
                      tabIndex={0}
                    >
                      Leave List
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-4 px-4 py-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-600">
        <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-sm bg-red-200 border border-red-300" />Holiday</span>
        <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-sm bg-yellow-200 border border-yellow-300" />Restricted Holiday (RH)</span>
        <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-sm bg-orange-200 border border-orange-300" />1st &amp; 3rd Saturday</span>
        <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-sm bg-blue-600" />Today</span>
      </div>
    </div>
  );
}

export default function EstablishmentLeaveCalendarPage() {
  const { user, token } = useAuth?.() || {};
  const today = new Date();
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());

  const [holidays, setHolidays] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [leaveTypeOptions, setLeaveTypeOptions] = useState([]);
  const [masterLeaveTypeOptions, setMasterLeaveTypeOptions] = useState([]);
  const [applications, setApplications] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [alternateOptions, setAlternateOptions] = useState([]);
  const [isApplyOpen, setIsApplyOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [viewDate, setViewDate] = useState(null);
  const [activeTab, setActiveTab] = useState(null);
  const [viewApps, setViewApps] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [editingApplicationId, setEditingApplicationId] = useState(null);
  const [form, setForm] = useState({
    staff_id: '',
    leave_id: '',
    cl_type: 'Full',
    start_date: '',
    end_date: '',
    reason: '',
    alternate: '',
    additional_alternate: '',
    no_of_days: null,
  });
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });

  const loadMeta = useCallback(async () => {
    try {
      const [metaResp, leavesResp] = await Promise.all([
        axios.get('/leave-calendar/meta', { headers: token ? { Authorization: `Bearer ${token}` } : {} }),
        axios.get('/leaves', { headers: token ? { Authorization: `Bearer ${token}` } : {} }),
      ]);
      setLeaveTypes(leavesResp.data?.data || metaResp.data?.data?.leaves || []);
      // normalize leave type options similar to LeaveApplication.jsx
      const metaLeaveTypes = Array.isArray(metaResp?.data?.data?.leave_types) ? metaResp.data.data.leave_types : [];
      const normalizedMeta = metaLeaveTypes.map((it) => String(it?.shortname || it?.short_name || it?.title || '').trim()).filter(Boolean);
      setLeaveTypeOptions(normalizedMeta);
      const masterLeaves = Array.isArray(leavesResp?.data?.data) ? leavesResp.data.data : [];
      const normalizedMaster = masterLeaves.map((it) => String(it?.shortname || it?.short_name || it?.title || '').trim()).filter(Boolean);
      setMasterLeaveTypeOptions(normalizedMaster);
      const holidayRows = metaResp.data?.data?.holidayYears ? [] : [];
    } catch (err) {
      // ignore, leaveTypes/holidays fallback handled elsewhere
    }
  }, [token]);

  const loadHolidays = useCallback(async () => {
    try {
      const r = await getHolidayRHList(token);
      let rows = Array.isArray(r?.data) ? r.data : r?.data?.data || r?.data?.rows || [];
      if (!rows.length) {
        const fallback = await axios.get('/holidayrhs', { headers: token ? { Authorization: `Bearer ${token}` } : {} });
        rows = fallback?.data?.data || [];
      }
      setHolidays(rows);
    } catch (err) {
      setHolidays([]);
    }
  }, [token]);

  // load staff list for establishment to apply on behalf of staff
  useEffect(() => {
    let mounted = true;
    axios.get('/staff', { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then((r) => { if (!mounted) return; setStaffList(r.data?.data || []); })
      .catch(() => { if (!mounted) return; setStaffList([]); });
    return () => { mounted = false; };
  }, [token]);

  useEffect(() => {
    // fetch alternate options when staff selected
    if (!form.staff_id) { setAlternateOptions([]); return; }
    // The API model expects user_id (not staff.id). Look up the selected staff's user_id from staffList.
    const selectedStaff = staffList.find((s) => String(s.id) === String(form.staff_id));
    const userIdToSend = selectedStaff?.user_id || form.staff_id;
    axios.get('/leave-calendar/alternate-staff', { params: { staff_id: userIdToSend, employee_type: '' }, headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then((r) => setAlternateOptions(r.data?.data || []))
      .catch(() => setAlternateOptions([]));
  }, [form.staff_id, token, staffList]);

  // compute no_of_days
  useEffect(() => {
    if (!form.start_date || !form.end_date) { setForm((f) => ({ ...f, no_of_days: null })); return; }
    const s = new Date(form.start_date);
    const e = new Date(form.end_date);
    if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime()) || e < s) { setForm((f) => ({ ...f, no_of_days: null })); return; }
    let days = Math.floor((e - s) / 86400000) + 1;
    if (days === 1 && form.cl_type !== 'Full') days = 0.5;
    setForm((f) => ({ ...f, no_of_days: days }));
  }, [form.start_date, form.end_date, form.cl_type]);

  const selectedLeaveType = useMemo(() => {
    if (!form.leave_id) return null;
    return leaveTypes.find((l) => String(l.id) === String(form.leave_id)) || null;
  }, [leaveTypes, form.leave_id]);

  const isSingleDayCL = useMemo(() => {
    if (!selectedLeaveType || !form.start_date || !form.end_date) return false;
    const shortName = String(selectedLeaveType.shortname || selectedLeaveType.short_name || '').trim().toUpperCase();
    return shortName === 'CL' && form.start_date === form.end_date;
  }, [selectedLeaveType, form.start_date, form.end_date]);

  useEffect(() => {
    if (!isSingleDayCL && form.cl_type !== 'Full') {
      setForm((currentForm) => ({ ...currentForm, cl_type: 'Full' }));
    }
  }, [isSingleDayCL, form.cl_type]);

  const openApplyModal = (dateKey = null) => {
    if (dateKey) {
      setForm((f) => ({ ...f, start_date: dateKey, end_date: dateKey }));
    }
    setEditingApplicationId(null);
    setIsApplyOpen(true);
  };

  const closeApplyModal = () => {
    setIsApplyOpen(false);
    setForm({ staff_id: '', leave_id: '', cl_type: 'Full', start_date: '', end_date: '', reason: '', alternate: '', additional_alternate: '', no_of_days: null });
    setEditingApplicationId(null);
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setSubmitting(true);
    try {
      // The server expects snake_case form fields (staff_id, leave_id, start_date, end_date, reason)
      const selectedStaff = staffList.find((s) => String(s.id) === String(form.staff_id));
      // resolve staff.user_id to pass as staff_id (server.resolveStaffIdFromUserId expects a user id)
      const staffUserId = selectedStaff?.user_id || form.staff_id;
      const payload = {
        staff_id: Number(staffUserId) || null,
        leave_id: Number(form.leave_id) || null,
        cl_type: form.cl_type,
        start_date: form.start_date,
        end_date: form.end_date,
        reason: form.reason,
        alternate: form.alternate || null,
        additional_alternate: form.additional_alternate || null,
        no_of_days: form.no_of_days || null,
      };
      if (editingApplicationId) {
        await axios.patch(`/leave-calendar/applications/${editingApplicationId}`, payload, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
        setNotification({ show: true, message: 'Leave application updated', type: 'success' });
      } else {
        await axios.post('/leave-calendar/applications', payload, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
        setNotification({ show: true, message: 'Leave applied', type: 'success' });
      }
      closeApplyModal();
      setEditingApplicationId(null);
      loadEvents(calYear, calMonth + 1);
    } catch (err) {
      setNotification({ show: true, message: err?.response?.data?.message || 'Failed to apply leave', type: 'error' });
    } finally { setSubmitting(false); }
  };

  const loadEvents = useCallback(async (year, month) => {
    try {
      const r = await axios.get('/leave-calendar/events', {
        params: { year: Number(year), month: Number(month) },
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      setApplications(r.data?.data || []);
    } catch (err) {
      setApplications([]);
      setNotification({ show: true, message: 'Failed to load leave events', type: 'error' });
    }
  }, [token]);

  useEffect(() => { loadMeta(); loadHolidays(); }, [loadMeta, loadHolidays]);

  useEffect(() => { loadEvents(calYear, calMonth + 1); }, [calYear, calMonth, loadEvents]);

  const holidayMap = useMemo(() => {
    const map = {};
    holidays.filter((h) => String((h.type || '')).toLowerCase().includes('holiday')).forEach((h) => {
      const key = extractDateKey(h.start || h.date || h.start_date);
      if (key) map[key] = h.title || h.name || '';
    });
    return map;
  }, [holidays]);

  const rhMap = useMemo(() => {
    const map = {};
    holidays.filter((h) => {
      const t = String(h.type || '').toLowerCase();
      return t === 'rh' || t === 'hr' || t.includes('restricted');
    }).forEach((h) => {
      const key = extractDateKey(h.start || h.date || h.start_date);
      if (key) map[key] = h.title || h.name || '';
    });
    return map;
  }, [holidays]);

  const leaveMap = useMemo(() => {
    const map = {};
    for (const app of applications) {
      const status = String(app.appl_status || app.status || '').toLowerCase();
      const start = extractDateKey(app.start_date || app.start);
      const end = extractDateKey(app.end_date || app.end);
      if (!start || !end) continue;
      const cur = new Date(start);
      const last = new Date(end);
      while (cur <= last) {
        const key = toDateStr(cur);
        if (!map[key]) {
          map[key] = {
            shortname: app.leave_shortname || app.shortname || '?',
            longname: app.leave_longname || app.longname || '',
            status,
            appId: app.id || null,
            app,
          };
        }
        cur.setDate(cur.getDate() + 1);
      }
    }
    return map;
  }, [applications]);

  // map each date string to array of applications that include that date
  const dateAppsMap = useMemo(() => {
    const map = {};
    for (const app of applications) {
      const status = String(app.appl_status || app.status || '').toLowerCase();
      const start = extractDateKey(app.start_date || app.start);
      const end = extractDateKey(app.end_date || app.end);
      if (!start || !end) continue;
      const cur = new Date(start);
      const last = new Date(end);
      while (cur <= last) {
        const key = toDateStr(cur);
        if (!map[key]) map[key] = [];
        map[key].push(app);
        cur.setDate(cur.getDate() + 1);
      }
    }
    return map;
  }, [applications]);

  const modalLeaveTypeKeys = useMemo(() => {
    const rows = (viewApps && viewApps.length) ? viewApps : (viewDate ? (dateAppsMap[viewDate] || []) : []);
    const fromRows = Array.from(new Set(rows.map((r) => String(r.leave_shortname || r.shortname || r.title || 'Other'))));
    const fromMeta = Array.isArray(leaveTypeOptions) ? leaveTypeOptions : [];
    const fromMaster = Array.isArray(masterLeaveTypeOptions) ? masterLeaveTypeOptions : [];
    const keys = [...new Set([...fromMaster, ...fromMeta, ...fromRows])];
    return keys;
  }, [viewDate, dateAppsMap, viewApps, leaveTypeOptions, masterLeaveTypeOptions]);

  useEffect(() => {
    if (!modalLeaveTypeKeys || modalLeaveTypeKeys.length === 0) {
      setActiveTab(null);
      return;
    }
    if (!activeTab || !modalLeaveTypeKeys.includes(activeTab)) {
      if (modalLeaveTypeKeys.includes('CL')) setActiveTab('CL');
      else setActiveTab(modalLeaveTypeKeys[0]);
    }
  }, [modalLeaveTypeKeys]);

  const groupedRows = useMemo(() => {
    const rows = viewApps && viewApps.length ? viewApps : (viewDate ? (dateAppsMap[viewDate] || []) : []);
    const map = {};
    for (const k of modalLeaveTypeKeys) {
      if (!map[k]) map[k] = [];
    }
    for (const r of rows) {
      const key = r.leave_shortname || r.shortname || 'Other';
      if (!map[key]) map[key] = [];
      map[key].push(r);
    }
    return map;
  }, [viewApps, viewDate, dateAppsMap, modalLeaveTypeKeys]);

  const onDateClick = (dateKey, entry) => {
    if (!entry) {
      setNotification({ show: true, message: `${dateKey}: no leave`, type: 'info' });
      return;
    }
    // open view modal for the date
    // prefer full list from dateAppsMap; fallback to single entry.app
    const appsForDate = dateAppsMap[dateKey] || (entry && entry.app ? [entry.app] : []);
    // fetch full application details (to get alternate and other fields) and enrich with staff names
    const fetchDetailed = async () => {
      try {
        const promises = appsForDate.map((a) => {
          const id = Number(a.id || a.appId || a.application_id || a.applicationId || a.id);
          if (!id) return Promise.resolve(a);
          return axios.get(`/leave-calendar/applications/${id}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
            .then((r) => r.data?.data || r.data || a)
            .catch(() => a);
        });
        const detailed = await Promise.all(promises);
        // enrich with staff/alternate names from staffList
        const enriched = detailed.map((d) => {
          const staffId = d.staff_id || d.staffId || d.staffId;
          const alternateId = d.alternate || d.alternate_staff || d.additional_alternate;
          const staff = staffList.find((s) => Number(s.id) === Number(staffId));
          const alt = staffList.find((s) => Number(s.id) === Number(alternateId));
          return {
            ...d,
            staff_name: d.staff_name || (staff ? [staff.fname, staff.mname, staff.lname].filter(Boolean).join(' ') : d.staff_name),
            alternate_staff: d.alternate_staff || (alt ? [alt.fname, alt.mname, alt.lname].filter(Boolean).join(' ') : d.alternate_staff),
          };
        });
        setViewApps(enriched);
        setViewDate(dateKey);
        setActiveTab(null);
        setIsViewOpen(true);
      } catch (err) {
        // fallback to using raw apps
        setViewApps(appsForDate);
        setViewDate(dateKey);
        setActiveTab(null);
        setIsViewOpen(true);
      }
    };

    fetchDetailed();
  };

  const handleEditFromView = (app) => {
    if (!app) return;
    setEditingApplicationId(app.id || null);
    setForm((prev) => ({
      ...prev,
      staff_id: app.staff_id || app.staffId || app.staff || prev.staff_id || '',
      leave_id: app.leave_id || app.leaveId || '',
      start_date: extractDateKey(app.start_date || app.start) || '',
      end_date: extractDateKey(app.end_date || app.end) || '',
      cl_type: app.cl_type || app.clType || 'Full',
      reason: app.reason || '',
      alternate: app.alternate || app.alternate_staff || '',
      additional_alternate: app.additional_alternate || '',
    }));
    setIsViewOpen(false);
    setIsApplyOpen(true);
  };

  const handleCancelApplication = async (appId) => {
    if (!appId) return;
    if (!window.confirm('Are you sure you want to cancel this leave application?')) return;
    try {
      await axios.post(`/leave-calendar/applications/${appId}/cancel`, null, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      setNotification({ show: true, message: 'Leave application cancelled', type: 'success' });
      setIsViewOpen(false);
      setViewDate(null);
      setViewApps([]);
      // reload events
      loadEvents(calYear, calMonth + 1);
    } catch (err) {
      setNotification({ show: true, message: err?.response?.data?.message || 'Failed to cancel application', type: 'error' });
    }
  };

  const closeNotification = () => setNotification((n) => ({ ...n, show: false }));

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="p-4 w-full">
          <h1 className="text-xl font-semibold mb-4">Establishment — Leave Calendar</h1>
          <Calendar
            year={calYear}
            month={calMonth}
            onYearChange={setCalYear}
            onMonthChange={setCalMonth}
            holidayMap={holidayMap}
            rhMap={rhMap}
            leaveMap={dateAppsMap}
            availableYears={[]}
            onDateClick={(dateKey, entry) => {
              // open apply modal when clicking empty date
              if (!entry) openApplyModal(dateKey);
              else onDateClick(dateKey, entry);
            }}
          />

          {/* Apply Leave Modal */}
          {isApplyOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
              <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl p-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">Apply leave</h2>
                  <button onClick={closeApplyModal} className="text-gray-600 hover:text-gray-900">✕</button>
                </div>
                <form onSubmit={handleSubmit}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium">Apply Leave for :( staff )<span className="text-red-500">*</span></label>
                      <select className="mt-1 block w-full border rounded p-2" value={form.staff_id} onChange={(e) => setForm((f) => ({ ...f, staff_id: e.target.value }))} required>
                        <option value="">Choose a staff</option>
                        {staffList.map((s) => (<option key={s.id} value={s.id}>{[s.fname, s.mname, s.lname].filter(Boolean).join(' ')}</option>))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium">Leave Type:<span className="text-red-500">*</span></label>
                      <select className="mt-1 block w-full border rounded p-2" value={form.leave_id} onChange={(e) => setForm((f) => ({ ...f, leave_id: e.target.value }))} required>
                        <option value="">Choose Leave Type</option>
                        {leaveTypes.map((l) => (<option key={l.id} value={l.id}>{l.longname || l.shortname}</option>))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium">From Date:<span className="text-red-500">*</span></label>
                      <input type="date" className="mt-1 block w-full border rounded p-2" value={form.start_date} onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))} required />
                    </div>
                    <div>
                      <label className="block text-sm font-medium">TO Date:<span className="text-red-500">*</span></label>
                      <input type="date" className="mt-1 block w-full border rounded p-2" value={form.end_date} onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))} required />
                    </div>

                    {isSingleDayCL && (
                      <div>
                        <label className="block text-sm font-medium">Day Type</label>
                        <select className="mt-1 block w-full border rounded p-2" value={form.cl_type} onChange={(e) => setForm((f) => ({ ...f, cl_type: e.target.value }))}>
                          <option value="Full">Full Day</option>
                          <option value="Morning">First Half</option>
                          <option value="Afternoon">Second Half</option>
                        </select>
                      </div>
                    )}
                    {form.no_of_days !== null && (
                      <div className="text-sm text-slate-600 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                        Duration: <span className="font-semibold text-blue-700">{form.no_of_days} day{form.no_of_days !== 1 ? 's' : ''}</span>
                      </div>
                    )}

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium">Leave Reason:<span className="text-red-500">*</span></label>
                      <textarea className="mt-1 block w-full border rounded p-2" rows={3} value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} required />
                    </div>

                    <div>
                      <label className="block text-sm font-medium">Alternate:</label>
                      <select className="mt-1 block w-full border rounded p-2" value={form.alternate} onChange={(e) => setForm((f) => ({ ...f, alternate: e.target.value }))}>
                        <option value="">Choose Alternate</option>
                        {(Array.isArray(alternateOptions) ? alternateOptions : (alternateOptions.alternate_staff || [])).map((s) => (<option key={s.id} value={s.id}>{[s.fname, s.mname, s.lname].filter(Boolean).join(' ')}</option>))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium">Additional Alternate:</label>
                      <select className="mt-1 block w-full border rounded p-2" value={form.additional_alternate} onChange={(e) => setForm((f) => ({ ...f, additional_alternate: e.target.value }))}>
                        <option value="">Choose an Alternate</option>
                        {staffList.filter((s) => String(s.id) !== String(form.staff_id)).map((s) => (<option key={s.id} value={s.id}>{[s.fname, s.mname, s.lname].filter(Boolean).join(' ')}</option>))}
                      </select>
                    </div>
                  </div>

                  <div className="mt-4 flex justify-end gap-2">
                    <button type="button" onClick={closeApplyModal} className="px-4 py-2 bg-gray-200 rounded">Cancel</button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded"
                    >
                        {submitting ? (editingApplicationId ? 'Updating...' : 'Applying...') : (
                          <>
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
                              <path d="M9.9997 15.1709L19.1921 5.97852L20.6063 7.39273L9.9997 17.9993L3.63574 11.6354L5.04996 10.2212L9.9997 15.1709Z" />
                            </svg>
                            <span>{editingApplicationId ? 'Update' : 'Apply'}</span>
                          </>
                        )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* View Leave Modal (tab-wise per leave type) */}
          {isViewOpen && (
            <div className="fixed inset-0 z-50 flex items-start pt-20 justify-center bg-black bg-opacity-40">
              <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-semibold">Applications on {viewDate}</h2>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => { setIsViewOpen(false); setViewDate(null); setViewApps([]); setActiveTab(null); }}
                        className="text-slate-600 hover:text-slate-800"
                        type="button"
                        aria-label="Close"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                          <path d="M6.225 4.811L4.811 6.225 10.586 12l-5.775 5.775 1.414 1.414L12 13.414l5.775 5.775 1.414-1.414L13.414 12l5.775-5.775-1.414-1.414L12 10.586 6.225 4.811z" />
                        </svg>
                      </button>
                    </div>
                </div>

                <div>
                  <nav className="-mb-0.5 flex flex-wrap justify-center gap-x-6" aria-label="Leave type tabs">
                    {modalLeaveTypeKeys.length ? modalLeaveTypeKeys.map((leaveTypeKey) => {
                      const isActive = activeTab === leaveTypeKey;
                      const count = groupedRows[leaveTypeKey]?.length || 0;
                      return (
                        <button
                          key={leaveTypeKey}
                          type="button"
                          onClick={() => setActiveTab(leaveTypeKey)}
                          className={`py-3 px-1 inline-flex items-center gap-2 border-b-[3px] whitespace-nowrap ${
                            isActive
                              ? 'font-semibold border-blue-600 text-blue-700'
                              : 'border-transparent text-gray-500 hover:text-blue-600'
                          }`}
                        >
                          <span className="text-base">{leaveTypeKey}</span>
                          {count > 0 && (
                            <span className="inline-flex items-center justify-center min-w-[22px] h-5 px-1 text-xs font-medium rounded-full bg-yellow-500 text-white">
                              {count}
                            </span>
                          )}
                        </button>
                      );
                    }) : <div className="text-sm text-slate-500">No applications</div>}
                  </nav>

                  <div>
                    {(() => {
                      const active = activeTab || modalLeaveTypeKeys[0] || null;
                      const allRows = (viewApps && viewApps.length) ? viewApps : (viewDate ? (dateAppsMap[viewDate] || []) : []);
                      const rows = allRows.filter((r) => ((r.leave_shortname || r.shortname || 'Other') === active));
                      if (!rows.length) return <div className="text-sm text-slate-500">No applications for this type</div>;
                      return (
                        <div className="overflow-x-auto">
                          <table className="min-w-full border border-gray-200">
                            <thead className="bg-blue-700">
                              <tr>
                                <th className="px-3 py-3 text-left text-xs font-semibold text-white">S.NO</th>
                                <th className="px-3 py-3 text-left text-xs font-semibold text-white">Application ID</th>
                                <th className="px-3 py-3 text-left text-xs font-semibold text-white">Application Date</th>
                                <th className="px-3 py-3 text-left text-xs font-semibold text-white">Name</th>
                                <th className="px-3 py-3 text-left text-xs font-semibold text-white">Leave From</th>
                                <th className="px-3 py-3 text-left text-xs font-semibold text-white">Leave To</th>
                                <th className="px-3 py-3 text-left text-xs font-semibold text-white">No Of Days</th>
                                <th className="px-3 py-3 text-left text-xs font-semibold text-white">Alternate</th>
                                <th className="px-3 py-3 text-left text-xs font-semibold text-white">Status</th>
                                <th className="px-3 py-3 text-left text-xs font-semibold text-white">Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {rows.map((r, idx) => (
                                <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50">
                                  <td className="px-3 py-3 text-sm text-slate-700">{idx + 1}</td>
                                  <td className="px-3 py-3 text-sm text-slate-700">{r.id}</td>
                                  <td className="px-3 py-3 text-sm text-slate-700">{formatDate(getApplicationDate(r))}</td>
                                  <td className="px-3 py-3 text-sm text-slate-700">{getStaffName(r)}</td>
                                  <td className="px-3 py-3 text-sm text-slate-700">{formatDate(r.start_date || r.start)}</td>
                                  <td className="px-3 py-3 text-sm text-slate-700">{formatDate(r.end_date || r.end)}</td>
                                  <td className="px-3 py-3 text-sm text-slate-700">{r.no_of_days ?? r.days ?? '-'}</td>
                                  <td className="px-3 py-3 text-sm text-slate-700">{getAlternateName(r)}</td>
                                  <td className="px-3 py-3 text-sm text-slate-700"><span className={`inline-flex px-2 py-1 rounded text-xs font-semibold ${getStatusClass(r.appl_status || r.status)}`}>{String(r.appl_status || r.status || 'N/A')}</span></td>
                                  <td className="px-3 py-3 text-sm text-slate-700">
                                    <div className="flex items-center gap-2">
                                      <button type="button" onClick={() => handleEditFromView(r)} className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-slate-700 hover:bg-gray-200" title="Edit">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1.003 1.003 0 0 0 0-1.42l-2.34-2.34a1.003 1.003 0 0 0-1.42 0l-1.83 1.83 3.75 3.75 1.84-1.82z"/></svg>
                                      </button>
                                      <button type="button" onClick={() => handleCancelApplication(r.id)} className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-red-100 text-red-600 hover:bg-red-200" title="Cancel">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      );
                    })()}
                  </div>
                  <div className="flex justify-end gap-3 px-4 py-3 border-t bg-slate-50">
                    <button type="button" onClick={() => { setIsViewOpen(false); setViewDate(null); setViewApps([]); setActiveTab(null); }} className="inline-flex justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">Close</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <Notification show={notification.show} message={notification.message} type={notification.type} onClose={closeNotification} />
        </main>
      </div>
    </div>
  );
}
