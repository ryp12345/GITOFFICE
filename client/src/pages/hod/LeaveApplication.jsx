import { useEffect, useMemo, useState } from 'react';
import Notification from '../../components/common/Notification';
import Header from '../../components/layout/Header';
import SidebarHOD from '../../components/layout/SidebarHOD';
import { useAuth } from '../../context/AuthContext';
import axios from '../../api/axios';
import {
  bulkUpdateHodLeaveApplications,
  getHodLeaveApplications,
  recommendHodLeaveApplication,
  rejectHodLeaveApplication,
} from '../../api/hodApi';
import { getLeaveEntitlementMeta } from '../../api/leaveEntitlementApi';
import { getHolidayRHList } from '../../api/holidayrhApi';

const MAIN_TABS = {
  LIST: 'list',
  CALENDAR: 'calendar',
};

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function isFirstOrThirdSaturday(date) {
  if (date.getDay() !== 6) return false;
  const nth = Math.ceil(date.getDate() / 7);
  return nth === 1 || nth === 3;
}

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

function toHolidayArray(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.rows)) return payload.rows;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
}

function buildCalendarGrid(year, month) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const grid = [];
  let day = 1 - firstDay;

  for (let row = 0; row < 6; row += 1) {
    const week = [];
    for (let col = 0; col < 7; col += 1, day += 1) {
      if (day < 1 || day > daysInMonth) week.push(null);
      else week.push(new Date(year, month, day));
    }
    grid.push(week);
    if (day > daysInMonth) break;
  }
  return grid;
}

