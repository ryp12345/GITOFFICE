const mysql = require('mysql2/promise');
require('dotenv').config();
const { pool: pgPool } = require('../config/db');
const ExcelJS = require('exceljs');
const { findDepartmentByHodUserId } = require('../models/hodDepartmentOverview.model');

const SECONDARY_DB = {
    host: process.env.DB_SECONDARY_HOST || '127.0.0.1',
    port: Number(process.env.DB_SECONDARY_PORT || 3306),
    user: process.env.DB_SECONDARY_USERNAME || 'root',
    password: process.env.DB_SECONDARY_PASSWORD || '',
    database: process.env.DB_SECONDARY_DATABASE,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
};

// DATE columns come back as Date objects at local midnight; format them as local YYYY-MM-DD
// (toISOString would shift them to the previous day in IST).
function toYmd(value) {
  if (!value) return null;
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function ymdToLocalDate(ymd) {
  const [y, m, d] = String(ymd).split('-').map(Number);
  return new Date(y, m - 1, d);
}

// Institute weekly offs: every Sunday plus the 1st and 3rd Saturday of the month.
function isWeeklyOff(date) {
  const dow = date.getDay();
  if (dow === 0) return true;
  if (dow !== 6) return false;
  const weekOfMonth = Math.floor((date.getDate() - 1) / 7) + 1;
  return weekOfMonth === 1 || weekOfMonth === 3;
}

function formatDurationFromSeconds(totalSeconds) {
  if (!totalSeconds || totalSeconds <= 0) return null;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return `${hours} hrs ${minutes} mins`;
}

async function buildEntryExitForDate(month, year, date, allowedCodes = null) {
  const tableName = `DeviceLogs_${month}_${year}`;
  const mysqlPool = mysql.createPool(SECONDARY_DB);
  const conn = await mysqlPool.getConnection();
  try {
    const [rowsRaw] = await conn.query(
      `SELECT l.LogDate, l.LogDate_Date, l.EmployeeCode, d.DeviceFname as DeviceFName, e.EmployeeName
       FROM \`${tableName}\` l
       JOIN devices d ON l.DeviceId = d.DeviceId
       JOIN employees e ON l.EmployeeCode = e.EmployeeCode
       WHERE l.LogDate_Date = ?
       ORDER BY l.EmployeeCode, l.LogDate ASC`,
      [date]
    );

    let rows = rowsRaw;
    if (allowedCodes && allowedCodes.size > 0) {
      rows = rowsRaw.filter(r => allowedCodes.has(String(r.EmployeeCode)));
    }

    const logsByEmp = {};
    for (const r of rows) {
      const code = r.EmployeeCode;
      if (!logsByEmp[code]) logsByEmp[code] = [];
      logsByEmp[code].push(r);
    }

    const entryLogs = {};
    const exitLogs = {};
    const employeePunchLogs = {};
    const durations = {};
    const punchCounts = {};

    let oddCount = 0;
    let evenCount = 0;

    for (const [code, empLogs] of Object.entries(logsByEmp)) {
      const sorted = empLogs.sort((a, b) => new Date(a.LogDate) - new Date(b.LogDate));

      const filtered = [];
      for (const log of sorted) {
        if (filtered.length === 0) {
          filtered.push(log);
        } else {
          const last = filtered[filtered.length - 1];
          const lastTS = new Date(last.LogDate).getTime() / 1000;
          const currTS = new Date(log.LogDate).getTime() / 1000;
          if ((currTS - lastTS) > 60) filtered.push(log);
        }
      }

      employeePunchLogs[code] = filtered;
      punchCounts[code] = filtered.length;
      if (filtered.length % 2 === 0) evenCount++; else oddCount++;

      if (filtered.length > 0) {
        entryLogs[code] = filtered[0];
        exitLogs[code] = filtered.length > 1 ? filtered[filtered.length - 1] : null;
      }

      let totalSeconds = 0;
      for (let i = 0; i < filtered.length - 1; i += 2) {
        const e = filtered[i];
        const x = filtered[i + 1];
        if (e && x) {
          const diff = (new Date(x.LogDate).getTime() - new Date(e.LogDate).getTime()) / 1000;
          if (diff > 0) totalSeconds += diff;
        }
      }

      durations[code] = formatDurationFromSeconds(totalSeconds);
    }

    await mysqlPool.end();

    return {
      entryLogs,
      exitLogs,
      employeePunchLogs,
      punchCounts,
      durations,
      oddCount,
      evenCount,
    };
  } finally {
    try { conn.release(); } catch (e) {}
  }
}

async function getDailyBiometric(dateStr, departmentId = null) {
  const date = new Date(dateStr || new Date().toISOString().slice(0, 10));
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  const dateParam = dateStr || new Date().toISOString().slice(0, 10);

  // Build combinedData from external logs ordered by LogDate desc, then EmployeeName (matches Laravel)
  const tableName = `DeviceLogs_${month}_${year}`;
  const mysqlPool = mysql.createPool(SECONDARY_DB);
  const conn = await mysqlPool.getConnection();
  let combinedData = [];
  try {
    const [externalRows] = await conn.query(
      `SELECT l.LogDate, l.LogDate_Date, l.EmployeeCode, d.DeviceFname as DeviceFName, e.EmployeeName
       FROM \`${tableName}\` l
       JOIN devices d ON l.DeviceId = d.DeviceId
       JOIN employees e ON l.EmployeeCode = e.EmployeeCode
       WHERE l.LogDate_Date = ?
       ORDER BY l.LogDate DESC, e.EmployeeName ASC`,
      [dateParam]
    );

    const processed = new Set();
    for (const r of externalRows) {
      const code = r.EmployeeCode;
      if (!processed.has(code)) {
        processed.add(code);
        combinedData.push({
          EmployeeCode: code,
          EmployeeName: r.EmployeeName || null,
          DepartmentName: null,
        });
      }
    }
  } finally {
    try { conn.release(); } catch (e) {}
    try { await mysqlPool.end(); } catch (e) {}
  }

  // If departmentId provided, resolve employee codes for that department so we can
  // compute entry/exit counts only for those employees and filter combinedData.
  let deptCodes = null;
  if (departmentId) {
    try {
      const depRes = await pgPool.query(
        `SELECT s.employeecode::text AS employeecode FROM staff s JOIN department_staff ds ON ds.staff_id = s.id WHERE ds.department_id = $1 AND LOWER(COALESCE(ds.status,'active')) = 'active'`,
        [departmentId]
      );
      deptCodes = new Set((depRes.rows || []).map(r => String(r.employeecode)));
    } catch (e) {
      console.warn('Failed to resolve department employee codes', e && e.message);
    }
  }

  const entry_exit = await buildEntryExitForDate(month, year, dateParam, deptCodes);

  // Enrich combinedData with department shortnames from Postgres staff tables
  try {
    if (combinedData.length > 0) {
      // Try to use integer array if employee codes are numeric to avoid type mismatch
      const rawCodes = combinedData.map(c => c.EmployeeCode);
      const intCodes = rawCodes.map((v) => {
        const n = Number(v);
        return Number.isFinite(n) ? n : null;
      }).filter((v) => v !== null);

      let deptRows = [];
      if (intCodes.length === rawCodes.length) {
        // all numeric - use int[] param
        const sql = `SELECT s.employeecode, STRING_AGG(d.dept_shortname, ', ') AS dept_shortnames FROM staff s JOIN department_staff ds ON ds.staff_id = s.id JOIN departments d ON d.id = ds.department_id WHERE s.employeecode = ANY($1::int[]) AND ds.status = 'active' GROUP BY s.employeecode`;
        const res = await pgPool.query(sql, [intCodes]);
        deptRows = res.rows;
      } else {
        // fallback - compare as text
        const textCodes = rawCodes.map((c) => c == null ? '' : String(c));
        const sql = `SELECT s.employeecode, STRING_AGG(d.dept_shortname, ', ') AS dept_shortnames FROM staff s JOIN department_staff ds ON ds.staff_id = s.id JOIN departments d ON d.id = ds.department_id WHERE s.employeecode::text = ANY($1::text[]) AND ds.status = 'active' GROUP BY s.employeecode`;
        const res = await pgPool.query(sql, [textCodes]);
        deptRows = res.rows;
      }

      const map = {};
      for (const r of deptRows) {
        map[String(r.employeecode)] = r.dept_shortnames;
      }
      for (const item of combinedData) {
        const key = String(item.EmployeeCode);
        if (map[key]) item.DepartmentName = map[key];
      }
      // If departmentId filter provided, restrict combinedData to only those employee codes
      if (departmentId && deptCodes && deptCodes.size > 0) {
        combinedData = combinedData.filter(cd => deptCodes.has(String(cd.EmployeeCode)));
      }
    }
  } catch (e) {
    console.warn('Failed to enrich biometric combinedData with departments', e && e.message);
  }
  // Build entryLogsByDept from combinedData
  const entryLogsByDept = {};
  (combinedData || []).forEach((it) => {
    const dept = it.DepartmentName || 'Unknown';
    entryLogsByDept[dept] = (entryLogsByDept[dept] || 0) + 1;
  });

  // Prepare present codes set from entry_exit.employeePunchLogs
  const presentCodes = new Set(Object.keys(entry_exit.employeePunchLogs || {}).map((c) => String(c)));

  // Compute missing and leave buckets by querying Postgres for eligible staff not present
  let leaveLogsByDept = {};
  let missingLogsByDept = {};
  let TotalLeave = 0;
  let Totalmissing = 0;

  try {
    const assocNames = ['Confirmed', 'Probationary', 'Contractual', 'Promotional Probationary', 'Temporary (non teaching)'];
    // If departmentId provided, only consider eligible staff from that department
    let sql = `WITH eligible_staff AS (
      SELECT s.id, s.employeecode::text AS employeecode,
        (SELECT STRING_AGG(d.dept_shortname, ', ') FROM department_staff ds JOIN departments d ON d.id = ds.department_id WHERE ds.staff_id = s.id AND ds.status = 'active') AS dept_shortnames,
        EXISTS (
          SELECT 1 FROM leave_staff_applications lsa WHERE lsa.staff_id = s.id AND lsa.start <= $1 AND lsa.end >= $1 AND lsa.appl_status != 'rejected'
        ) AS on_leave
      FROM staff s
      WHERE s.id IN (
        SELECT staff_id FROM association_staff WHERE status = 'active' AND association_id IN (
          SELECT id FROM associations WHERE asso_name = ANY($2::text[])
        )
      )
    )
    SELECT employeecode, dept_shortnames, on_leave FROM eligible_staff WHERE COALESCE(employeecode, '') <> ''`;
    const params = [dateParam, assocNames];
    if (departmentId) {
      // restrict eligible_staff to department
      sql = `WITH eligible_staff AS (
        SELECT s.id, s.employeecode::text AS employeecode,
          (SELECT STRING_AGG(d.dept_shortname, ', ') FROM department_staff ds JOIN departments d ON d.id = ds.department_id WHERE ds.staff_id = s.id AND ds.status = 'active') AS dept_shortnames,
          EXISTS (
            SELECT 1 FROM leave_staff_applications lsa WHERE lsa.staff_id = s.id AND lsa.start <= $1 AND lsa.end >= $1 AND lsa.appl_status != 'rejected'
          ) AS on_leave
        FROM staff s
        WHERE s.id IN (
          SELECT staff_id FROM department_staff WHERE department_id = $3 AND LOWER(COALESCE(status,'active')) = 'active'
        )
        AND s.id IN (
          SELECT staff_id FROM association_staff WHERE status = 'active' AND association_id IN (
            SELECT id FROM associations WHERE asso_name = ANY($2::text[])
          )
        )
      )
      SELECT employeecode, dept_shortnames, on_leave FROM eligible_staff WHERE COALESCE(employeecode, '') <> ''`;
      params.push(departmentId);
    }

    const res = await pgPool.query(sql, params);
    const staffRows = res.rows || [];
    for (const r of staffRows) {
      const code = String(r.employeecode || '').trim();
      if (!code || presentCodes.has(code)) continue;
      const dept = r.dept_shortnames || 'Unknown';
      if (r.on_leave) {
        TotalLeave++;
        leaveLogsByDept[dept] = (leaveLogsByDept[dept] || 0) + 1;
      } else {
        Totalmissing++;
        missingLogsByDept[dept] = (missingLogsByDept[dept] || 0) + 1;
      }
    }
  } catch (e) {
    console.warn('Failed to compute missing/leave buckets from Postgres', e && e.message);
  }

  const Totalpresent = (combinedData || []).length;

  return { combinedData, entry_exit, entryLogsByDept, leaveLogsByDept, missingLogsByDept, Totalpresent, TotalLeave, Totalmissing };
}

module.exports = { getDailyBiometric };

async function getMuster(monthParam, yearParam) {
  const month = Number(monthParam) || (new Date().getMonth() + 1);
  const year = Number(yearParam) || new Date().getFullYear();
  const tableName = `DeviceLogs_${month}_${year}`;

  const mysqlPool = mysql.createPool(SECONDARY_DB);
  const conn = await mysqlPool.getConnection();
  try {
    // distinct days
    let logDates = [];
    try {
      const [rows] = await conn.query(`SELECT DISTINCT DAY(LogDate_Date) as LogDate FROM \`${tableName}\` ORDER BY LogDate`);
      logDates = rows.map(r => ({ LogDate: r.LogDate }));
    } catch (e) {
      logDates = [];
    }

    // staffData from Postgres (eligible staff with active departments and leave applications in month)
    let staffData = [];
    try {
      const assocNames = ['Confirmed', 'Probationary', 'Contractual', 'Promotional Probationary', 'Temporary (non teaching)'];
      const sql = `SELECT s.id, s.employeecode, s.fname, s.mname, s.lname, STRING_AGG(d.dept_shortname, ', ') AS active_departments
                   FROM staff s
                   JOIN department_staff ds ON ds.staff_id = s.id
                   JOIN departments d ON d.id = ds.department_id
                   WHERE ds.status = 'active' AND s.id IN (SELECT staff_id FROM association_staff WHERE status = 'active' AND association_id IN (SELECT id FROM associations WHERE asso_name = ANY($1::text[])))
                   GROUP BY s.id, s.employeecode, s.fname, s.mname, s.lname`;
      const res = await pgPool.query(sql, [assocNames]);
      staffData = (res.rows || []).map(r => ({
        id: r.id,
        staffname: [r.fname, r.mname, r.lname].filter(Boolean).join(' '),
        EmployeeCode: r.employeecode != null ? String(r.employeecode) : '',
        active_departments: r.active_departments || '',
        leave_staff_applications: []
      }));

      // attach leave applications for the month range
      const startDate = `${year}-${String(month).padStart(2,'0')}-01`;
      const endDate = `${year}-${String(month).padStart(2,'0')}-31`;
      for (const s of staffData) {
        try {
          const leaveSql = `SELECT l.*, la.shortname, la.start, la.end FROM leave_staff_applications la WHERE la.staff_id = $1 AND la.appl_status != 'rejected' AND la.start >= $2 AND la.end <= $3`;
          const lr = await pgPool.query(leaveSql, [s.id, startDate, endDate]);
          s.leave_staff_applications = lr.rows || [];
        } catch (e) {
          s.leave_staff_applications = [];
        }
      }
    } catch (e) {
      staffData = [];
    }

    // log data associative from MySQL: EmployeeCode -> [days]
    let logDataAssociative = {};
    try {
      const [logrows] = await conn.query(`SELECT DISTINCT EmployeeCode, DAY(LogDate_Date) AS LogDate_Date FROM \`${tableName}\` WHERE LogDate_Date IS NOT NULL ORDER BY EmployeeCode, LogDate_Date`);
      for (const r of logrows) {
        const code = String(r.EmployeeCode || '');
        if (!logDataAssociative[code]) logDataAssociative[code] = [];
        logDataAssociative[code].push(Number(r.LogDate_Date));
      }
    } catch (e) {
      logDataAssociative = {};
    }

    return { log_dates: logDates, staffData, logDataAssociative, currentMonth: month, currentYear: year };
  } finally {
    try { conn.release(); } catch (e) {}
    try { await mysqlPool.end(); } catch (e) {}
  }
}

module.exports.getMuster = getMuster;

async function getMonthlyForEmployee(empcode, monthParam, yearParam) {
  const month = Number(monthParam) || (new Date().getMonth() + 1);
  const year = Number(yearParam) || new Date().getFullYear();
  const tableName = `DeviceLogs_${month}_${year}`;
  const mysqlPool = mysql.createPool(SECONDARY_DB);
  const conn = await mysqlPool.getConnection();
  try {
    const firstDay = toYmd(new Date(year, month - 1, 1));
    const lastDay = toYmd(new Date(year, month, 0));

    // Fetch logs for the employee for the month (join devices/employees for device name)
    const [rows] = await conn.query(
      `SELECT l.LogDate, l.LogDate_Date, l.LogDate_Time, d.DeviceFname as DeviceFName, e.EmployeeName, l.EmployeeCode, l.DeviceLogId
       FROM \`${tableName}\` l
       JOIN devices d ON l.DeviceId = d.DeviceId
       JOIN employees e ON l.EmployeeCode = e.EmployeeCode
       WHERE l.LogDate_Date BETWEEN ? AND ? AND l.EmployeeCode = ?
       ORDER BY l.LogDate ASC`,
      [firstDay, lastDay, String(empcode)]
    );

    // Group by date and build entry/exit/duration
    const logsByDate = {};
    for (const r of rows) {
      const d = r.LogDate_Date;
      if (!logsByDate[d]) logsByDate[d] = [];
      logsByDate[d].push(r);
    }

    const employeeLogs = {};
    for (const [dateKey, arr] of Object.entries(logsByDate)) {
      const sorted = arr.sort((a, b) => new Date(a.LogDate) - new Date(b.LogDate));
      const entryLog = sorted[0] || null;
      const exitLog = sorted.length > 1 ? sorted[sorted.length - 1] : null;
      let totalSeconds = 0;
      for (let i = 0; i < sorted.length - 1; i += 2) {
        const e = sorted[i];
        const x = sorted[i + 1];
        if (e && x) {
          const diff = (new Date(x.LogDate).getTime() - new Date(e.LogDate).getTime()) / 1000;
          if (diff > 0) totalSeconds += diff;
        }
      }
      employeeLogs[dateKey] = {
        entryLog,
        exitLog,
        entryDevice: entryLog ? entryLog.DeviceFName : null,
        exitDevice: exitLog ? exitLog.DeviceFName : null,
        duration: totalSeconds > 0 ? new Date(totalSeconds * 1000).toISOString().substr(11, 8) : null,
      };
    }

    // Build logsByEmployee format similar to Laravel (array of raw logs per employee)
    const logsByEmployee = {};
    logsByEmployee[String(empcode)] = rows.map(r => ({ ...r }));

    // Compute missing dates: working days (any employee punched) on which this employee has no log.
    // mysql2/pg return DATE columns as Date objects, so compare by YYYY-MM-DD string, not identity.
    let missingDates = [];
    try {
      const [dates] = await conn.query(`SELECT DISTINCT LogDate_Date FROM \`${tableName}\` ORDER BY LogDate_Date`);
      const presentDates = new Set(rows.map(r => toYmd(r.LogDate_Date)).filter(Boolean));
      for (const drow of dates) {
        const d = toYmd(drow.LogDate_Date);
        if (d && !presentDates.has(d)) missingDates.push(d);
      }
    } catch (e) {
      // ignore if table missing
    }

    // Filter missingDates: remove weekly offs (Sundays, 1st/3rd Saturdays) and holidays;
    // collect this staff's leave dates for the UI.
    let filteredMissing = missingDates.filter((d) => !isWeeklyOff(ymdToLocalDate(d)));
    let leaveDates = new Set();
    try {
      const holidayRes = await pgPool.query(
        `SELECT start FROM holidayrhs WHERE start BETWEEN $1 AND $2 AND type = 'Holiday'`,
        [firstDay, lastDay]
      );
      const holidayDates = new Set((holidayRes.rows || []).map((r) => toYmd(r && r.start)).filter(Boolean));
      filteredMissing = filteredMissing.filter((d) => !holidayDates.has(d));
    } catch (e) {
      // keep Sunday-filtered list if holidays cannot be read
    }

    try {
      const staffRes = await pgPool.query(`SELECT id FROM staff WHERE employeecode::text = $1 LIMIT 1`, [String(empcode)]);
      const staffId = staffRes.rows[0] ? staffRes.rows[0].id : null;

      // fetch leave ranges for selected staff and expand to per-day leave dates
      if (staffId) {
        const leaveRes = await pgPool.query(
          `SELECT start, "end" FROM leave_staff_applications
            WHERE staff_id = $1 AND LOWER(COALESCE(appl_status, '')) NOT IN ('rejected', 'cancelled')
              AND start <= $3 AND "end" >= $2`,
          [staffId, firstDay, lastDay]
        );
        for (const row of leaveRes.rows || []) {
          const leaveStart = toYmd(row && row.start);
          const leaveEnd = toYmd(row && row.end);
          if (!leaveStart || !leaveEnd) continue;

          const from = leaveStart > firstDay ? leaveStart : firstDay;
          const to = leaveEnd < lastDay ? leaveEnd : lastDay;
          for (let d = ymdToLocalDate(from); toYmd(d) <= to; d.setDate(d.getDate() + 1)) {
            leaveDates.add(toYmd(d));
          }
        }
      }
    } catch (e) {
      leaveDates = new Set();
    }

    // fetch employees list for dropdown (eligible staff)
    let employees = [];
    try {
      const assocNames = ['Confirmed', 'Probationary', 'Contractual', 'Promotional Probationary', 'Temporary (non teaching)'];
      const empSql = `SELECT s.id, s.employeecode, s.fname, s.mname, s.lname FROM staff s WHERE s.id IN (SELECT staff_id FROM association_staff WHERE status = 'active' AND association_id IN (SELECT id FROM associations WHERE asso_name = ANY($1::text[]))) ORDER BY s.fname`;
      const ers = await pgPool.query(empSql, [assocNames]);
      employees = ers.rows || [];
    } catch (e) {
      employees = [];
    }

    // averageDurations: compute per selected employee total seconds / workdays
    const averageDurations = {};
    try {
      // compute total seconds and days
      let totalSeconds = 0;
      let workDays = 0;
      for (const [d, log] of Object.entries(employeeLogs)) {
        if (log.duration) {
          const parts = log.duration.split(':');
          const secs = (Number(parts[0]) * 3600) + (Number(parts[1]) * 60) + Number(parts[2]);
          totalSeconds += secs;
          workDays++;
        }
      }
      averageDurations[String(empcode)] = workDays > 0 ? new Date(Math.floor(totalSeconds / workDays) * 1000).toISOString().substr(11, 8) : null;
    } catch (e) {
      // ignore
    }

    return {
      employeeLogs,
      averageDurations,
      logsByEmployee,
      missinglog_array: filteredMissing,
      leave_dates: Array.from(leaveDates).sort(),
      employees,
      currentMonth: month,
      currentYear: year,
      selectedEmployee: employees.find(e => String(e.employeecode) === String(empcode)) || null,
      empcode: empcode,
    };

  } finally {
    try { conn.release(); } catch (e) {}
    try { await mysqlPool.end(); } catch (e) {}
  }
}

module.exports.getMonthlyForEmployee = getMonthlyForEmployee;

async function buildHodMonthlyDataset(userId, monthParam, yearParam) {
  const month = Number(monthParam) || (new Date().getMonth() + 1);
  const year = Number(yearParam) || new Date().getFullYear();
  const department = await findDepartmentByHodUserId(userId);

  if (!department) {
    const err = new Error('No department mapping found for this HOD user');
    err.statusCode = 404;
    throw err;
  }

  const assocNames = [
    'Confirmed',
    'Probationary',
    'Contractual',
    'Promotional Probationary',
    'Temporary (non teaching)'
  ];

  const employeesSql = `
    SELECT s.id, s.employeecode::text AS employeecode, s.fname, s.mname, s.lname
    FROM staff s
    WHERE s.id IN (
      SELECT ds.staff_id
      FROM department_staff ds
      WHERE ds.department_id = $1
        AND LOWER(COALESCE(ds.status, 'active')) = 'active'
    )
    AND s.id IN (
      SELECT ast.staff_id
      FROM association_staff ast
      WHERE LOWER(COALESCE(ast.status, 'active')) = 'active'
        AND ast.association_id IN (
          SELECT id FROM associations WHERE asso_name = ANY($2::text[])
        )
    )
    ORDER BY s.fname ASC, s.mname ASC, s.lname ASC
  `;

  const employeesRes = await pgPool.query(employeesSql, [department.id, assocNames]);
  const employees = (employeesRes.rows || []).map((r) => ({
    code: String(r.employeecode || '').trim(),
    name: [r.fname, r.mname, r.lname].filter(Boolean).join(' ').trim()
  })).filter((r) => r.code);

  const tableName = `DeviceLogs_${month}_${year}`;
  const firstDay = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).toISOString().slice(0, 10);
  const daysInMonth = new Date(year, month, 0).getDate();

  function normalizeYmd(value) {
    if (!value) return '';
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      const y = value.getFullYear();
      const m = String(value.getMonth() + 1).padStart(2, '0');
      const d = String(value.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    const asString = String(value);
    if (/^\d{4}-\d{2}-\d{2}/.test(asString)) return asString.slice(0, 10);
    const parsed = new Date(asString);
    if (!Number.isNaN(parsed.getTime())) {
      const y = parsed.getFullYear();
      const m = String(parsed.getMonth() + 1).padStart(2, '0');
      const d = String(parsed.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    return '';
  }

  let rawLogs = [];
  if (employees.length > 0) {
    const mysqlPool = mysql.createPool(SECONDARY_DB);
    const conn = await mysqlPool.getConnection();
    try {
      const employeeCodes = employees.map((e) => String(e.code).trim()).filter(Boolean);
      const [rows] = await conn.query(
        `SELECT l.EmployeeCode, l.LogDate, l.LogDate_Date
         FROM \`${tableName}\` l
         WHERE l.LogDate_Date BETWEEN ? AND ?
           AND l.EmployeeCode IN (?)
         ORDER BY l.EmployeeCode ASC, l.LogDate ASC`,
        [firstDay, lastDay, employeeCodes]
      );
      const codeSet = new Set(employeeCodes);
      rawLogs = (rows || []).filter((r) => codeSet.has(String(r.EmployeeCode || '').trim()));
    } catch (err) {
      const exportErr = new Error(`Unable to fetch biometric logs for ${month}/${year}: ${err.message || 'query failed'}`);
      exportErr.statusCode = 500;
      throw exportErr;
    } finally {
      try { conn.release(); } catch (_e) {}
      try { await mysqlPool.end(); } catch (_e) {}
    }
  }

  const logsByEmployeeDate = new Map();
  for (const log of rawLogs) {
    const code = String(log.EmployeeCode || '').trim();
    const dateKey = normalizeYmd(log.LogDate_Date);
    if (!code || !dateKey) continue;
    if (!logsByEmployeeDate.has(code)) logsByEmployeeDate.set(code, new Map());
    const perDate = logsByEmployeeDate.get(code);
    if (!perDate.has(dateKey)) perDate.set(dateKey, []);
    perDate.get(dateKey).push(log);
  }

  return {
    month,
    year,
    daysInMonth,
    employees,
    logsByEmployeeDate
  };
}

async function getMonthlyReportWorkbookBufferForHod(userId, monthParam, yearParam) {
  const { month, year, daysInMonth, employees, logsByEmployeeDate } = await buildHodMonthlyDataset(userId, monthParam, yearParam);

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Monthly Biometric');

  const headerFill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFB8CCE4' }
  };
  const subHeaderFill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFD9E1F2' }
  };
  const thinBorder = {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'thin' }
  };

  sheet.mergeCells(1, 1, 2, 1);
  const nameHeader = sheet.getCell(1, 1);
  nameHeader.value = 'Employee Name';
  nameHeader.font = { bold: true };
  nameHeader.alignment = { horizontal: 'center', vertical: 'middle' };
  nameHeader.fill = headerFill;
  sheet.getCell(2, 1).fill = headerFill;
  sheet.getCell(2, 1).border = thinBorder;
  nameHeader.border = thinBorder;
  sheet.getColumn(1).width = 30;

  let col = 2;
  for (let day = 1; day <= daysInMonth; day++) {
    const dateObj = new Date(year, month - 1, day);
    const dayLabel = dateObj.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).replace(/ /g, ' ');

    sheet.mergeCells(1, col, 1, col + 1);
    const dayCell = sheet.getCell(1, col);
    dayCell.value = dayLabel;
    dayCell.font = { bold: true };
    dayCell.alignment = { horizontal: 'center', vertical: 'middle' };
    dayCell.fill = headerFill;
    dayCell.border = thinBorder;
    sheet.getCell(1, col + 1).fill = headerFill;
    sheet.getCell(1, col + 1).border = thinBorder;

    const punchInCell = sheet.getCell(2, col);
    punchInCell.value = 'Punch In';
    punchInCell.font = { bold: true };
    punchInCell.alignment = { horizontal: 'center', vertical: 'middle' };
    punchInCell.fill = subHeaderFill;
    punchInCell.border = thinBorder;

    const punchOutCell = sheet.getCell(2, col + 1);
    punchOutCell.value = 'Punch Out';
    punchOutCell.font = { bold: true };
    punchOutCell.alignment = { horizontal: 'center', vertical: 'middle' };
    punchOutCell.fill = subHeaderFill;
    punchOutCell.border = thinBorder;

    sheet.getColumn(col).width = 12;
    sheet.getColumn(col + 1).width = 12;
    col += 2;
  }

  sheet.getRow(1).height = 20;
  sheet.getRow(2).height = 18;

  let rowIndex = 3;
  for (const employee of employees) {
    sheet.getCell(rowIndex, 1).value = employee.name;
    sheet.getCell(rowIndex, 1).border = thinBorder;

    const perDate = logsByEmployeeDate.get(employee.code) || new Map();
    let rowCol = 2;

    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const logs = (perDate.get(dateKey) || []).slice().sort((a, b) => new Date(a.LogDate) - new Date(b.LogDate));

      let entryTime = '';
      let exitTime = '';
      if (logs.length > 0) {
        const first = new Date(logs[0].LogDate);
        if (!Number.isNaN(first.getTime())) {
          entryTime = first.toTimeString().slice(0, 8);
        }
      }
      if (logs.length > 1) {
        const last = new Date(logs[logs.length - 1].LogDate);
        if (!Number.isNaN(last.getTime())) {
          exitTime = last.toTimeString().slice(0, 8);
        }
      }

      const entryCell = sheet.getCell(rowIndex, rowCol);
      entryCell.value = entryTime;
      entryCell.border = thinBorder;

      const exitCell = sheet.getCell(rowIndex, rowCol + 1);
      exitCell.value = exitTime;
      exitCell.border = thinBorder;

      rowCol += 2;
    }

    rowIndex += 1;
  }

  const monthName = new Date(year, month - 1, 1).toLocaleString('en-US', { month: 'long' });
  const filename = `Biometric_Report_${monthName}_${year}.xlsx`;
  const buffer = await workbook.xlsx.writeBuffer();

  return { buffer, filename };
}

