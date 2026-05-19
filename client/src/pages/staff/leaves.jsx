import { useCallback, useEffect, useMemo, useState } from 'react';
import Notification from '../../components/common/Notification';
import Header from '../../components/layout/Header';
import Sidebar from '../../components/layout/Sidebar';
import { useAuth } from '../../context/AuthContext';
import { ROLE_NON_TEACHING, ROLE_ESTABLISHMENT, isRoleMatch } from '../../utils/role';
import axios from '../../api/axios';
import { getHolidayRHList } from '../../api/holidayrhApi';

// Leave statistics component: fetches /api/leave-entitlements and
// renders a small table similar to the Blade view
function LeaveStatistics({ year, staffId, userId }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    if (!staffId && !userId) {
      setLoading(false);
      return () => { mounted = false; };
    }

    setLoading(true);
    setError('');
    axios.get('/leave-entitlements', { params: { year } })
      .then((res) => {
        if (!mounted) return;
        const payload = res.data?.data || {};
        const rows = payload.data || [];
        const staffRow = rows.find((r) => {
          if (staffId && Number(r.id) === Number(staffId)) return true;
          if (userId && Number(r.user_id) === Number(userId)) return true;
          return false;
        });
        setData({ payload, staffRow });
      })
      .catch(() => {
        if (!mounted) return;
        setError('Failed to load leave statistics');
      })
      .finally(() => { if (mounted) setLoading(false); });

    return () => { mounted = false; };
  }, [year, staffId, userId]);

  if (!staffId && !userId) return null;
  if (loading) return <div className="p-3 bg-white rounded-lg shadow-sm">Loading leave statistics…</div>;
  if (error) return <div className="p-3 text-sm text-red-600">{error}</div>;
  if (!data || !data.staffRow) return <div className="p-3 text-sm text-slate-500">No leave statistics available.</div>;

  const leaves = data.staffRow.leaves || {};
  const keys = Object.keys(leaves);
  const extra = ['DL-GIT', 'DL-VTU'];
  const allKeys = Array.from(new Set([...keys, ...extra]));

  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden p-4">
      <h3 className="text-blue-600 font-bold text-center">My Leave Statistics</h3>
      <div className="overflow-auto mt-3">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2  font-medium">Titles</th>
              {allKeys.map((k) => (
                <th key={k} className="px-3 py-2 text-left font-semibold">{k}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <th className="px-3 py-2 font-medium">Entitled</th>
              {allKeys.map((k) => (
                <td key={k} className="px-3 py-2">{typeof leaves[k] !== 'undefined' ? (leaves[k].entitled_accumulated ?? (leaves[k].entitled_curr_year ?? 0)) : '--'}</td>
              ))}
            </tr>
            <tr>
              <th className="px-3 py-2 font-medium">Availed</th>
              {allKeys.map((k) => (
                <td key={k} className="px-3 py-2">{typeof leaves[k] !== 'undefined' ? (leaves[k].availed ?? leaves[k].consumed ?? 0) : '--'}</td>
              ))}
            </tr>
            <tr>
              <th className="px-3 py-2 font-medium">Balance</th>
              {allKeys.map((k) => (
                <td key={k} className="px-3 py-2">{typeof leaves[k] !== 'undefined' ? (typeof leaves[k].balance !== 'undefined' ? leaves[k].balance : (leaves[k].entitled_accumulated ?? '--')) : '--NA--'}</td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── helpers ────────────────────────────────────────────────────────────────

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

/** Returns true if `date` is the 1st or 3rd Saturday of its month */
function isFirstOrThirdSaturday(date) {
  if (date.getDay() !== 6) return false; // not Saturday
  const day = date.getDate();
  // nth Saturday in the month
  const nth = Math.ceil(day / 7);
  return nth === 1 || nth === 3;
}

/** YYYY-MM-DD string from a Date (local, no timezone shift) */
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

function normalizeHolidayType(type) {
  return String(type || '').trim().toLowerCase();
}

function normalizeLeaveStatus(status) {
  return String(status || '').trim().toLowerCase();
}

function normalizeVacationType(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return '';
  if (['1', 'true', 't', 'yes', 'vacational'].includes(normalized)) return 'vacational';
  if (normalized.includes('non')) return 'non-vacational';
  if (normalized.includes('vacational')) return 'vacational';
  return normalized;
}

function isSelectableLeaveType(leaveType) {
  const shortName = String(leaveType?.shortname || '').trim().toUpperCase();
  if (!shortName) return true;
  if (shortName === 'ML') return false;
  if (shortName.includes('SPECIAL MEDICAL')) return false;
  if (shortName.startsWith('SML')) return false;
  return true;
}

function normalizeEmployeeType(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return '';
  if (normalized.includes('non')) return 'non-teaching';
  if (normalized.includes('teach')) return 'teaching';
  return normalized;
}

function normalizeMemberStatus(value) {
  const raw = String(value ?? '').trim().toLowerCase();
  if (raw === '1' || raw === 'true') return 'active';
  return raw;
}

function pickDepartmentId(record) {
  return Number(
    record?.department_id
    ?? record?.dept_id
    ?? record?.deptId
    ?? record?.departmentId
    ?? record?.association_id
    ?? record?.associationId
    ?? 0,
  ) || null;
}

function pickDepartmentIds(record) {
  if (Array.isArray(record?.department_ids)) {
    return record.department_ids.map((id) => Number(id)).filter(Boolean);
  }

  const single = pickDepartmentId(record);
  return single ? [single] : [];
}

function isActiveMember(record) {
  const statusCandidates = [
    record?.status,
    record?.member_status,
    record?.association_status,
    record?.designation_status,
    record?.staff_status,
    record?.user_status,
  ];

  const hasAnyStatus = statusCandidates.some(
    (status) => status !== undefined && status !== null && String(status).trim() !== '',
  );

  // Backend now enforces active department_staff membership.
  // If status fields are not present in payload, do not filter out the row here.
  if (!hasAnyStatus) return true;

  return statusCandidates.some((status) => normalizeMemberStatus(status) === 'active');
}

function getStaffOptionId(record) {
  return Number(record?.id ?? record?.staff_id ?? record?.staffId ?? record?.user_id ?? 0) || null;
}

function getStaffOptionLabel(record) {
  const fullName = [record?.fname, record?.mname, record?.lname]
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (fullName) return fullName;

  return String(
    record?.staffname
    || record?.name
    || record?.full_name
    || record?.display_name
    || record?.email
    || '',
  ).trim();
}

/** Groups an array of staff options by their group_label (or department_name) field */
function groupStaffByDepartment(options) {
  const groups = new Map();
  for (const opt of options) {
    const label = String(opt?.group_label || opt?.department_name || '').trim() || 'Other';
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label).push(opt);
  }
  return groups;
}

function isRhLeaveType(leaveType) {
  const shortName = String(leaveType?.shortname || '').trim().toUpperCase();
  if (shortName === 'RH') return true;

  const longName = String(leaveType?.longname || '').trim().toLowerCase();
  return longName === 'restricted holiday';
}

function toHolidayArray(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.rows)) return payload.rows;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
}

/** Build calendar grid (6 rows × 7 cols) for a given year/month (0-indexed) */
function buildCalendarGrid(year, month) {
  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const grid = [];
  let day = 1 - firstDay; // can be negative (prev-month overflow)
  for (let row = 0; row < 6; row++) {
    const week = [];
    for (let col = 0; col < 7; col++, day++) {
      if (day < 1 || day > daysInMonth) {
        week.push(null);
      } else {
        week.push(new Date(year, month, day));
      }
    }
    grid.push(week);
    if (day > daysInMonth) break;
  }
  return grid;
}

// ─── sub-component: Calendar ─────────────────────────────────────────────────

function LeaveCalendar({ year, month, onYearChange, onMonthChange, holidayMap, rhMap, leaveMap, availableYears, onDateClick }) {
  const today = toDateStr(new Date());
  const grid = useMemo(() => buildCalendarGrid(year, month), [year, month]);

  const getDayStyle = (date) => {
    if (!date) return '';
    const key = toDateStr(date);
    const dow = date.getDay(); // 0=Sun

    if (holidayMap[key]) return 'bg-red-100 text-red-800 font-medium';
    if (rhMap[key])      return 'bg-yellow-100 text-yellow-800 font-medium';
    if (isFirstOrThirdSaturday(date)) return 'bg-orange-100 text-orange-800 font-medium';
    if (dow === 0)       return 'bg-slate-100 text-slate-400';
    return 'text-slate-700';
  };

  const years = Array.isArray(availableYears) && availableYears.length
    ? availableYears
    : Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 1 + i);

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* Header row */}
      <div className="flex items-center justify-between px-2 sm:px-4 py-2.5 sm:py-3 bg-slate-50 border-b border-slate-200">
        <button
          onClick={() => {
            const d = new Date(year, month - 1, 1);
            onYearChange(d.getFullYear());
            onMonthChange(d.getMonth());
          }}
          className="p-1 rounded hover:bg-slate-200 text-slate-600"
          aria-label="Previous month"
        >
          &#8249;
        </button>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <select
            value={month}
            onChange={(e) => onMonthChange(Number(e.target.value))}
            className="text-xs sm:text-sm font-semibold bg-transparent border-none outline-none cursor-pointer text-slate-800"
          >
            {MONTHS.map((m, i) => (
              <option key={m} value={i}>{m}</option>
            ))}
          </select>
          <select
            value={year}
            onChange={(e) => onYearChange(Number(e.target.value))}
            className="text-xs sm:text-sm font-semibold bg-transparent border-none outline-none cursor-pointer text-slate-800"
          >
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        <button
          onClick={() => {
            const d = new Date(year, month + 1, 1);
            onYearChange(d.getFullYear());
            onMonthChange(d.getMonth());
          }}
          className="p-1 rounded hover:bg-slate-200 text-slate-600"
          aria-label="Next month"
        >
          &#8250;
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 border-b border-slate-100">
        {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d) => (
          <div key={d} className="py-1.5 sm:py-2 text-center text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wide">
            {d}
          </div>
        ))}
      </div>

      {/* Weeks */}
      <div className="divide-y divide-slate-100">
        {grid.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7">
            {week.map((date, di) => {
              if (!date) return <div key={di} className="h-14 sm:h-16 bg-slate-50/50" />;

              const key = toDateStr(date);
              const isToday = key === today;
              const holidayTitle = holidayMap[key];
              const rhTitle = rhMap[key];
              const leaveEntry = leaveMap?.[key];
              const isFTS = isFirstOrThirdSaturday(date);
              const isSun = date.getDay() === 0;

              const leaveStatusColor = leaveEntry
                ? leaveEntry.status === 'approved'
                  ? 'bg-green-100'
                  : leaveEntry.status === 'rejected'
                    ? 'bg-red-50'
                    : 'bg-indigo-100'
                : '';

                  return (
                <div
                  key={di}
                  className={`h-14 sm:h-16 p-1 border-l border-slate-100 first:border-l-0 flex flex-col cursor-pointer hover:ring-1 hover:ring-blue-300 ${leaveEntry ? leaveStatusColor : getDayStyle(date)}`}
                  onClick={() => onDateClick?.(key, leaveEntry)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onDateClick?.(key, leaveEntry);
                    }
                  }}
                >
                  <span
                    className={`self-end text-[10px] sm:text-xs w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center rounded-full font-medium
                      ${isToday ? 'bg-blue-600 text-white' : ''}`}
                  >
                    {date.getDate()}
                  </span>
                  {holidayTitle && (
                    <span className="text-[9px] sm:text-[10px] leading-tight mt-auto line-clamp-2 text-red-700">
                      {holidayTitle}
                    </span>
                  )}
                  {rhTitle && (
                    <span className="text-[9px] sm:text-[10px] leading-tight mt-auto line-clamp-2 text-yellow-700">
                      {rhTitle}
                    </span>
                  )}
                  {isFTS && !holidayTitle && !rhTitle && (
                    <span className="text-[9px] sm:text-[10px] leading-tight mt-auto text-orange-600">
                      {Math.ceil(date.getDate() / 7) === 1 ? '1st Sat' : '3rd Sat'}
                    </span>
                  )}
                  {isSun && !holidayTitle && !rhTitle && !leaveEntry && (
                    <span className="text-[10px] leading-tight mt-auto text-slate-400">Sunday</span>
                  )}
                  {leaveEntry && (
                    <span
                      className={`text-[9px] sm:text-[10px] leading-tight mt-auto line-clamp-2 font-medium ${
                        leaveEntry.status === 'approved'
                          ? 'text-green-700'
                          : leaveEntry.status === 'rejected'
                            ? 'text-red-500 line-through'
                            : 'text-indigo-700'
                      }`}
                      title={`${leaveEntry.longname || leaveEntry.shortname} (${leaveEntry.status})`}
                    >
                      {leaveEntry.shortname}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 px-4 py-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-600">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm bg-red-200 border border-red-300" />
          Holiday
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm bg-yellow-200 border border-yellow-300" />
          Restricted Holiday (RH)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm bg-orange-200 border border-orange-300" />
          1st &amp; 3rd Saturday
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm bg-blue-600" />
          Today
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm bg-indigo-200 border border-indigo-300" />
          Leave (Pending)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm bg-green-200 border border-green-300" />
          Leave (Approved)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm bg-red-50 border border-red-200" />
          Leave (Rejected)
        </span>
      </div>
    </div>
  );
}

// ─── main page ───────────────────────────────────────────────────────────────

const emptyForm = {
  leave_id: '',
  start_date: '',
  end_date: '',
  cl_type: 'Full',
  reason: '',
  alternate: '',
  additional_alternate: '',
};

const MY_APPLICATIONS_PAGE_SIZE = 10;

export default function StaffLeavesPage() {
  const { user, token } = useAuth?.() || {};

  const requesterUserId = Number(user?.id || 0) || null;
  const [requesterStaffId, setRequesterStaffId] = useState(Number(user?.staff_id || 0) || null);
  const isNonTeachingUser = isRoleMatch(user?.role, ROLE_NON_TEACHING);

  // calendar state
  const today = new Date();
  const [calYear, setCalYear]   = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());

  // data
  const [holidays, setHolidays] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [alternateOptions, setAlternateOptions] = useState([]);
  const [employeeVacationType, setEmployeeVacationType] = useState('');

  // application list
  const [applications, setApplications] = useState([]);
  const [loadingApps, setLoadingApps] = useState(true);
  const [applicationsSearch, setApplicationsSearch] = useState('');
  const [applicationsPage, setApplicationsPage] = useState(1);

  // form
  const [form, setForm]           = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [notification, setNotification] = useState({ show: false, message: '', type: '' });
  const [holidayLoadError, setHolidayLoadError] = useState('');
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewApplication, setViewApplication] = useState(null);
  const [editingApplicationId, setEditingApplicationId] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const staffIdFromSession = Number(user?.staff_id || 0) || null;
    if (staffIdFromSession) {
      setRequesterStaffId(staffIdFromSession);
      return () => { isMounted = false; };
    }

    if (!requesterUserId) {
      setRequesterStaffId(null);
      return () => { isMounted = false; };
    }

    axios.get('/staff', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((response) => {
        if (!isMounted) return;
        const rows = response?.data?.data || [];
        const matched = rows.find((row) => Number(row?.user_id) === Number(requesterUserId));
        setRequesterStaffId(Number(matched?.id || 0) || null);
      })
      .catch(() => {
        if (!isMounted) return;
        setRequesterStaffId(null);
      });

    return () => { isMounted = false; };
  }, [requesterUserId, token, user?.staff_id]);

  const notify = (message, type = 'success') =>
    setNotification({ show: true, message, type });

  const closeNotification = useCallback(() =>
    setNotification((n) => ({ ...n, show: false })), []);

  // ── fetch holidays & leave types on mount ───────────────────────────────
  useEffect(() => {
    const loadHolidays = async () => {
      setHolidayLoadError('');

      try {
        const r = await getHolidayRHList(token);
        let rows = toHolidayArray(r?.data);

        // Fallback for environments where wrapper shape differs.
        if (!rows.length) {
          const fallback = await axios.get('/holidayrhs', {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          });
          rows = toHolidayArray(fallback?.data);
        }

        setHolidays(rows);
      } catch (err) {
        setHolidays([]);
        setHolidayLoadError(err?.response?.data?.message || 'Failed to load Holiday/RH data');
      }
    };

    loadHolidays();

    axios.get('/leaves', { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then((r) => setLeaveTypes(r.data?.data || []))
      .catch(() => setLeaveTypes([]));
  }, [token]);

  // ── fetch staff's own applications ──────────────────────────────────────
  const loadApplications = useCallback(async () => {
    if (!requesterUserId) return;
    setLoadingApps(true);
    try {
      const r = await axios.get('/leave-calendar/applications', {
        params: { staff_id: requesterUserId },
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      setApplications(r.data?.data || []);
    } catch {
      setApplications([]);
    }
    setLoadingApps(false);
  }, [requesterUserId, token]);

  useEffect(() => { loadApplications(); }, [loadApplications]);

  useEffect(() => {
    if (!requesterStaffId) {
      setEmployeeVacationType('');
      return;
    }

    axios.get(`/staff/${requesterStaffId}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((response) => {
        const staff = response?.data?.data || null;
        setEmployeeVacationType(
          normalizeVacationType(
            staff?.designation_type
            || staff?.isvacational
            || staff?.vacation_type,
          ),
        );
      })
      .catch(() => setEmployeeVacationType(''));
  }, [requesterStaffId, token]);

  // fetch alternate staff options for current user
  useEffect(() => {
    if (!requesterUserId) return;

    const employeeType = isNonTeachingUser ? 'non-teaching' : 'teaching';

    axios.get('/leave-calendar/alternate-staff', {
      params: {
        staff_id: requesterUserId,
        employee_type: employeeType,
        same_department: 1,
        active_only: 1,
      },
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => setAlternateOptions(r.data?.data || []))
      .catch(() => setAlternateOptions([]));
  }, [requesterUserId, isNonTeachingUser, token]);

  // ── build holiday / RH maps keyed by date string ─────────────────────────
  const holidayMap = useMemo(() => {
    const map = {};
    holidays
      .filter((h) => normalizeHolidayType(h.type) === 'holiday')
      .forEach((h) => {
        const key = extractDateKey(h.start || h.date || h.start_date);
        if (key) map[key] = h.title;
      });
    return map;
  }, [holidays]);

  const rhMap = useMemo(() => {
    const map = {};
    holidays
      .filter((h) => {
        const type = normalizeHolidayType(h.type);
        return type === 'rh' || type === 'hr';
      })
      .forEach((h) => {
        const key = extractDateKey(h.start || h.date || h.start_date);
        if (key) map[key] = h.title;
      });
    return map;
  }, [holidays]);

  // ── map each applied leave day → { shortname, longname, status } ─────────
  const leaveMap = useMemo(() => {
    const map = {};
    for (const app of applications) {
      const status = normalizeLeaveStatus(app.appl_status || app.status);
      if (status === 'cancelled') continue;
      const start = extractDateKey(app.start_date || app.start);
      const end   = extractDateKey(app.end_date   || app.end);
      if (!start || !end) continue;
      const cur = new Date(start);
      const last = new Date(end);
      while (cur <= last) {
        const key = toDateStr(cur);
        // Earlier (first-inserted) application wins if days overlap
        if (!map[key]) {
          map[key] = {
            shortname: app.leave_shortname || app.shortname || '?',
            longname:  app.leave_longname  || app.longname  || '',
            status,
            appId: app.id || null,
            app: app,
          };
        }
        cur.setDate(cur.getDate() + 1);
      }
    }
    return map;
  }, [applications]);

  const holidayYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const years = holidays
      .map((h) => extractDateKey(h.start || h.date || h.start_date))
      .filter(Boolean)
      .map((key) => Number(key.slice(0, 4)))
      .filter((y) => Number.isFinite(y));

    const defaultRange = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);
    const set = new Set([...defaultRange, ...years]);
    return Array.from(set).sort((a, b) => a - b);
  }, [holidays]);

  // ── computed no-of-days ──────────────────────────────────────────────────
  const noOfDays = useMemo(() => {
    if (!form.start_date || !form.end_date) return null;
    const s = new Date(form.start_date);
    const e = new Date(form.end_date);
    if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime()) || e < s) return null;
    const days = Math.floor((e - s) / 86400000) + 1;
    if (days === 1 && form.cl_type !== 'Full') return 0.5;
    return days;
  }, [form.start_date, form.end_date, form.cl_type]);

  const activeLeaveTypes = useMemo(
    () => leaveTypes.filter(
      (leaveType) => {
        if (normalizeLeaveStatus(leaveType?.status) !== 'active') return false;
        if (!isSelectableLeaveType(leaveType)) return false;

        const leaveVacationType = normalizeVacationType(leaveType?.vacation_type);
        if (employeeVacationType && leaveVacationType && leaveVacationType !== employeeVacationType) {
          return false;
        }

        return true;
      },
    ),
    [leaveTypes, employeeVacationType],
  );

  const selectedLeaveType = useMemo(
    () => activeLeaveTypes.find((leaveType) => String(leaveType.id) === String(form.leave_id)),
    [activeLeaveTypes, form.leave_id],
  );

  const filteredAlternateOptions = useMemo(() => {
    const expectedType = isNonTeachingUser ? 'non-teaching' : 'teaching';
    const requesterDepartmentIds = pickDepartmentIds(user);

    return alternateOptions
      .filter((option) => {
        const optionId = getStaffOptionId(option);
        if (!optionId) return false;
        if (requesterStaffId && optionId === requesterStaffId) return false;
        if (!isActiveMember(option)) return false;

        // Designation peers (Principal, Dean, etc.) bypass department and
        // employee-type filters — they are included based on their designation.
        if (!option?.is_designation_peer) {
          const optionType = normalizeEmployeeType(
            option?.employee_type
            || option?.employeeType
            || option?.staff_type
            || option?.staffType
            || option?.role,
          );

          if (optionType && optionType !== expectedType) return false;

          const optionDepartmentIds = pickDepartmentIds(option);
          if (
            requesterDepartmentIds.length
            && !optionDepartmentIds.some((departmentId) => requesterDepartmentIds.includes(departmentId))
          ) {
            return false;
          }
        }

        return Boolean(getStaffOptionLabel(option));
      })
      .sort((a, b) => getStaffOptionLabel(a).localeCompare(getStaffOptionLabel(b), undefined, { sensitivity: 'base' }));
  }, [alternateOptions, isNonTeachingUser, requesterStaffId, user]);

  const groupedAlternateOptions = useMemo(
    () => groupStaffByDepartment(filteredAlternateOptions),
    [filteredAlternateOptions],
  );

  const renderGroupedStaffOptions = (groups) => {
    const entries = Array.from(groups.entries());
    if (entries.length <= 1) {
      return (entries[0]?.[1] || []).map((a) => {
        const optionId = getStaffOptionId(a);
        const label = getStaffOptionLabel(a);
        if (!optionId || !label) return null;
        return <option key={optionId} value={optionId}>{label}</option>;
      });
    }
    return entries.map(([dept, members]) => (
      <optgroup key={dept} label={dept}>
        {members.map((a) => {
          const optionId = getStaffOptionId(a);
          const label = getStaffOptionLabel(a);
          if (!optionId || !label) return null;
          return <option key={optionId} value={optionId}>{label}</option>;
        })}
      </optgroup>
    ));
  };

  const selectableLeaveTypes = useMemo(() => {
    const isRhDate = Boolean(form.start_date && rhMap[form.start_date]);

    return activeLeaveTypes.filter((leaveType) => {
      if (!isRhLeaveType(leaveType)) return true;
      return isRhDate;
    });
  }, [activeLeaveTypes, form.start_date, rhMap]);

  const isSingleDayCL = useMemo(() => {
    if (!selectedLeaveType || !form.start_date || !form.end_date) return false;

    const shortName = String(selectedLeaveType.shortname || '').trim().toUpperCase();
    return shortName === 'CL' && form.start_date === form.end_date;
  }, [selectedLeaveType, form.start_date, form.end_date]);

  useEffect(() => {
    if (!isSingleDayCL && form.cl_type !== 'Full') {
      setForm((currentForm) => ({ ...currentForm, cl_type: 'Full' }));
    }
  }, [isSingleDayCL, form.cl_type]);

  useEffect(() => {
    if (!form.leave_id) return;
    const exists = selectableLeaveTypes.some((leaveType) => String(leaveType.id) === String(form.leave_id));
    if (!exists) {
      setForm((currentForm) => ({ ...currentForm, leave_id: '' }));
    }
  }, [selectableLeaveTypes, form.leave_id]);

  useEffect(() => {
    const alternateExists = filteredAlternateOptions.some((option) => String(getStaffOptionId(option)) === String(form.alternate));
    const additionalAlternateExists = filteredAlternateOptions.some((option) => String(getStaffOptionId(option)) === String(form.additional_alternate));

    if (form.alternate && !alternateExists) {
      setForm((currentForm) => ({ ...currentForm, alternate: '' }));
      return;
    }

    if (form.additional_alternate && !additionalAlternateExists) {
      setForm((currentForm) => ({ ...currentForm, additional_alternate: '' }));
    }
  }, [filteredAlternateOptions, form.alternate, form.additional_alternate]);

  // ── form handlers ────────────────────────────────────────────────────────
  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'start_date') return;
    setForm((f) => ({ ...f, [name]: value }));
    setFormError('');
  };

  const openApplyModalForDate = (dateKey) => {
    setEditingApplicationId(null);
    setForm((prev) => ({
      ...emptyForm,
      leave_id: prev.leave_id || '',
      cl_type: prev.cl_type || 'Full',
      reason: '',
      start_date: dateKey,
      end_date: dateKey,
    }));
    setFormError('');
    setIsApplyModalOpen(true);
  };

  const closeApplyModal = () => {
    setIsApplyModalOpen(false);
    setFormError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!form.leave_id)      return setFormError('Please select a leave type.');
    if (!form.start_date)    return setFormError('Please select a start date.');
    if (!form.end_date)      return setFormError('Please select an end date.');
    if (noOfDays === null)   return setFormError('End date must be on or after start date.');
    if (!form.alternate)     return setFormError('Please select an alternate staff.');
    if (!form.reason.trim()) return setFormError('Please enter a reason.');

    setSubmitting(true);
    try {
      if (editingApplicationId) {
        await axios.patch(
          `/leave-calendar/applications/${editingApplicationId}`,
          {
            staff_id: user?.id,
            leave_id: Number(form.leave_id),
            start_date: form.start_date,
            end_date: form.end_date,
            cl_type: form.cl_type,
            reason: form.reason.trim(),
            no_of_days: noOfDays,
            alternate: form.alternate || null,
            additional_alternate: form.additional_alternate || null,
          },
          { headers: token ? { Authorization: `Bearer ${token}` } : {} },
        );
        notify('Leave application updated successfully.');
      } else {
        await axios.post(
          '/leave-calendar/applications',
          {
            staff_id: user?.id,
            leave_id: Number(form.leave_id),
            start_date: form.start_date,
            end_date: form.end_date,
            cl_type: form.cl_type,
            reason: form.reason.trim(),
            no_of_days: noOfDays,
            alternate: form.alternate || null,
            additional_alternate: form.additional_alternate || null,
          },
          { headers: token ? { Authorization: `Bearer ${token}` } : {} },
        );
        notify('Leave application submitted successfully.');
      }

      setForm(emptyForm);
      setIsApplyModalOpen(false);
      setEditingApplicationId(null);
      setIsViewModalOpen(false);
      loadApplications();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to submit application. Please try again.';
      setFormError(msg);
    }
    setSubmitting(false);
  };

  const openViewModalForDate = (dateKey, app) => {
    setViewApplication(app || null);
    setIsViewModalOpen(true);
  };

  const closeViewModal = () => {
    setIsViewModalOpen(false);
    setViewApplication(null);
  };

  const handleEditFromView = (app) => {
    if (!app) return;
    setEditingApplicationId(app.id || null);
    setForm({
      leave_id: app.leave_id || app.leaveId || '',
      start_date: extractDateKey(app.start_date || app.start) || '',
      end_date: extractDateKey(app.end_date || app.end) || '',
      cl_type: app.cl_type || app.clType || 'Full',
      reason: app.reason || '',
      alternate: app.alternate || app.alternate_staff || '',
      additional_alternate: app.additional_alternate || '',
    });
    setFormError('');
    setIsViewModalOpen(false);
    setIsApplyModalOpen(true);
  };

  const handleCancelApplication = async (appId) => {
    if (!appId) return;
    if (!window.confirm('Are you sure you want to cancel this leave application?')) return;
    try {
      await axios.post(`/leave-calendar/applications/${appId}/cancel`, null, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      notify('Leave application cancelled.');
      setIsViewModalOpen(false);
      setViewApplication(null);
      loadApplications();
    } catch (err) {
      notify(err.response?.data?.message || 'Failed to cancel application.', 'error');
    }
  };

  const handleDateClick = (dateKey, leaveEntry) => {
    if (leaveEntry && leaveEntry.app) {
      openViewModalForDate(dateKey, leaveEntry.app);
    } else {
      openApplyModalForDate(dateKey);
    }
  };

  // ── helpers ──────────────────────────────────────────────────────────────
  const formatDate = (val) => {
    if (!val) return '-';
    const s = String(val).slice(0, 10);
    const [y, m, d] = s.split('-');
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${d}-${months[Number(m) - 1]}-${y}`;
  };

  const statusBadge = (status) => {
    const map = {
      Pending:  'bg-yellow-100 text-yellow-800',
      Approved: 'bg-green-100 text-green-800',
      Rejected: 'bg-red-100 text-red-800',
      Cancelled:'bg-slate-100 text-slate-600',
    };
    return (
      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${map[status] || 'bg-slate-100 text-slate-600'}`}>
        {status || 'Pending'}
      </span>
    );
  };

  const filteredApplications = useMemo(() => {
    const query = applicationsSearch.trim().toLowerCase();

    return applications.filter((app) => {
      // Filter by selected calendar year
      const startYear = extractDateKey(app.start_date || app.start);
      if (!startYear) return false;
      const appYear = Number(startYear.slice(0, 4));
      if (appYear !== calYear) return false;

      // Apply search filter
      if (!query) return true;

      const searchable = [
        app.leave_longname || '',
        app.leave_shortname || '',
        app.reason || '',
        app.status || '',
        formatDate(app.start_date),
        formatDate(app.end_date),
        String(app.no_of_days ?? ''),
      ]
        .join(' ')
        .toLowerCase();

      return searchable.includes(query);
    });
  }, [applications, applicationsSearch, calYear]);

  const totalApplicationsPages = useMemo(
    () => Math.max(1, Math.ceil(filteredApplications.length / MY_APPLICATIONS_PAGE_SIZE)),
    [filteredApplications.length],
  );

  const paginatedApplications = useMemo(() => {
    const start = (applicationsPage - 1) * MY_APPLICATIONS_PAGE_SIZE;
    return filteredApplications.slice(start, start + MY_APPLICATIONS_PAGE_SIZE);
  }, [filteredApplications, applicationsPage]);

  useEffect(() => {
    setApplicationsPage(1);
  }, [applicationsSearch, applications]);

  useEffect(() => {
    if (applicationsPage > totalApplicationsPages) {
      setApplicationsPage(totalApplicationsPages);
    }
  }, [applicationsPage, totalApplicationsPages]);

  // ── render ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <Header />
      <Notification
        show={notification.show}
        message={notification.message}
        type={notification.type}
        onClose={closeNotification}
      />

      <div className="flex flex-1 min-h-0">
        <Sidebar />

        <main className="flex-1 overflow-auto p-3 sm:p-4 lg:p-6">
          <div className="mx-auto w-full max-w-5xl space-y-6">
            {/* Page title */}
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">Leave Application</h2>

            </div>

            <div>
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-4">
                <h5 className="text-gray-700 text-2xl font-medium">
                  Leaves and Entitlement for - <span className="text-blue-600 text-xl">{calYear}</span>
                </h5>
                <div className="mt-3 md:mt-0" />
              </div>

              <LeaveStatistics year={calYear} staffId={requesterStaffId} userId={requesterUserId} />

              <LeaveCalendar
                year={calYear}
                month={calMonth}
                onYearChange={setCalYear}
                onMonthChange={setCalMonth}
                holidayMap={holidayMap}
                rhMap={rhMap}
                leaveMap={leaveMap}
                availableYears={holidayYears}
                onDateClick={handleDateClick}
              />
            </div>

          {isApplyModalOpen && (
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-2 sm:p-4">
              <div className="w-full max-w-[96vw] sm:max-w-md rounded-xl bg-white shadow-xl border border-slate-200 max-h-[92vh] overflow-y-auto">
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
                  <h3 className="text-base font-semibold text-slate-800">Apply for Leave</h3>
                  <button
                    type="button"
                    onClick={closeApplyModal}
                    className="text-slate-500 hover:text-slate-700"
                    aria-label="Close modal"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="p-5 space-y-4" noValidate>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Leave Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="leave_id"
                      value={form.leave_id}
                      onChange={handleChange}
                      required
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">— Select leave type —</option>
                      {selectableLeaveTypes.map((lt) => (
                        <option key={lt.id} value={lt.id}>
                          {lt.longname} ({lt.shortname})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        From <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        name="start_date"
                        value={form.start_date}
                        readOnly
                        disabled
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-500 bg-slate-100 cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        To <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        name="end_date"
                        value={form.end_date}
                        min={form.start_date || undefined}
                        onChange={handleChange}
                        required
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {isSingleDayCL && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Day Type <span className="text-red-500">*</span></label>
                      <select
                        name="cl_type"
                        value={form.cl_type}
                        onChange={handleChange}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="Full">Full Day</option>
                        <option value="Morning">First Half</option>
                        <option value="Afternoon">Second Half</option>
                      </select>
                    </div>
                  )}

                  {noOfDays !== null && (
                    <div className="text-sm text-slate-600 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                      Duration: <span className="font-semibold text-blue-700">{noOfDays} day{noOfDays !== 1 ? 's' : ''}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Alternate staff <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="alternate"
                        value={form.alternate}
                        onChange={handleChange}
                        required
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">— Select alternate —</option>
                        {renderGroupedStaffOptions(groupedAlternateOptions)}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Additional alternate
                      </label>
                      <select
                        name="additional_alternate"
                        value={form.additional_alternate}
                        onChange={handleChange}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">— Select additional alternate —</option>
                        {renderGroupedStaffOptions(groupedAlternateOptions)}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Reason <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      name="reason"
                      value={form.reason}
                      onChange={handleChange}
                      rows={3}
                      required
                      placeholder="Enter reason for leave..."
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {formError && (
                    <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                      {formError}
                    </p>
                  )}

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={closeApplyModal}
                      className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium px-4 py-2"
                    >
                      {submitting ? 'Submitting…' : 'Submit Application'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {isViewModalOpen && viewApplication && (
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-2 sm:p-4">
              <div className="w-full max-w-[96vw] sm:max-w-md rounded-xl bg-white shadow-xl border border-slate-200 max-h-[92vh] overflow-y-auto">
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
                  <h3 className="text-base font-semibold text-slate-800">Leave Application</h3>
                  <button
                    type="button"
                    onClick={closeViewModal}
                    className="text-slate-500 hover:text-slate-700"
                    aria-label="Close modal"
                  >
                    ✕
                  </button>
                </div>

                <div className="p-5 space-y-3">
                  <p className="text-sm font-semibold text-slate-800">{viewApplication.leave_longname || viewApplication.leave_shortname || '—'}</p>
                  <div className="grid grid-cols-2 gap-3 text-sm text-slate-600">
                    <div>
                      <p className="text-slate-400">From</p>
                      <p className="font-medium text-slate-700">{formatDate(viewApplication.start_date)}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">To</p>
                      <p className="font-medium text-slate-700">{formatDate(viewApplication.end_date)}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Days</p>
                      <p className="font-medium text-slate-700">{viewApplication.no_of_days ?? '—'}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Status</p>
                      <p className="font-medium text-slate-700">{statusBadge(viewApplication.status)}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-slate-400">Reason</p>
                    <p className="text-sm text-slate-600 mt-1">{viewApplication.reason || '—'}</p>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={closeViewModal}
                      className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      Close
                    </button>
                    {(viewApplication.appl_status === 'pending' || viewApplication.status === 'pending') && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleEditFromView(viewApplication)}
                          className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCancelApplication(viewApplication.id || viewApplication.Application_id || viewApplication.application_id)}
                          className="rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-sm font-medium px-4 py-2"
                        >
                          Cancel Application
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

            {/* My Applications */}
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <h3 className="text-base font-semibold text-slate-800">My Leave Applications</h3>
              </div>

              <div className="px-5 py-4 border-b border-gray-200 bg-white">
                <div className="relative w-full sm:w-80">
                  <input
                    value={applicationsSearch}
                    onChange={(e) => setApplicationsSearch(e.target.value)}
                    placeholder="Search leave applications..."
                    className="w-full py-2 pl-10 pr-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>

              {loadingApps ? (
                <div className="p-6 text-center text-sm text-slate-400">Loading applications…</div>
              ) : filteredApplications.length === 0 ? (
                <div className="p-6 text-center text-sm text-slate-400">No leave applications found.</div>
              ) : (
                <>
                  <div className="sm:hidden p-3 space-y-3">
                    {paginatedApplications.map((app, idx) => (
                      <div key={app.id} className="rounded-lg border border-slate-200 bg-white p-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs text-slate-400">#{(applicationsPage - 1) * MY_APPLICATIONS_PAGE_SIZE + idx + 1}</p>
                          {statusBadge(app.status)}
                        </div>
                        <p className="mt-2 text-sm font-semibold text-slate-800">{app.leave_longname || app.leave_shortname || '—'}</p>
                        <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-500">
                          <div>
                            <p className="text-slate-400">From</p>
                            <p className="font-medium text-slate-700">{formatDate(app.start_date)}</p>
                          </div>
                          <div>
                            <p className="text-slate-400">To</p>
                            <p className="font-medium text-slate-700">{formatDate(app.end_date)}</p>
                          </div>
                          <div>
                            <p className="text-slate-400">Days</p>
                            <p className="font-medium text-slate-700">{app.no_of_days ?? '—'}</p>
                          </div>
                        </div>
                        <p className="mt-2 text-xs text-slate-600 line-clamp-2">{app.reason || '—'}</p>
                      </div>
                    ))}
                  </div>

                  <div className="hidden sm:block overflow-auto rounded-lg border border-gray-200 bg-white m-4">
                    <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-blue-600">
                      <tr>
                        {['#','Leave Type','From','To','Days','Reason','Status'].map((h) => (
                          <th key={h} className="px-3 py-2 border-b text-left text-sm font-semibold text-white whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedApplications.map((app, idx) => (
                        <tr key={app.id} className="even:bg-gray-50 hover:bg-gray-50 transition-colors">
                          <td className="px-3 py-2 border-b text-sm">{(applicationsPage - 1) * MY_APPLICATIONS_PAGE_SIZE + idx + 1}</td>
                          <td className="px-3 py-2 border-b text-sm font-medium">{app.leave_longname || app.leave_shortname || '—'}</td>
                          <td className="px-3 py-2 border-b text-sm whitespace-nowrap">{formatDate(app.start_date)}</td>
                          <td className="px-3 py-2 border-b text-sm whitespace-nowrap">{formatDate(app.end_date)}</td>
                          <td className="px-3 py-2 border-b text-sm">{app.no_of_days ?? '—'}</td>
                          <td className="px-3 py-2 border-b text-sm max-w-xs truncate text-slate-500">{app.reason || '—'}</td>
                          <td className="px-3 py-2 border-b text-sm">{statusBadge(app.status)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  </div>

                  {filteredApplications.length > MY_APPLICATIONS_PAGE_SIZE && (
                    <div className="flex justify-end items-center gap-2 px-5 pb-5 pt-1 border-t border-gray-200 bg-gray-50">
                      <button
                        className="px-3 py-1 rounded border border-gray-300 bg-white text-gray-700 disabled:opacity-50"
                        onClick={() => setApplicationsPage((prev) => Math.max(1, prev - 1))}
                        disabled={applicationsPage === 1}
                      >
                        Prev
                      </button>
                      <span className="text-sm text-gray-700">
                        Page {applicationsPage} of {totalApplicationsPages}
                      </span>
                      <button
                        className="px-3 py-1 rounded border border-gray-300 bg-white text-gray-700 disabled:opacity-50"
                        onClick={() => setApplicationsPage((prev) => Math.min(totalApplicationsPages, prev + 1))}
                        disabled={applicationsPage === totalApplicationsPages}
                      >
                        Next
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
