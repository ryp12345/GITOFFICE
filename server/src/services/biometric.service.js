const mysql = require('mysql2/promise');
require('dotenv').config();
const { pool: pgPool } = require('../config/db');

const SECONDARY_DB = {
  host: process.env.DB_SECONDARY_HOST || process.env.DB_SECONDARY_HOST || '127.0.0.1',
  port: Number(process.env.DB_SECONDARY_PORT || 3306),
  user: process.env.DB_SECONDARY_USERNAME || process.env.DB_SECONDARY_USERNAME || 'root',
  password: process.env.DB_SECONDARY_PASSWORD || process.env.DB_SECONDARY_PASSWORD || '',
  database: process.env.DB_SECONDARY_DATABASE || process.env.DB_SECONDARY_DATABASE || undefined,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

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
    const firstDay = new Date(year, month - 1, 1).toISOString().slice(0, 10);
    const lastDay = new Date(year, month, 0).toISOString().slice(0, 10);

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

    // Compute missing dates by comparing all distinct dates in month vs dates where this employee has logs
    let missingDates = [];
    try {
      const [dates] = await conn.query(`SELECT DISTINCT LogDate_Date FROM \`${tableName}\` ORDER BY LogDate_Date`);
      const presentDates = new Set(rows.map(r => r.LogDate_Date));
      for (const drow of dates) {
        const d = drow.LogDate_Date;
        if (!presentDates.has(d)) missingDates.push(d);
      }
    } catch (e) {
      // ignore if table missing
    }

    // Filter missingDates: remove Sundays and holidays and leave-applications for this staff
    let filteredMissing = [];
    try {
      // find staff id from postgres
      const staffRes = await pgPool.query(`SELECT id FROM staff WHERE employeecode::text = $1 LIMIT 1`, [String(empcode)]);
      const staffId = staffRes.rows[0] ? staffRes.rows[0].id : null;
      for (const md of missingDates) {
        const dow = new Date(md).getDay(); // 0=Sun
        if (dow === 0) continue; // skip Sunday
        // check holidayrh
        const hol = await pgPool.query(`SELECT 1 FROM holidayrh WHERE start = $1 AND type = 'Holiday' LIMIT 1`, [md]);
        if (hol.rows.length > 0) continue;
        // check leave application
        if (staffId) {
          const leaveQ = await pgPool.query(`SELECT 1 FROM leave_staff_applications WHERE staff_id = $1 AND start <= $2 AND end >= $2 AND appl_status != 'rejected' LIMIT 1`, [staffId, md]);
          if (leaveQ.rows.length > 0) continue;
        }
        filteredMissing.push(md);
      }
    } catch (e) {
      filteredMissing = missingDates;
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