module.exports.getMonthlyReportWorkbookBufferForHod = getMonthlyReportWorkbookBufferForHod;

async function getMonthlyMatrixForHod(userId, monthParam, yearParam) {
  const { month, year, daysInMonth, employees, logsByEmployeeDate } = await buildHodMonthlyDataset(userId, monthParam, yearParam);

  const days = [];
  for (let day = 1; day <= daysInMonth; day++) {
    const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    days.push({
      day,
      date: iso,
      label: new Date(year, month - 1, day).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short'
      })
    });
  }

  const rows = employees.map((employee) => {
    const perDate = logsByEmployeeDate.get(employee.code) || new Map();
    const punches = {};

    for (const d of days) {
      const logs = (perDate.get(d.date) || []).slice().sort((a, b) => new Date(a.LogDate) - new Date(b.LogDate));
      let punchIn = '';
      let punchOut = '';

      if (logs.length > 0) {
        const first = new Date(logs[0].LogDate);
        if (!Number.isNaN(first.getTime())) punchIn = first.toTimeString().slice(0, 8);
      }
      if (logs.length > 1) {
        const last = new Date(logs[logs.length - 1].LogDate);
        if (!Number.isNaN(last.getTime())) punchOut = last.toTimeString().slice(0, 8);
      }

      punches[d.date] = { in: punchIn, out: punchOut };
    }

    return {
      employeeCode: employee.code,
      employeeName: employee.name,
      punches
    };
  });

  return {
    month,
    year,
    days,
    rows
  };
}

module.exports.getMonthlyMatrixForHod = getMonthlyMatrixForHod;
