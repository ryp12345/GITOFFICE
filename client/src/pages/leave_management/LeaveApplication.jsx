import { useEffect, useMemo, useState, useRef } from 'react';
import { isRoleMatch, ROLE_DEAN_ADMIN, ROLE_PRINCIPAL } from '../../utils/role';
import Notification from '../../components/common/Notification';
import Header from '../../components/layout/Header';
import Sidebar from '../../components/layout/Sidebar';
import { useAuth } from '../../context/AuthContext';
import axios from '../../api/axios';
import {
  bulkUpdateHodLeaveApplications,
  getHodLeaveApplications,
  recommendHodLeaveApplication,
  rejectHodLeaveApplication,
} from '../../api/hodApi';
import {
  getDeanLeaveApplications,
  approveDeanLeaveApplication,
  rejectDeanLeaveApplication,
} from '../../api/deanApi';
import {
  getPrincipalLeaveApplications,
  approvePrincipalLeaveApplication,
  rejectPrincipalLeaveApplication,
} from '../../api/principalApi';
import { getLeaveEntitlementMeta } from '../../api/leaveEntitlementApi';
import { getHolidayRHList } from '../../api/holidayrhApi';

const MAIN_TABS = {
  LIST: 'list',
  ALL_LIST: 'all_list',
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

export default function LeaveApplicationPage() {
  const { token, user } = useAuth() || {};

  const isDean = isRoleMatch(user?.role, ROLE_DEAN_ADMIN);
  const isPrincipal = isRoleMatch(user?.role, ROLE_PRINCIPAL);
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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeModalLeaveType, setActiveModalLeaveType] = useState('');
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
      const response = isDean
        ? await getDeanLeaveApplications(token, params)
        : isPrincipal
        ? await getPrincipalLeaveApplications(token, params)
        : await getHodLeaveApplications(token, params);
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

  const sourceRows = useMemo(() => {
    if (activeMainTab === MAIN_TABS.ALL_LIST) return rows;
    // For principal, Laravel shows only those pending/recommended rows that have
    // an additional designation/alternate OR are >4 days and recommended.
    if (isPrincipal) {
      return rows.filter((row) => {
        const status = normalizeLeaveStatus(row.appl_status || row.status);
        if (!(status === 'pending' || status === 'recommended')) return false;
        const hasAdditional = Boolean(row.additional || row.additional_designation_names || row.additional_alternate || row.additional_alternate_staff || row.additional_alternate_staff);
        const noOfDays = Number(row.no_of_days || 0);
        return hasAdditional || (noOfDays > 4 && status === 'recommended');
      });
    }

    return rows.filter((row) => {
      const status = normalizeLeaveStatus(row.appl_status || row.status);
      return status === 'pending' || status === 'recommended';
    });
  }, [rows, activeMainTab]);

  const groupedRows = useMemo(() => {
    const grouped = {};
    for (const row of sourceRows) {
      const key = String(row.leave_shortname || row.title || 'Other');
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(row);
    }
    return grouped;
  }, [sourceRows]);

  const leaveTypeKeys = useMemo(() => {
    const fromRows = Object.keys(groupedRows);
    const fromMeta = leaveTypeOptions;
    const fromMaster = masterLeaveTypeOptions;
    return [...new Set([...fromMaster, ...fromMeta, ...fromRows])];
  }, [groupedRows, leaveTypeOptions, masterLeaveTypeOptions]);

  const prevLeaveKeysLenRef = useRef(0);

  useEffect(() => {
    if (!leaveTypeKeys.length) {
      setActiveLeaveType('');
      prevLeaveKeysLenRef.current = 0;
      return;
    }

    const initialLoad = prevLeaveKeysLenRef.current === 0 && leaveTypeKeys.length > 0;

    if (initialLoad) {
      if (leaveTypeKeys.includes('CL')) setActiveLeaveType('CL');
      else setActiveLeaveType(leaveTypeKeys[0]);
    } else if (!activeLeaveType || !leaveTypeKeys.includes(activeLeaveType)) {
      if (leaveTypeKeys.includes('CL')) setActiveLeaveType('CL');
      else setActiveLeaveType(leaveTypeKeys[0]);
    }

    prevLeaveKeysLenRef.current = leaveTypeKeys.length;
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

  const modalLeaveTypeKeys = useMemo(() => {
    // Show all known leave types in the modal tabs (fall back to types on the date)
    if (Array.isArray(leaveTypeKeys) && leaveTypeKeys.length > 0) return leaveTypeKeys;
    const keys = Array.from(new Set((selectedDateRows || []).map((r) => String(r.leave_shortname || r.title || 'Other'))));
    return keys;
  }, [leaveTypeKeys, selectedDateRows]);

  useEffect(() => {
    if (!modalLeaveTypeKeys.length) {
      setActiveModalLeaveType('');
      return;
    }
    if (!activeModalLeaveType || !modalLeaveTypeKeys.includes(activeModalLeaveType)) {
      if (modalLeaveTypeKeys.includes('CL')) {
        setActiveModalLeaveType('CL');
      } else {
        setActiveModalLeaveType(modalLeaveTypeKeys[0]);
      }
    }
  }, [modalLeaveTypeKeys, activeModalLeaveType]);

  const modalVisibleRows = useMemo(() => {
    if (!modalLeaveTypeKeys.length) return selectedDateRows;
    if (!activeModalLeaveType) return selectedDateRows;
    return (selectedDateRows || []).filter((r) => String(r.leave_shortname || r.title || 'Other') === activeModalLeaveType);
  }, [selectedDateRows, modalLeaveTypeKeys, activeModalLeaveType]);

  useEffect(() => {
    setSelectedIds([]);
  }, [activeLeaveType, activeMainTab]);

  const pendingIdsOnPage = useMemo(() => {
    return visibleRows
      .filter((row) => {
        const status = normalizeLeaveStatus(row.appl_status || row.status);
        const hasAdditional = Boolean(row.additional || row.additional_alternate || row.additional_staff || row.additionalAlternate);
        const noOfDays = Number(row.no_of_days || 0);
        if (isDean) return status === 'recommended';
        if (isPrincipal) return status === 'recommended' && (hasAdditional || noOfDays > 4);
        return status === 'pending';
      })
      .map((row) => Number(row.id));
  }, [visibleRows, isDean, isPrincipal]);

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

  const handleDeanApprove = async (applicationId) => {
    const confirmed = window.confirm('Are you sure you want to Approve this leave application?');
    if (!confirmed) return;
    setProcessing(true);
    try {
      await approveDeanLeaveApplication(token, applicationId);
      notify('Leave approved successfully.');
      await loadRows();
    } catch (error) {
      notify(error?.response?.data?.message || 'Failed to approve leave.', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleDeanReject = async (applicationId) => {
    const confirmed = window.confirm('Are you sure you want to Reject this leave application?');
    if (!confirmed) return;
    setProcessing(true);
    try {
      await rejectDeanLeaveApplication(token, applicationId);
      notify('Leave rejected successfully.');
      await loadRows();
    } catch (error) {
      notify(error?.response?.data?.message || 'Failed to reject leave.', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handlePrincipalApprove = async (applicationId) => {
    const confirmed = window.confirm('Are you sure you want to Approve this leave application?');
    if (!confirmed) return;
    setProcessing(true);
    try {
      await approvePrincipalLeaveApplication(token, applicationId);
      notify('Leave approved successfully.');
      await loadRows();
    } catch (error) {
      notify(error?.response?.data?.message || 'Failed to approve leave.', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handlePrincipalReject = async (applicationId) => {
    const confirmed = window.confirm('Are you sure you want to Reject this leave application?');
    if (!confirmed) return;
    setProcessing(true);
    try {
      await rejectPrincipalLeaveApplication(token, applicationId);
      notify('Leave rejected successfully.');
      await loadRows();
    } catch (error) {
      notify(error?.response?.data?.message || 'Failed to reject leave.', 'error');
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

  const handleDeanBulkAction = async (action) => {
    if (selectedIds.length === 0) {
      notify('Please select at least one pending leave application.', 'error');
      return;
    }

    const verb = action === 'approve' ? 'approve' : 'reject';
    const confirmed = window.confirm(`Are you sure you want to ${verb} selected leave applications?`);
    if (!confirmed) return;

    setProcessing(true);
    try {
      const failed = [];
      for (const id of selectedIds) {
        try {
          if (action === 'approve') {
            // Dean/Principal flow maps to approve/reject, not recommend/reject.
            // eslint-disable-next-line no-await-in-loop
            if (isPrincipal) await approvePrincipalLeaveApplication(token, id);
            else await approveDeanLeaveApplication(token, id);
          } else {
            // eslint-disable-next-line no-await-in-loop
            if (isPrincipal) await rejectPrincipalLeaveApplication(token, id);
            else await rejectDeanLeaveApplication(token, id);
          }
        } catch (error) {
          failed.push({ id, message: error?.response?.data?.message || 'Failed' });
        }
      }

      if (failed.length > 0) {
        notify(`Completed with partial failures (${failed.length}).`, 'error');
      } else {
        notify(`Bulk ${verb} completed successfully.`);
      }
      await loadRows();
    } catch (error) {
      notify(error?.response?.data?.message || `Failed to ${verb} selected leaves.`, 'error');
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
        <Sidebar />
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
                    Pending/Recommended Leaves List
                  </button>
                    {(isDean || isPrincipal) && (
                    <button
                      type="button"
                      onClick={() => setActiveMainTab(MAIN_TABS.ALL_LIST)}
                      className={`py-4 px-2 inline-flex items-center gap-2 border-b-[3px] text-sm whitespace-nowrap ${
                        activeMainTab === MAIN_TABS.ALL_LIST
                          ? 'font-semibold border-blue-600 text-blue-700'
                          : 'border-transparent text-gray-500 hover:text-blue-600'
                      }`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M19.5611 12.0985L21.0926 14.7501C22.0591 16.4241 21.4855 18.5647 19.8115 19.5312C19.2794 19.8384 18.6759 20.0001 18.0615 20.0001L15.9993 19.9995V22.0001L10.9993 18.5001L15.9993 15.0001V16.9995L18.0615 17.0001C18.1493 17.0001 18.2355 16.977 18.3115 16.9331C18.5241 16.8104 18.6124 16.5551 18.5325 16.332L18.4945 16.2501L16.9631 13.5985L19.5611 12.0985ZM7.73617 9.38407L8.26726 15.4642L6.53571 14.4645L5.50412 16.2501C5.46023 16.3261 5.43713 16.4123 5.43713 16.5001C5.43713 16.7456 5.614 16.9497 5.84725 16.992L5.93713 17.0001L8.99919 16.9997V19.9996L5.93713 20.0001C4.00413 20.0001 2.43713 18.4331 2.43713 16.5001C2.43713 15.8857 2.59885 15.2822 2.90604 14.7501L3.93763 12.9645L2.20508 11.9642L7.73617 9.38407ZM13.7493 2.96901C14.2814 3.2762 14.7232 3.71803 15.0304 4.2501L16.061 6.03629L17.7935 5.03599L17.2624 11.1161L11.7314 8.53599L13.4629 7.53629L12.4323 5.7501C12.3884 5.67409 12.3253 5.61097 12.2493 5.56708C12.0367 5.44435 11.7715 5.49546 11.6182 5.67629L11.5663 5.7501L10.0356 8.40209L7.4376 6.90216L8.96822 4.2501C9.93472 2.57607 12.0753 2.00251 13.7493 2.96901Z"></path></svg>
                      All Leaves Application List
                    </button>
                  )}
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

              {activeMainTab === MAIN_TABS.LIST || activeMainTab === MAIN_TABS.ALL_LIST ? (
                <div className="p-4 md:p-6 space-y-5">
                  <h2 className="text-xl font-semibold text-slate-800">
                    {activeMainTab === MAIN_TABS.ALL_LIST ? 'All Leaves Application List' : 'Pending/Recommended Leaves List'}
                  </h2>

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
                          <th className="px-3 py-3 text-left text-xs font-semibold text-white">S.NO</th>
                          <th className="px-3 py-3 text-left text-xs font-semibold text-white">Application ID</th>
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
                                  disabled={pendingIdsOnPage.length === 0}
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
                            <td colSpan={10} className="px-4 py-10 text-center text-slate-500">Loading leave applications...</td>
                          </tr>
                        ) : visibleRows.length === 0 ? (
                          <tr>
                            <td colSpan={10} className="px-4 py-10 text-center text-slate-500">No leave applications found.</td>
                          </tr>
                        ) : (
                          visibleRows.map((row, index) => {
                            const status = normalizeLeaveStatus(row.appl_status || row.status);
                            const isPending = status === 'pending';
                            const hasAdditional = Boolean(row.additional || row.additional_alternate || row.additional_staff || row.additionalAlternate);
                            const noOfDays = Number(row.no_of_days || 0);
                            const canDeanAct = isPrincipal
                              ? (status === 'recommended' && (hasAdditional || noOfDays > 4))
                              : status === 'recommended';
                            const canHodAct = status === 'pending';
                            const isApprover = isDean || isPrincipal;
                            const isActionable = isApprover ? canDeanAct : canHodAct;
                            const isChecked = selectedIds.includes(Number(row.id));
                            return (
                              <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50">
                                <td className="px-3 py-3 text-sm text-slate-700">{index + 1}</td>
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
                                      disabled={!isActionable}
                                      checked={isChecked}
                                      onChange={() => toggleSelect(row.id, isActionable)}
                                    />
                                    {(isDean || isPrincipal) ? (
                                      canDeanAct ? (
                                        <>
                                          <button
                                            type="button"
                                            disabled={processing}
                                            onClick={() => (isPrincipal ? handlePrincipalApprove(row.id) : handleDeanApprove(row.id))}
                                            className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                                            title="Approve"
                                          >
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M9.9997 15.1709L19.1921 5.97852L20.6063 7.39273L9.9997 17.9993L3.63574 11.6354L5.04996 10.2212L9.9997 15.1709Z"></path></svg>
                                          </button>
                                          <button
                                            type="button"
                                            disabled={processing}
                                            onClick={() => (isPrincipal ? handlePrincipalReject(row.id) : handleDeanReject(row.id))}
                                            className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                                            title="Reject"
                                          >
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M11.9997 10.5855L16.9495 5.63574L18.3637 7.04996L13.4139 11.9997L18.3637 16.9495L16.9495 18.3637L11.9997 13.4139L7.04996 18.3637L5.63574 16.9495L10.5855 11.9997L5.63574 7.04996L7.04996 5.63574L11.9997 10.5855Z"></path></svg>
                                          </button>
                                        </>
                                      ) : isPending ? (
                                        <span className="text-xs text-slate-500">Waiting for Recommendation</span>
                                      ) : (
                                        <span className="text-xs text-slate-400">-</span>
                                      )
                                    ) : canHodAct ? (
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
                      onClick={() => ((isDean || isPrincipal) ? handleDeanBulkAction('approve') : handleBulkAction('recommend'))}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                    >
                      {(isDean || isPrincipal) ? 'Approve' : 'Bulk Recommend'}
                    </button>
                    <button
                      type="button"
                      disabled={processing || selectedIds.length === 0}
                      onClick={() => ((isDean || isPrincipal) ? handleDeanBulkAction('reject') : handleBulkAction('reject'))}
                      className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                    >
                      {(isDean || isPrincipal) ? 'Reject' : 'Bulk Reject'}
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
                    onDateClick={(dateKey) => {
                      setSelectedCalendarDate(dateKey);
                      setIsModalOpen(true);
                    }}
                  />

                  {isModalOpen && (
                    <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
                      <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={() => setIsModalOpen(false)} />

                      <div className="flex min-h-full items-center justify-center p-4">
                        <div className="relative max-w-5xl w-full bg-white rounded-lg shadow-xl max-h-[85vh] overflow-auto">
                          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50">
                            <h3 className="text-sm font-semibold text-slate-800">Leave List for {selectedCalendarDate ? formatDateDMY(selectedCalendarDate) : 'Selected Date'}</h3>
                            <button className="text-slate-600 hover:text-slate-800" type="button" onClick={() => setIsModalOpen(false)}>✕</button>
                          </div>

                          <div className="p-4 overflow-x-auto">
                            <div className="border-b border-gray-200 mb-3">
                              <nav className="-mb-0.5 flex flex-wrap justify-center gap-x-6" aria-label="Leave type tabs in modal">
                                {modalLeaveTypeKeys.length === 0 ? (
                                  <div className="py-3 text-sm text-slate-500">No leave types</div>
                                ) : (
                                  modalLeaveTypeKeys.map((lt) => {
                                    const count = (selectedDateRows || []).filter((r) => String(r.leave_shortname || r.title || 'Other') === lt).length;
                                    const isActive = activeModalLeaveType === lt;
                                    return (
                                      <button
                                        key={lt}
                                        type="button"
                                        onClick={() => setActiveModalLeaveType(lt)}
                                        className={`py-3 px-1 inline-flex items-center gap-2 border-b-[3px] whitespace-nowrap ${isActive ? 'font-semibold border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-blue-600'}`}
                                      >
                                        <span className="text-base">{lt}</span>
                                        {count > 0 && (
                                          <span className="inline-flex items-center justify-center min-w-[22px] h-5 px-1 text-xs font-medium rounded-full bg-yellow-500 text-white">
                                            {count}
                                          </span>
                                        )}
                                      </button>
                                    );
                                  })
                                )}
                              </nav>
                            </div>

                            <table className="min-w-full border-collapse">
                              <thead className="bg-blue-700">
                                <tr>
                                  <th className="px-3 py-2 text-left text-xs font-semibold text-white">S.NO</th>
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
                                {modalVisibleRows.length === 0 ? (
                                  <tr>
                                    <td colSpan={8} className="px-4 py-8 text-center text-sm text-slate-500">No leave applications on this date.</td>
                                  </tr>
                                ) : (
                                  modalVisibleRows.map((row, index) => (
                                    <tr key={`${row.id}-${row.staff_id || 'staff'}`} className="border-t border-slate-100">
                                      <td className="px-3 py-2 text-sm text-slate-700">{index + 1}</td>
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

                          <div className="flex justify-end gap-3 px-4 py-3 border-t bg-slate-50">
                            <button type="button" onClick={() => setIsModalOpen(false)} className="inline-flex justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">Close</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
