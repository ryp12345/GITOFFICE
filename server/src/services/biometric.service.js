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

async function buildEntryExitForDate(month, year, date) {
  const tableName = `DeviceLogs_${month}_${year}`;
  const mysqlPool = mysql.createPool(SECONDARY_DB);
  const conn = await mysqlPool.getConnection();
  try {
    const [rows] = await conn.query(
      `SELECT l.LogDate, l.LogDate_Date, l.EmployeeCode, d.DeviceFname as DeviceFName, e.EmployeeName
       FROM \`${tableName}\` l
       JOIN devices d ON l.DeviceId = d.DeviceId
       JOIN employees e ON l.EmployeeCode = e.EmployeeCode
       WHERE l.LogDate_Date = ?
       ORDER BY l.EmployeeCode, l.LogDate ASC`,
      [date]
    );

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

async function getDailyBiometric(dateStr) {
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

  const entry_exit = await buildEntryExitForDate(month, year, dateParam);

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
    }
  } catch (e) {
    console.warn('Failed to enrich biometric combinedData with departments', e && e.message);
  }

  return { combinedData, entry_exit };
}

module.exports = { getDailyBiometric };