function LeaveCalendar({ year, month, onYearChange, onMonthChange, holidayMap, rhMap, leaveMap, onDateClick, selectedDate }) {
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

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
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
            {MONTHS.map((name, index) => (
              <option key={name} value={index}>{name}</option>
            ))}
          </select>
          <select
            value={year}
            onChange={(e) => onYearChange(Number(e.target.value))}
            className="text-xs sm:text-sm font-semibold bg-transparent border-none outline-none cursor-pointer text-slate-800"
          >
            {Array.from({ length: 11 }, (_, i) => new Date().getFullYear() - 5 + i).map((optionYear) => (
              <option key={optionYear} value={optionYear}>{optionYear}</option>
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

      <div className="grid grid-cols-7 border-b border-slate-100">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((dayName) => (
          <div key={dayName} className="py-1.5 sm:py-2 text-center text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wide">
            {dayName}
          </div>
        ))}
      </div>

      <div className="divide-y divide-slate-100">
        {grid.map((week, weekIndex) => (
          <div key={weekIndex} className="grid grid-cols-7">
            {week.map((date, dateIndex) => {
              if (!date) return <div key={dateIndex} className="h-14 sm:h-16 bg-slate-50/50" />;

              const key = toDateStr(date);
              const isToday = key === today;
              const holidayTitle = holidayMap[key];
              const rhTitle = rhMap[key];
              const dayLeaves = leaveMap[key] || [];
              const isFTS = isFirstOrThirdSaturday(date);
              const isSun = date.getDay() === 0;

              return (
                <button
                  type="button"
                  key={dateIndex}
                  onClick={() => onDateClick?.(key)}
                  className={`h-20 sm:h-24 p-1 border-l border-slate-100 first:border-l-0 flex flex-col text-left ${getDayStyle(date)} ${selectedDate === key ? 'ring-2 ring-blue-400' : ''}`}
                >
                  <span className={`self-end text-[10px] sm:text-xs w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center rounded-full font-medium ${isToday ? 'bg-blue-600 text-white' : ''}`}>
                    {date.getDate()}
                  </span>

                  {holidayTitle && <span className="text-[9px] sm:text-[10px] leading-tight mt-auto line-clamp-2 text-red-700">{holidayTitle}</span>}
                  {rhTitle && <span className="text-[9px] sm:text-[10px] leading-tight mt-auto line-clamp-2 text-yellow-700">{rhTitle}</span>}
                  {isFTS && !holidayTitle && !rhTitle && (
                    <span className="text-[9px] sm:text-[10px] leading-tight mt-auto text-orange-600">
                      {Math.ceil(date.getDate() / 7) === 1 ? '1st Sat' : '3rd Sat'}
                    </span>
                  )}
                  {isSun && !holidayTitle && !rhTitle && dayLeaves.length === 0 && (
                    <span className="text-[10px] leading-tight mt-auto text-slate-400">Sunday</span>
                  )}

                  {dayLeaves.length > 0 && (
                    <span className="text-[10px] sm:text-xs leading-tight mt-auto font-semibold text-indigo-700">
                      {dayLeaves.length} leave{dayLeaves.length > 1 ? 's' : ''}
                    </span>
                  )}
                </button>
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

function getStatusClass(status) {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'pending') return 'bg-gray-500 text-white';
  if (normalized === 'recommended') return 'bg-yellow-500 text-white';
  if (normalized === 'approved') return 'bg-green-500 text-white';
  if (normalized === 'rejected') return 'bg-red-500 text-white';
  if (normalized === 'cancelled') return 'bg-red-500 text-white';
  return 'bg-gray-400 text-white';
}

function formatDateDMY(value) {
  if (!value) return '-';
  const raw = String(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const [year, month, day] = raw.split('-');
    return `${day}-${month}-${year}`;
  }
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return '-';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

export default function HODLeaveApplicationPage() {
  const { token } = useAuth() || {};
  const [department, setDepartment] = useState(null);
  const [rows, setRows] = useState([]);
  const [leaveTypeOptions, setLeaveTypeOptions] = useState([]);
  const [masterLeaveTypeOptions, setMasterLeaveTypeOptions] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [month, setMonth] = useState(String(new Date().getMonth() + 1));
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [activeMainTab, setActiveMainTab] = useState(MAIN_TABS.LIST);
  const [activeLeaveType, setActiveLeaveType] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState('');
  const [notification, setNotification] = useState({ show: false, message: '', type: 'info' });

  const notify = (message, type = 'success') => {
    setNotification({ show: true, message, type });
  };

  const loadRows = async () => {
    if (!token) {
      setRows([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const params = {
        month: month || undefined,
        year: year || undefined,
      };
      const response = await getHodLeaveApplications(token, params);
      const payload = response?.data?.data || {};
      setDepartment(payload.department || null);
      const nextRows = Array.isArray(payload.applications) ? payload.applications : [];
      setRows(nextRows);
      setSelectedIds([]);

      if (nextRows.length > 0) {
        const firstType = String(nextRows[0].leave_shortname || nextRows[0].title || 'Other');
        setActiveLeaveType((prev) => prev || firstType);
      } else {
        setActiveLeaveType('');
      }
    } catch (error) {
      setDepartment(null);
      setRows([]);
      setActiveLeaveType('');
      notify(error?.response?.data?.message || 'Failed to load leave applications.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, month, year]);

  useEffect(() => {
    const parsedYear = Number(year);
    const parsedMonth = Number(month);
    if (Number.isFinite(parsedYear) && Number.isFinite(parsedMonth) && parsedMonth >= 1 && parsedMonth <= 12) {
      setCalYear(parsedYear);
      setCalMonth(parsedMonth - 1);
    }
  }, [year, month]);

  useEffect(() => {
    const initialDate = `${year}-${String(month).padStart(2, '0')}-01`;
    setSelectedCalendarDate(initialDate);
  }, [year, month]);

  useEffect(() => {
    const loadLeaveTypes = async () => {
      if (!token) {
        setLeaveTypeOptions([]);
        setMasterLeaveTypeOptions([]);
        return;
      }

      try {
        const response = await getLeaveEntitlementMeta(token);
        const meta = response?.data?.data || {};
        const leaveTypes = Array.isArray(meta.leave_types) ? meta.leave_types : [];
        const normalized = leaveTypes
          .map((item) => String(item?.shortname || item?.short_name || item?.title || '').trim())
          .filter(Boolean);
        setLeaveTypeOptions(normalized);
      } catch (_error) {
        setLeaveTypeOptions([]);
      }

      try {
        const response = await axios.get('/leaves', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const leaves = Array.isArray(response?.data?.data) ? response.data.data : [];
        const normalizedMaster = leaves
          .map((item) => String(item?.shortname || item?.short_name || item?.title || '').trim())
          .filter(Boolean);
        setMasterLeaveTypeOptions(normalizedMaster);
      } catch (_error) {
        setMasterLeaveTypeOptions([]);
      }
    };

    loadLeaveTypes();
  }, [token]);

  useEffect(() => {
    const loadHolidays = async () => {
      if (!token) {
        setHolidays([]);
        return;
      }

      try {
        const response = await getHolidayRHList(token);
        let holidayRows = toHolidayArray(response?.data);

        if (!holidayRows.length) {
          const fallback = await axios.get('/holidayrhs', {
            headers: { Authorization: `Bearer ${token}` },
          });
          holidayRows = toHolidayArray(fallback?.data);
        }

        setHolidays(holidayRows);
      } catch (_error) {
        setHolidays([]);
      }
    };

    loadHolidays();
  }, [token]);

  const groupedRows = useMemo(() => {
    const grouped = {};
    for (const row of rows) {
      const key = String(row.leave_shortname || row.title || 'Other');
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(row);
    }
    return grouped;
  }, [rows]);

  const leaveTypeKeys = useMemo(() => {
    const fromRows = Object.keys(groupedRows);
    const fromMeta = leaveTypeOptions;
    const fromMaster = masterLeaveTypeOptions;
    return [...new Set([...fromMaster, ...fromMeta, ...fromRows])];
  }, [groupedRows, leaveTypeOptions, masterLeaveTypeOptions]);

  useEffect(() => {
    if (!leaveTypeKeys.length) {
      setActiveLeaveType('');
      return;
    }

    if (!activeLeaveType || !leaveTypeKeys.includes(activeLeaveType)) {
      setActiveLeaveType(leaveTypeKeys[0]);
    }
  }, [leaveTypeKeys, activeLeaveType]);

  const visibleRows = useMemo(() => {
    if (!activeLeaveType) return [];
    return groupedRows[activeLeaveType] || [];
  }, [groupedRows, activeLeaveType]);

  const holidayMap = useMemo(() => {
    const map = {};
    holidays
      .filter((item) => normalizeHolidayType(item.type) === 'holiday')
      .forEach((item) => {
        const key = extractDateKey(item.start || item.date || item.start_date);
        if (key) map[key] = item.title;
      });
    return map;
  }, [holidays]);

  const rhMap = useMemo(() => {
    const map = {};
    holidays
      .filter((item) => {
        const type = normalizeHolidayType(item.type);
        return type === 'rh' || type === 'hr';
      })
      .forEach((item) => {
        const key = extractDateKey(item.start || item.date || item.start_date);
        if (key) map[key] = item.title;
      });
    return map;
  }, [holidays]);

  const leaveMap = useMemo(() => {
    const map = {};

    for (const app of rows) {
      const status = normalizeLeaveStatus(app.appl_status || app.status);
      if (status === 'cancelled') continue;

      const start = extractDateKey(app.start_date || app.start);
      const end = extractDateKey(app.end_date || app.end);
      if (!start || !end) continue;

      const cursor = new Date(start);
      const last = new Date(end);

      while (cursor <= last) {
        const key = toDateStr(cursor);
        if (!map[key]) map[key] = [];
        map[key].push(app);
        cursor.setDate(cursor.getDate() + 1);
      }
    }

    return map;
  }, [rows]);

  const selectedDateRows = useMemo(() => {
    if (!selectedCalendarDate) return [];
    return leaveMap[selectedCalendarDate] || [];
  }, [leaveMap, selectedCalendarDate]);

  useEffect(() => {
    setSelectedIds([]);
  }, [activeLeaveType]);

  const pendingIdsOnPage = useMemo(() => {
    return visibleRows.filter((row) => row.appl_status === 'pending').map((row) => Number(row.id));
  }, [visibleRows]);

  const allPendingSelected = pendingIdsOnPage.length > 0 && pendingIdsOnPage.every((id) => selectedIds.includes(id));

  const toggleSelect = (id, enabled) => {
    const numericId = Number(id);
    if (!enabled) return;

    setSelectedIds((prev) => {
      if (prev.includes(numericId)) {
        return prev.filter((value) => value !== numericId);
      }
      return [...prev, numericId];
    });
  };

  const toggleSelectAllOnPage = () => {
    setSelectedIds((prev) => {
      if (allPendingSelected) {
        return prev.filter((id) => !pendingIdsOnPage.includes(id));
      }

      const next = new Set(prev);
      pendingIdsOnPage.forEach((id) => next.add(id));
      return Array.from(next);
    });
  };

  const handleSingleAction = async (id, action) => {
    const confirmed = window.confirm(`Are you sure you want to ${action} this leave application?`);
    if (!confirmed) return;

    setProcessing(true);
    try {
      if (action === 'recommend') {
        await recommendHodLeaveApplication(token, id);
        notify('Leave recommended successfully.');
      } else {
        await rejectHodLeaveApplication(token, id);
        notify('Leave rejected successfully.');
      }
      await loadRows();
    } catch (error) {
      notify(error?.response?.data?.message || `Failed to ${action} leave application.`, 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleBulkAction = async (action) => {
    if (selectedIds.length === 0) {
      notify('Please select at least one pending leave application.', 'error');
      return;
    }

    const confirmed = window.confirm(`Are you sure you want to ${action} selected leave applications?`);
    if (!confirmed) return;

    setProcessing(true);
    try {
      const payloadAction = action === 'recommend' ? 'recommended' : 'rejected';
      const response = await bulkUpdateHodLeaveApplications(token, payloadAction, selectedIds);
      const failed = response?.data?.data?.failed || [];
      if (failed.length > 0) {
        notify(`Completed with partial failures (${failed.length}).`, 'error');
      } else {
        notify(`Bulk ${action} completed successfully.`);
      }
      await loadRows();
    } catch (error) {
      notify(error?.response?.data?.message || `Failed to ${action} selected leaves.`, 'error');
    } finally {
      setProcessing(false);
    }
  };

  const pageTitle = department?.dept_name ? `${department.dept_name} Leave Applications` : 'Leave Applications';
  const currentYear = new Date().getFullYear();
  const yearOptions = [];
  for (let y = currentYear; y >= 2024; y -= 1) {
    yearOptions.push(String(y));
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <Header />
      <div className="flex flex-1 min-h-0">
        <SidebarHOD />
        <main className="flex-1 overflow-auto p-6">
          <div className="mx-auto max-w-7xl space-y-6">
            <Notification
              show={notification.show}
              message={notification.message}
              type={notification.type}
              onClose={() => setNotification({ show: false, message: '', type: 'info' })}
            />

            <div>
              <h1 className="text-3xl font-bold text-slate-900">{pageTitle}</h1>
              <p className="mt-2 text-slate-600">Leaves Calendar</p>
            </div>

            <div className="overflow-hidden bg-white shadow-xl rounded-xl">
              <div className="border-b border-gray-200">
                <nav className="-mb-0.5 flex justify-center space-x-6" aria-label="Tabs">
                  <button
                    type="button"
                    onClick={() => setActiveMainTab(MAIN_TABS.LIST)}
                    className={`py-4 px-2 inline-flex items-center gap-2 border-b-[3px] text-sm whitespace-nowrap ${
                      activeMainTab === MAIN_TABS.LIST
                        ? 'font-semibold border-blue-600 text-blue-700'
                        : 'border-transparent text-gray-500 hover:text-blue-600'
                    }`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="rgba(240,187,64,1)"><path d="M4.00001 20V14C4.00001 9.58172 7.58173 6 12 6C16.4183 6 20 9.58172 20 14V20H21V22H3.00001V20H4.00001ZM6.00001 14H8.00001C8.00001 11.7909 9.79087 10 12 10V8C8.6863 8 6.00001 10.6863 6.00001 14ZM11 2H13V5H11V2ZM19.7782 4.80761L21.1924 6.22183L19.0711 8.34315L17.6569 6.92893L19.7782 4.80761ZM2.80762 6.22183L4.22183 4.80761L6.34315 6.92893L4.92894 8.34315L2.80762 6.22183Z" /></svg>
                    Pending Leaves List View
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveMainTab(MAIN_TABS.CALENDAR)}
                    className={`py-4 px-2 inline-flex items-center gap-2 border-b-[3px] text-sm whitespace-nowrap ${
                      activeMainTab === MAIN_TABS.CALENDAR
                        ? 'font-semibold border-blue-600 text-blue-700'
                        : 'border-transparent text-gray-500 hover:text-blue-600'
                    }`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="rgba(240,187,64,1)"><path d="M17 3H21C21.5523 3 22 3.44772 22 4V20C22 20.5523 21.5523 21 21 21H3C2.44772 21 2 20.5523 2 20V4C2 3.44772 2.44772 3 3 3H7V1H9V3H15V1H17V3ZM4 9V19H20V9H4ZM6 11H8V13H6V11ZM11 11H13V13H11V11ZM16 11H18V13H16V11Z" /></svg>
                    Calendar View
                  </button>
                </nav>
              </div>

              {activeMainTab === MAIN_TABS.LIST ? (
                <div className="p-4 md:p-6 space-y-5">
                  <h2 className="text-xl font-semibold text-slate-800">Pending Leaves List</h2>

                  <div className="flex flex-wrap items-center gap-3">
                    <label htmlFor="monthSelect" className="text-sm font-semibold text-slate-700">Select Month:</label>
                    <select
                      id="monthSelect"
                      value={month}
                      onChange={(e) => setMonth(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                    >
                      {Array.from({ length: 12 }).map((_, index) => {
                        const monthValue = String(index + 1);
                        const monthLabel = new Date(2024, index, 1).toLocaleString('en', { month: 'long' });
                        return <option key={monthValue} value={monthValue}>{monthLabel}</option>;
                      })}
                    </select>

                    <label htmlFor="yearSelect" className="text-sm font-semibold text-slate-700">Select Year:</label>
                    <select
                      id="yearSelect"
                      value={year}
                      onChange={(e) => setYear(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                    >
                      {yearOptions.map((yearValue) => (
                        <option key={yearValue} value={yearValue}>{yearValue}</option>
                      ))}
                    </select>
                  </div>

                  <div className="border-b border-gray-200">
                    <nav className="-mb-0.5 flex flex-wrap justify-center gap-x-6" aria-label="Leave type tabs">
                      {leaveTypeKeys.map((leaveTypeKey) => {
                        const isActive = activeLeaveType === leaveTypeKey;
                        const count = groupedRows[leaveTypeKey]?.length || 0;
                        return (
                          <button
                            key={leaveTypeKey}
                            type="button"
                            onClick={() => setActiveLeaveType(leaveTypeKey)}
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
                      })}
                    </nav>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full border border-gray-200">
                      <thead className="bg-blue-700">
                        <tr>
                          <th className="px-3 py-3 text-left text-xs font-semibold text-white">#</th>
                          <th className="px-3 py-3 text-left text-xs font-semibold text-white">Application Date</th>
                          <th className="px-3 py-3 text-left text-xs font-semibold text-white">Name</th>
                          <th className="px-3 py-3 text-left text-xs font-semibold text-white">Leave From</th>
                          <th className="px-3 py-3 text-left text-xs font-semibold text-white">Leave To</th>
                          <th className="px-3 py-3 text-left text-xs font-semibold text-white">No Of Days</th>
                          <th className="px-3 py-3 text-left text-xs font-semibold text-white">Alternate</th>
                          <th className="px-3 py-3 text-left text-xs font-semibold text-white">Status</th>
                          <th className="px-3 py-3 text-left text-xs font-semibold text-white">
                            <div className="flex items-center justify-between gap-2">
                              <span className="inline-flex items-center gap-2">
                                All
                                <input
                                  type="checkbox"
                                  checked={allPendingSelected}
                                  onChange={toggleSelectAllOnPage}
                                  title="Select all pending rows"
                                />
                              </span>
                              <span>Action</span>
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {loading ? (
                          <tr>
                            <td colSpan={9} className="px-4 py-10 text-center text-slate-500">Loading leave applications...</td>
                          </tr>
                        ) : visibleRows.length === 0 ? (
                          <tr>
                            <td colSpan={9} className="px-4 py-10 text-center text-slate-500">No leave applications found.</td>
                          </tr>
                        ) : (
                          visibleRows.map((row) => {
                            const isPending = row.appl_status === 'pending';
                            const isChecked = selectedIds.includes(Number(row.id));
                            return (
                              <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50">
                                <td className="px-3 py-3 text-sm text-slate-700">{row.id}</td>
                                <td className="px-3 py-3 text-sm text-slate-700">{formatDateDMY(row.application_date)}</td>
                                <td className="px-3 py-3 text-sm text-slate-700">{row.staff_name || 'N/A'}</td>
                                <td className="px-3 py-3 text-sm text-slate-700">{formatDateDMY(row.start_date)}</td>
                                <td className="px-3 py-3 text-sm text-slate-700">{formatDateDMY(row.end_date)}</td>
                                <td className="px-3 py-3 text-sm text-slate-700">{Number(row.no_of_days || 0)}</td>
                                <td className="px-3 py-3 text-sm text-slate-700">{row.alternate_staff || 'N/A'}</td>
                                <td className="px-3 py-3 text-sm text-slate-700">
                                  <span className={`inline-flex px-2 py-1 rounded text-xs font-semibold ${getStatusClass(row.appl_status)}`}>
                                    {row.appl_status || 'N/A'}
                                  </span>
                                </td>
                                <td className="px-3 py-3 text-sm text-slate-700">
                                  <div className="flex items-center justify-end gap-2">
                                    <input
                                      type="checkbox"
                                      value={row.id}
                                      disabled={!isPending}
                                      checked={isChecked}
                                      onChange={() => toggleSelect(row.id, isPending)}
                                    />
                                    {isPending ? (
                                      <>
                                        <button
                                          type="button"
                                          disabled={processing}
                                          onClick={() => handleSingleAction(row.id, 'recommend')}
                                          className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-slate-700 hover:bg-gray-200 disabled:opacity-50"
                                          title="Recommend"
                                        >
                                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M9.9997 15.1709L19.1921 5.97852L20.6063 7.39273L9.9997 17.9993L3.63574 11.6354L5.04996 10.2212L9.9997 15.1709Z" /></svg>
                                        </button>
                                        <button
                                          type="button"
                                          disabled={processing}
                                          onClick={() => handleSingleAction(row.id, 'reject')}
                                          className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-red-100 text-red-600 hover:bg-red-200 disabled:opacity-50"
                                          title="Reject"
                                        >
                                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M11.9997 10.5855L16.9495 5.63574L18.3637 7.04996L13.4139 11.9997L18.3637 16.9495L16.9495 18.3637L11.9997 13.4139L7.04996 18.3637L5.63574 16.9495L10.5855 11.9997L5.63574 7.04996L7.04996 5.63574L11.9997 10.5855Z" /></svg>
                                        </button>
                                      </>
                                    ) : (
                                      <span className="text-xs text-slate-400">-</span>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex justify-end items-center gap-2">
                    <button
                      type="button"
                      disabled={processing || selectedIds.length === 0}
                      onClick={() => handleBulkAction('recommend')}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                    >
                      Bulk Recommend
                    </button>
                    <button
                      type="button"
                      disabled={processing || selectedIds.length === 0}
                      onClick={() => handleBulkAction('reject')}
                      className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                    >
                      Bulk Reject
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-6">
                  <LeaveCalendar
                    year={calYear}
                    month={calMonth}
                    onYearChange={(nextYear) => {
                      setCalYear(nextYear);
                      setYear(String(nextYear));
                    }}
                    onMonthChange={(nextMonth) => {
                      setCalMonth(nextMonth);
                      setMonth(String(nextMonth + 1));
                    }}
                    holidayMap={holidayMap}
                    rhMap={rhMap}
                    leaveMap={leaveMap}
                    selectedDate={selectedCalendarDate}
                    onDateClick={(dateKey) => setSelectedCalendarDate(dateKey)}
                  />

                  <div className="mt-6 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
                      <h3 className="text-sm font-semibold text-slate-800">
                        Leave List for {selectedCalendarDate ? formatDateDMY(selectedCalendarDate) : 'Selected Date'}
                      </h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full border-collapse">
                        <thead className="bg-blue-700">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-white">Application ID</th>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-white">Name</th>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-white">Leave</th>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-white">From</th>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-white">To</th>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-white">Days</th>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-white">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedDateRows.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-500">No leave applications on this date.</td>
                            </tr>
                          ) : (
                            selectedDateRows.map((row) => (
                              <tr key={`${row.id}-${row.staff_id || 'staff'}`} className="border-t border-slate-100">
                                <td className="px-3 py-2 text-sm text-slate-700">{row.id}</td>
                                <td className="px-3 py-2 text-sm text-slate-700">{row.staff_name || 'N/A'}</td>
                                <td className="px-3 py-2 text-sm text-slate-700">{row.leave_shortname || row.title || 'N/A'}</td>
                                <td className="px-3 py-2 text-sm text-slate-700">{formatDateDMY(row.start_date)}</td>
                                <td className="px-3 py-2 text-sm text-slate-700">{formatDateDMY(row.end_date)}</td>
                                <td className="px-3 py-2 text-sm text-slate-700">{Number(row.no_of_days || 0)}</td>
                                <td className="px-3 py-2 text-sm text-slate-700">
                                  <span className={`inline-flex px-2 py-1 rounded text-xs font-semibold ${getStatusClass(row.appl_status)}`}>
                                    {row.appl_status || 'N/A'}
                                  </span>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
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
