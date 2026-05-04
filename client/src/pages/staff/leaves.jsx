import { useCallback, useEffect, useMemo, useState } from 'react';
import Notification from '../../components/common/Notification';
import Header from '../../components/layout/Header';
import Sidebar from '../../components/layout/Sidebar';
import { useAuth } from '../../context/AuthContext';
import axios from '../../api/axios';
import { getHolidayRHList } from '../../api/holidayrhApi';

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

function LeaveCalendar({ year, month, onYearChange, onMonthChange, holidayMap, rhMap, availableYears, onDateClick }) {
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
              const isFTS = isFirstOrThirdSaturday(date);
              const isSun = date.getDay() === 0;

              return (
                <div
                  key={di}
                  className={`h-14 sm:h-16 p-1 border-l border-slate-100 first:border-l-0 flex flex-col cursor-pointer hover:ring-1 hover:ring-blue-300 ${getDayStyle(date)}`}
                  onClick={() => onDateClick?.(key)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onDateClick?.(key);
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
                  {isSun && !holidayTitle && !rhTitle && (
                    <span className="text-[10px] leading-tight mt-auto text-slate-400">Sunday</span>
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
};

export default function StaffLeavesPage() {
  const { user, token } = useAuth?.() || {};

  // calendar state
  const today = new Date();
  const [calYear, setCalYear]   = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());

  // data
  const [holidays, setHolidays] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);

  // application list
  const [applications, setApplications] = useState([]);
  const [loadingApps, setLoadingApps] = useState(true);

  // form
  const [form, setForm]           = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [notification, setNotification] = useState({ show: false, message: '', type: '' });
  const [holidayLoadError, setHolidayLoadError] = useState('');
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);

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
    if (!user?.id) return;
    setLoadingApps(true);
    try {
      const r = await axios.get('/leave-applications', {
        params: { staff_id: user.id },
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      setApplications(r.data?.data || []);
    } catch {
      setApplications([]);
    }
    setLoadingApps(false);
  }, [user?.id, token]);

  useEffect(() => { loadApplications(); }, [loadApplications]);

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

  const holidayYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const years = holidays
      .map((h) => extractDateKey(h.start || h.date || h.start_date))
      .filter(Boolean)
      .map((key) => Number(key.slice(0, 4)))
      .filter((y) => Number.isFinite(y));

    const set = new Set([currentYear - 1, currentYear, currentYear + 1, ...years]);
    return Array.from(set).sort((a, b) => a - b);
  }, [holidays]);

  useEffect(() => {
    if (!holidays.length) return;

    const hasVisibleMonthData = holidays.some((h) => {
      const key = extractDateKey(h.start || h.date || h.start_date);
      if (!key) return false;
      return key.startsWith(`${calYear}-${String(calMonth + 1).padStart(2, '0')}-`);
    });

    if (hasVisibleMonthData) return;

    const firstHolidayKey = holidays
      .map((h) => extractDateKey(h.start || h.date || h.start_date))
      .filter(Boolean)
      .sort()[0];

    if (!firstHolidayKey) return;

    const targetYear = Number(firstHolidayKey.slice(0, 4));
    const targetMonth = Number(firstHolidayKey.slice(5, 7)) - 1;

    if (Number.isFinite(targetYear) && Number.isFinite(targetMonth)) {
      setCalYear(targetYear);
      setCalMonth(targetMonth);
    }
  }, [holidays, calYear, calMonth]);

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
    () => leaveTypes.filter((leaveType) => normalizeLeaveStatus(leaveType?.status) === 'active'),
    [leaveTypes],
  );

  const selectedLeaveType = useMemo(
    () => activeLeaveTypes.find((leaveType) => String(leaveType.id) === String(form.leave_id)),
    [activeLeaveTypes, form.leave_id],
  );

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

  // ── form handlers ────────────────────────────────────────────────────────
  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'start_date') return;
    setForm((f) => ({ ...f, [name]: value }));
    setFormError('');
  };

  const openApplyModalForDate = (dateKey) => {
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

    if (!form.leave_id)    return setFormError('Please select a leave type.');
    if (!form.start_date)  return setFormError('Please select a start date.');
    if (!form.end_date)    return setFormError('Please select an end date.');
    if (!form.reason.trim()) return setFormError('Please enter a reason.');
    if (noOfDays === null) return setFormError('End date must be on or after start date.');

    setSubmitting(true);
    try {
      await axios.post(
        '/leave-applications',
        {
          staff_id: user?.id,
          leave_id: Number(form.leave_id),
          start_date: form.start_date,
          end_date: form.end_date,
          cl_type: form.cl_type,
          reason: form.reason.trim(),
        },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} },
      );
      notify('Leave application submitted successfully.');
      setForm(emptyForm);
      setIsApplyModalOpen(false);
      loadApplications();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to submit application. Please try again.';
      setFormError(msg);
    }
    setSubmitting(false);
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
              <p className="mt-1 text-sm text-slate-500">
                Apply for leave and view the holiday calendar for {calYear}.
              </p>
              {holidayLoadError ? (
                <p className="mt-2 text-xs text-red-600">{holidayLoadError}</p>
              ) : (
                <p className="mt-2 text-xs text-slate-400">Holiday/RH records loaded: {Array.isArray(holidays) ? holidays.length : 0}</p>
              )}
            </div>

            <div>
              <LeaveCalendar
                year={calYear}
                month={calMonth}
                onYearChange={setCalYear}
                onMonthChange={setCalMonth}
                holidayMap={holidayMap}
                rhMap={rhMap}
                availableYears={holidayYears}
                onDateClick={openApplyModalForDate}
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
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {isSingleDayCL && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Day Type</label>
                      <select
                        name="cl_type"
                        value={form.cl_type}
                        onChange={handleChange}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="Full">Full Day</option>
                        <option value="First Half">First Half</option>
                        <option value="Second Half">Second Half</option>
                      </select>
                    </div>
                  )}

                  {noOfDays !== null && (
                    <div className="text-sm text-slate-600 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                      Duration: <span className="font-semibold text-blue-700">{noOfDays} day{noOfDays !== 1 ? 's' : ''}</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Reason <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      name="reason"
                      value={form.reason}
                      onChange={handleChange}
                      rows={3}
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

            {/* My Applications */}
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <h3 className="text-base font-semibold text-slate-800">My Leave Applications</h3>
              </div>

              {loadingApps ? (
                <div className="p-6 text-center text-sm text-slate-400">Loading applications…</div>
              ) : applications.length === 0 ? (
                <div className="p-6 text-center text-sm text-slate-400">No leave applications found.</div>
              ) : (
                <>
                  <div className="sm:hidden p-3 space-y-3">
                    {applications.map((app, idx) => (
                      <div key={app.id} className="rounded-lg border border-slate-200 bg-white p-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs text-slate-400">#{idx + 1}</p>
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

                  <div className="hidden sm:block overflow-x-auto">
                    <table className="w-full text-sm text-slate-700">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                        {['#','Leave Type','From','To','Days','Reason','Status'].map((h) => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {applications.map((app, idx) => (
                        <tr key={app.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 text-slate-400 text-xs">{idx + 1}</td>
                          <td className="px-4 py-3 font-medium">{app.leave_longname || app.leave_shortname || '—'}</td>
                          <td className="px-4 py-3 whitespace-nowrap">{formatDate(app.start_date)}</td>
                          <td className="px-4 py-3 whitespace-nowrap">{formatDate(app.end_date)}</td>
                          <td className="px-4 py-3">{app.no_of_days ?? '—'}</td>
                          <td className="px-4 py-3 max-w-xs truncate text-slate-500">{app.reason || '—'}</td>
                          <td className="px-4 py-3">{statusBadge(app.status)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  </div>
                </>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
