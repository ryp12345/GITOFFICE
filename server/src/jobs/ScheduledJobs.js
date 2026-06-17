// Job implementations for scheduled tasks. Import services as needed.
const leaveService = require('../services/leaveService');
const jobRunService = require('../services/jobRunService');
const { pool } = require('../config/db');
const mysql = require('mysql2/promise');

const IST = 'Asia/Kolkata';
const MS_PER_DAY = 1000 * 60 * 60 * 24;

function padMonthDay(value) {
  return String(value).padStart(2, '0');
}

function getDatePartsInTimeZone(dateValue, timeZone = IST) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(dateValue instanceof Date ? dateValue : new Date(dateValue));

  return {
    year: Number(parts.find((p) => p.type === 'year')?.value || 0),
    month: Number(parts.find((p) => p.type === 'month')?.value || 1),
    day: Number(parts.find((p) => p.type === 'day')?.value || 1),
  };
}

function getIstNowParts() {
  const parts = getDatePartsInTimeZone(new Date(), IST);
  return {
    ...parts,
    date: `${parts.year}-${padMonthDay(parts.month)}-${padMonthDay(parts.day)}`,
  };
}

function parseDateOnly(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value || '').trim());
  if (match) {
    return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  }

  const parts = getDatePartsInTimeZone(value, 'UTC');
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
}

function daysBetweenDateOnly(a, b) {
  return Math.abs(Math.floor((parseDateOnly(a) - parseDateOnly(b)) / MS_PER_DAY));
}

function safeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

// Helper: ensure an entitlement row for (year, staff, leave) exists before inserting.
async function ensureEntitlement(year, staffId, leaveId, insertSql, insertParams) {
  try {
    const { rows } = await pool.query('SELECT id FROM leave_staff_entitlements WHERE year=$1 AND staff_id=$2 AND leave_id=$3 LIMIT 1', [year, staffId, leaveId]);
    if (rows && rows.length > 0) return false; // already exists
    await pool.query(insertSql, insertParams);
    return true;
  } catch (e) {
    // if select/insert fails, rethrow to let caller handle
    throw e;
  }
}

const SECONDARY_DB = {
  host: process.env.DB_SECONDARY_HOST || '127.0.0.1',
  port: Number(process.env.DB_SECONDARY_PORT || 3306),
  user: process.env.DB_SECONDARY_USERNAME || 'root',
  password: process.env.DB_SECONDARY_PASSWORD || '',
  database: process.env.DB_SECONDARY_DATABASE || undefined,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

async function yearly_leave_entitlements(context = {}) {
  console.log('Running job: yearly_leave_entitlements');
  const initiatedBy = context.fromApi ? (context.userId || 'api') : 'cli';
  let run = null;
  try { run = await jobRunService.startRun('yearly_leave_entitlements', { initiatedBy }); } catch (e) { console.warn('Could not record job run start:', e && e.message); }

  // Laravel runs this in Dec for the next year; compute next year exactly as Laravel
  // Allow overriding via context.year for one-off runs (useful for backfilling)
  const year = Number(context.year) || getIstNowParts().year + 1;

  // helper: get first active leave_rules row for a leave
  async function getLeaveRule(leaveId) {
    try {
      const { rows } = await pool.query('SELECT * FROM leave_rules WHERE leave_id = $1 AND LOWER(status) = $2 ORDER BY id LIMIT 1', [leaveId, 'active']);
      return rows && rows[0];
    } catch (e) {
      return null;
    }
  }

  try {
    // Teaching Vacational
    const teachingVacationalStaffSql = `
      SELECT st.id, st.date_of_superanuation
      FROM staff st
      JOIN employee_types et ON et.staff_id = st.id
      JOIN association_staff ast ON ast.staff_id = st.id
      WHERE st.id NOT IN (
        SELECT s.id
        FROM staff s
        JOIN designation_staff ds ON s.id = ds.staff_id
        JOIN designations d ON ds.designation_id = d.id
        WHERE d.isadditional = 1
          AND d.isvacational = 'Non-Vacational'
          AND ds.status = 'active'
      )
        AND LOWER(et.employee_type) = 'teaching'
        AND LOWER(et.status)='active'
        AND ast.association_id IN (
          SELECT id FROM associations WHERE LOWER(asso_name) = 'confirmed' OR LOWER(asso_name) = 'promotional probationary'
        )
        AND ast.status = 'active'`;

    const { rows: teachingStaff } = await pool.query(teachingVacationalStaffSql);
    const { rows: vacLeaves } = await pool.query("SELECT * FROM leaves WHERE LOWER(vacation_type)='vacational' AND max_entitlement>0 AND shortname NOT ILIKE 'SML%' AND shortname NOT ILIKE 'ML' AND LOWER(status)='active'");
    console.log('diagnostic: teachingStaff count=', teachingStaff.length, 'vacLeaves count=', vacLeaves.length, 'year=', year);

    for (const st of teachingStaff) {
      for (const l of vacLeaves) {
        // EL handling
        if ((l.shortname || '').toUpperCase() === 'EL') {
          const dorYear = st.date_of_superanuation ? parseDateOnly(st.date_of_superanuation).getFullYear() : null;
          let max_entitlement = 0;
          if (dorYear === year) {
            const diffDays = daysBetweenDateOnly(st.date_of_superanuation, `${year}-01-01`);
            const max_entitlement_full = Math.ceil(diffDays * (Number(l.max_entitlement || 0)) / 365);
            if (max_entitlement_full > Math.ceil(Number(l.max_entitlement || 0) / 2)) {
              max_entitlement = Math.floor(Number(l.max_entitlement || 0) / 2);
            } else {
              max_entitlement = max_entitlement_full;
            }
          } else {
            max_entitlement = Math.floor(Number(l.max_entitlement || 0) / 2);
          }

          // previous year entitlement
          const { rows: preRows } = await pool.query('SELECT * FROM leave_staff_entitlements WHERE staff_id=$1 AND leave_id=$2 AND year=$3 LIMIT 1', [st.id, l.id, year - 1]);
          const pre = preRows && preRows[0];

          if (!pre) {
            console.log('inserting EL for staff', st.id, 'leave', l.id, 'entitlement', max_entitlement);
            await ensureEntitlement(year, st.id, l.id,
              `INSERT INTO leave_staff_entitlements (year, staff_id, leave_id, entitled_curr_year, wef, status, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,'active', NOW(), NOW())`,
              [year, st.id, l.id, max_entitlement, `${year}-01-01`] );
          } else {
            console.log('previous year entry exists for staff', st.id, 'leave', l.id, 'using accumulated logic');
            // compute accumulated / encashed depending on leave_rules
            const rule = await getLeaveRule(l.id);
            let accumulated = pre.accumulated || 0;
            if (rule && String(rule.carry_forwardable || '').toLowerCase() === 'yes') {
              accumulated = (pre.accumulated || 0) + (pre.entitled_curr_year || 0) - (pre.consumed_curr_year || 0) - (pre.encashed_curr_year || 0);
              if (accumulated < 0) accumulated = 0;
              if (accumulated >= (rule.max_cf || 0)) accumulated = rule.max_cf;
            } else {
              if ((pre.consumed_curr_year || 0) > (pre.entitled_curr_year || 0)) {
                accumulated = (pre.accumulated || 0) + (pre.entitled_curr_year || 0) - (pre.consumed_curr_year || 0);
                if (accumulated < 0) accumulated = 0;
              } else {
                accumulated = pre.accumulated || 0;
              }
            }
            await ensureEntitlement(year, st.id, l.id,
              'INSERT INTO leave_staff_entitlements (year, staff_id, leave_id, entitled_curr_year, accumulated, wef, status, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,\'active\', NOW(), NOW())',
              [year, st.id, l.id, max_entitlement, accumulated, `${year}-01-01`] );
          }
        }
        // CL handling
        else if ((l.shortname || '').toUpperCase() === 'CL') {
          const max_entitlement = await check_dorCL(st.id, l);
          const { rows: preRows } = await pool.query('SELECT * FROM leave_staff_entitlements WHERE staff_id=$1 AND leave_id=$2 AND year=$3 LIMIT 1', [st.id, l.id, year - 1]);
          const pre = preRows && preRows[0];
          if (!pre) {
            await ensureEntitlement(year, st.id, l.id,
              `INSERT INTO leave_staff_entitlements (year, staff_id, leave_id, entitled_curr_year, wef, status, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,'active', NOW(), NOW())`,
              [year, st.id, l.id, max_entitlement, `${year}-01-01`] );
          } else {
            const rule = await getLeaveRule(l.id);
            let accumulated = pre.accumulated || 0;
            if (rule && String(rule.carry_forwardable || '').toLowerCase() === 'yes') {
              accumulated = (pre.accumulated || 0) + (pre.entitled_curr_year || 0) - (pre.consumed_curr_year || 0);
              if (accumulated < 0) accumulated = 0;
              if (accumulated >= (rule.max_cf || 0)) accumulated = rule.max_cf;
            } else {
              if ((pre.consumed_curr_year || 0) > (pre.entitled_curr_year || 0)) {
                accumulated = (pre.accumulated || 0) + (pre.entitled_curr_year || 0) - (pre.consumed_curr_year || 0);
                if (accumulated < 0) accumulated = 0;
              } else {
                accumulated = pre.accumulated || 0;
              }
            }
            const total_encashable = (pre.total_encashed || 0) + (pre.encashed_curr_year || 0);
            await ensureEntitlement(year, st.id, l.id,
              'INSERT INTO leave_staff_entitlements (year, staff_id, leave_id, entitled_curr_year, accumulated, total_encashed, wef, status, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,\'active\', NOW(), NOW())',
              [year, st.id, l.id, max_entitlement, accumulated, total_encashable, `${year}-01-01`] );
          }
        }
        else {
          // other leave types: give full entitlement
          await ensureEntitlement(year, st.id, l.id,
            `INSERT INTO leave_staff_entitlements (year, staff_id, leave_id, entitled_curr_year, wef, status, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,'active', NOW(), NOW())`,
            [year, st.id, l.id, Number(l.max_entitlement) || 0, `${year}-01-01`] );
        }
      }
    }

    // Teaching Non-Vacational
    const teachingNonVacSql = `SELECT s.id, s.date_of_superanuation, ds.start_date
      FROM staff s
      JOIN designation_staff ds ON s.id = ds.staff_id
      JOIN designations d ON ds.designation_id = d.id
      WHERE d.isadditional = 1 AND d.isvacational = 'Non-Vacational' AND ds.status = 'active'`;
    const { rows: teachingNonVacStaff } = await pool.query(teachingNonVacSql);
    const { rows: nonVacLeaves } = await pool.query("SELECT * FROM leaves WHERE LOWER(vacation_type)='non-vacational' AND max_entitlement>0 AND shortname NOT ILIKE 'SML%' AND shortname NOT ILIKE 'ML' AND LOWER(status)='active'");

    for (const st of teachingNonVacStaff) {
      for (const l of nonVacLeaves) {
        const { rows: preRows } = await pool.query('SELECT * FROM leave_staff_entitlements WHERE staff_id=$1 AND leave_id=$2 AND year=$3 LIMIT 1', [st.id, l.id, year - 1]);
        const pre = preRows && preRows[0];
        if (!pre) {
          let entitlement = 0;
          if ((l.shortname || '').toUpperCase() === 'EL') {
            const dorYear = st.date_of_superanuation ? parseDateOnly(st.date_of_superanuation).getFullYear() : null;
            if (dorYear === year && st.start_date && parseDateOnly(st.start_date) > parseDateOnly(st.date_of_superanuation)) {
              const diffDays = daysBetweenDateOnly(st.date_of_superanuation, `${year}-01-01`);
              entitlement = Math.round(Number(l.max_entitlement || 0) * diffDays / 365);
            } else {
              entitlement = 0;
            }
          } else if ((l.shortname || '').toUpperCase() === 'CL') {
            entitlement = await check_dorCL(st.id, l);
          } else {
            entitlement = Number(l.max_entitlement) || 0;
          }
          await ensureEntitlement(year, st.id, l.id,
            `INSERT INTO leave_staff_entitlements (year, staff_id, leave_id, entitled_curr_year, wef, status, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,'active', NOW(), NOW())`,
            [year, st.id, l.id, entitlement, `${year}-01-01`] );
        } else {
          // has previous entitlement: compute accumulated/encash as per rules
          const rule = await getLeaveRule(l.id);
          let accumulated = pre.accumulated || 0;
          if (rule && String(rule.carry_forwardable || '').toLowerCase() === 'yes') {
            accumulated = (pre.accumulated || 0) + (pre.entitled_curr_year || 0) - (pre.consumed_curr_year || 0) - (pre.encashed_curr_year || 0);
            if (accumulated < 0) accumulated = 0;
            if (accumulated > (rule.max_cf || 0)) accumulated = rule.max_cf;
          } else {
            if ((pre.consumed_curr_year || 0) > (pre.entitled_curr_year || 0)) {
              accumulated = (pre.accumulated || 0) - ((pre.entitled_curr_year || 0) - (pre.consumed_curr_year || 0));
              if (accumulated < 0) accumulated = 0;
            } else {
              accumulated = pre.accumulated || 0;
            }
          }
          let total_encashable = 0;
          if (rule && String(rule.encashable || '').toLowerCase() === 'yes') {
            total_encashable = (pre.total_encashed || 0) + (pre.encashed_curr_year || 0);
          }
          // entitlement for EL special-case
          if ((l.shortname || '').toUpperCase() === 'EL') {
            if (rule && (pre.accumulated || 0) === (rule.max_cf || 0)) {
              await ensureEntitlement(year, st.id, l.id,
                'INSERT INTO leave_staff_entitlements (year, staff_id, leave_id, entitled_curr_year, accumulated, total_encashed, wef, status, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,\'active\', NOW(), NOW())',
                [year, st.id, l.id, (rule && rule.entitlement_post_max_cf) || 0, accumulated, total_encashable, `${year}-01-01`] );
            } else {
              await ensureEntitlement(year, st.id, l.id,
                'INSERT INTO leave_staff_entitlements (year, staff_id, leave_id, entitled_curr_year, accumulated, total_encashed, wef, status, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,\'active\', NOW(), NOW())',
                [year, st.id, l.id, 0, accumulated, total_encashable, `${year}-01-01`] );
            }
          } else {
            const max_ent = (l.shortname || '').toUpperCase() === 'CL' ? await check_dorCL(st.id, l) : Number(l.max_entitlement) || 0;
            await ensureEntitlement(year, st.id, l.id,
              'INSERT INTO leave_staff_entitlements (year, staff_id, leave_id, entitled_curr_year, accumulated, total_encashed, wef, status, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,\'active\', NOW(), NOW())',
              [year, st.id, l.id, max_ent, accumulated, total_encashable, `${year}-01-01`] );
          }
        }
      }
    }

    // Non-Teaching confirmed/promotional probationary (matches Laravel yearly logic)
    const nonTeachingSql = `SELECT staff.*, association_staff.start_date AS start_date, associations.asso_name
      FROM staff
      JOIN employee_types ON employee_types.staff_id = staff.id
      JOIN association_staff ON association_staff.staff_id = staff.id
      JOIN associations ON associations.id = association_staff.association_id
      WHERE employee_types.employee_type = 'Non-Teaching'
        AND employee_types.status = 'active'
        AND association_staff.status = 'active'
        AND associations.asso_name IN ('Confirmed', 'Promotional Probationary')`;
    const { rows: nonTeaching } = await pool.query(nonTeachingSql);
    const { rows: nonVacLeavesAll } = await pool.query("SELECT * FROM leaves WHERE LOWER(vacation_type)='non-vacational' AND max_entitlement>0 AND shortname NOT ILIKE 'SML%' AND shortname NOT ILIKE 'ML' AND LOWER(status)='active'");

    for (const st of nonTeaching) {
      for (const l of nonVacLeavesAll) {
        // compute max_entitlement depending on various rules (confirmation/retirement)
        let max_entitlement = Number(l.max_entitlement) || 0;
        if ((l.shortname || '').toUpperCase() === 'EL') {
          // if confirmed in previous year
          if (st.asso_name === 'Confirmed' && st.start_date && parseDateOnly(st.start_date).getFullYear() === year - 1) {
            const startDate = parseDateOnly(st.start_date);
            const endDate = parseDateOnly(`${startDate.getFullYear()}-12-31`);
            const daysWorked = daysBetweenDateOnly(startDate, endDate);
            max_entitlement = Math.ceil(Number(l.max_entitlement || 0) * daysWorked / 365);
          } else {
            if (st.date_of_superanuation && parseDateOnly(st.date_of_superanuation).getFullYear() === year) {
              const dor = parseDateOnly(st.date_of_superanuation);
              const startOfYear = parseDateOnly(`${year}-01-01`);
              const daysWorked = daysBetweenDateOnly(startOfYear, dor);
              max_entitlement = Math.ceil(Number(l.max_entitlement || 0) * daysWorked / 365);
            } else {
              max_entitlement = Number(l.max_entitlement) || 0;
            }
          }
        } else if ((l.shortname || '').toUpperCase() === 'CL' && st.date_of_superanuation && parseDateOnly(st.date_of_superanuation).getFullYear() === year) {
          const dor = parseDateOnly(st.date_of_superanuation);
          const startOfYear = parseDateOnly(`${year}-01-01`);
          const daysWorked = daysBetweenDateOnly(startOfYear, dor);
          max_entitlement = Math.ceil(Number(l.max_entitlement || 0) * daysWorked / 365);
        }

        const { rows: preRows } = await pool.query('SELECT * FROM leave_staff_entitlements WHERE year=$1 AND staff_id=$2 AND leave_id=$3 LIMIT 1', [year - 1, st.id, l.id]);
        const pre = preRows && preRows[0];
          if (!pre) {
          await ensureEntitlement(year, st.id, l.id,
            `INSERT INTO leave_staff_entitlements (year, staff_id, leave_id, entitled_curr_year, wef, status, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,'active', NOW(), NOW())`,
            [year, st.id, l.id, max_entitlement, `${year}-01-01`]);
        } else {
          const rule = await getLeaveRule(l.id);
          let accumulated = pre.accumulated || 0;
          if (rule && String(rule.carry_forwardable || '').toLowerCase() === 'yes') {
            accumulated = (pre.accumulated || 0) + (pre.entitled_curr_year || 0) - (pre.consumed_curr_year || 0) - (pre.encashed_curr_year || 0);
            if (accumulated < 0) accumulated = 0;
            if (accumulated > (rule.max_cf || 0)) accumulated = rule.max_cf;
          } else {
            if ((pre.consumed_curr_year || 0) > (pre.entitled_curr_year || 0)) {
              accumulated = (pre.accumulated || 0) - ((pre.entitled_curr_year || 0) - (pre.consumed_curr_year || 0));
              if (accumulated < 0) accumulated = 0;
            } else {
              accumulated = pre.accumulated || 0;
            }
          }
          const total_encashable = rule && String(rule.encashable || '').toLowerCase() === 'yes' ? (pre.total_encashed || 0) + (pre.encashed_curr_year || 0) : 0;
          await ensureEntitlement(year, st.id, l.id,
            'INSERT INTO leave_staff_entitlements (year, staff_id, leave_id, entitled_curr_year, accumulated, total_encashed, wef, status, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,\'active\', NOW(), NOW())',
            [year, st.id, l.id, max_entitlement, accumulated, total_encashable, `${year}-01-01`]);
        }
      }
    }

    if (run) { try { await jobRunService.finishRun(run.id, 'success'); } catch (e) { console.warn('Could not record job success:', e && e.message); } }
    console.log('yearly_leave_entitlements completed');
    return { success: true };
  } catch (err) {
    console.error('yearly_leave_entitlements failed:', err);
    if (run) { try { await jobRunService.finishRun(run.id, 'failed', { error: err && err.message }); } catch (e) { console.warn('Could not record job failure:', e && e.message); } }
    throw err;
  }
}

async function inactivate_previous_year(context = {}) {
  console.log('Running job: inactivate_previous_year');
  const initiatedBy = context.fromApi ? (context.userId || 'api') : 'cli';
  let run = null;
  try {
    run = await jobRunService.startRun('inactivate_previous_year', { initiatedBy });
  } catch (e) {
    // Non-fatal: proceed without run logging if startRun fails
    console.warn('Could not record job run start:', e && e.message);
  }

  try {
    const res = await leaveService.inactivatePreviousYear();
    console.log('inactivate_previous_year completed:', res);
    if (run) {
      try { await jobRunService.finishRun(run.id, 'success', { result: res }); } catch (e) { console.warn('Could not record job success:', e && e.message); }
    }
    return res;
  } catch (err) {
    console.error('inactivate_previous_year failed:', err);
    if (run) {
      try { await jobRunService.finishRun(run.id, 'failed', { error: err && err.message }); } catch (e) { console.warn('Could not record job failure:', e && e.message); }
    }
    throw err;
  }
}

async function monthly_leave_entitlements() {
  console.log('Running job: monthly_leave_entitlements');
  const context = arguments[0] || {};
  const initiatedBy = context.fromApi ? (context.userId || 'api') : 'cli';
  let run = null;
  try { run = await jobRunService.startRun('monthly_leave_entitlements', { initiatedBy }); } catch (e) { console.warn('Could not record job run start:', e && e.message); }

  const nowParts = getIstNowParts();
  const month = Number(context.month) || nowParts.month;
  const year = Number(context.year) || nowParts.year;
  const currentDate = parseDateOnly(nowParts.date);

  try {
    const staffSql = `
      SELECT staff.*, association_staff.start_date AS as_start_date
      FROM staff
      JOIN association_staff ON association_staff.staff_id = staff.id
      WHERE association_staff.status = 'active'
        AND association_staff.association_id IN (
          SELECT id
          FROM associations
          WHERE asso_name ILIKE '%Contractual%'
             OR asso_name ILIKE 'Probationary'
             OR asso_name ILIKE '%Temporary%'
        )`;

    const leavesSql = `
      SELECT l.*
      FROM leaves l
      WHERE l.max_entitlement IS NOT NULL
        AND LOWER(l.vacation_type) = 'non-vacational'
        AND LOWER(l.status) = 'active'
        AND EXISTS (
          SELECT 1
          FROM leave_rules lr
          WHERE lr.leave_id = l.id
            AND LOWER(lr.status) = 'active'
        )`;

    const [{ rows: staffRows }, { rows: leaves }] = await Promise.all([
      pool.query(staffSql),
      pool.query(leavesSql),
    ]);

    let applied = 0;
    for (const st of staffRows) {
      const doa = st.as_start_date ? parseDateOnly(st.as_start_date) : null;
      if (!doa || Number.isNaN(doa.getTime())) {
        continue;
      }

      const diffDays = daysBetweenDateOnly(doa, currentDate);
      const noOfDays = diffDays % 365;

      let clEntitled = 0;
      if (
        ((noOfDays > 44 && noOfDays < 53 && diffDays < 100) ||
          (noOfDays > 89 && noOfDays < 120) ||
          (noOfDays > 180 && noOfDays < 213) ||
          (noOfDays > 271 && noOfDays < 305))
      ) {
        clEntitled = 2;
      } else if (noOfDays > 22 || (noOfDays < 22 && diffDays > 365)) {
        clEntitled = 1;
      }

      for (const l of leaves) {
        const shortname = String(l.shortname || '').toUpperCase();
        if (month === 1) {
          if (shortname === 'CL') {
            await upsertMonthlyClEntitlement(Number(st.id), l, year, month, clEntitled);
            applied++;
          } else if (shortname === 'EL') {
            if (await ensureEntitlement(year, Number(st.id), Number(l.id),
              `INSERT INTO leave_staff_entitlements
               (year, staff_id, leave_id, entitled_curr_year, wef, status, created_at, updated_at)
               VALUES ($1, $2, $3, $4, $5, 'active', NOW(), NOW())`,
              [year, Number(st.id), Number(l.id), 0, `${year}-01-01`] )) applied++;
          } else {
            if (await ensureEntitlement(year, Number(st.id), Number(l.id),
              `INSERT INTO leave_staff_entitlements
               (year, staff_id, leave_id, entitled_curr_year, wef, status, created_at, updated_at)
               VALUES ($1, $2, $3, $4, $5, 'active', NOW(), NOW())`,
              [year, Number(st.id), Number(l.id), Number(l.max_entitlement || 0), `${year}-01-01`] )) applied++;
          }
          continue;
        }

        const { rows: existing } = await pool.query(
          'SELECT id FROM leave_staff_entitlements WHERE year = $1 AND staff_id = $2 AND leave_id = $3 LIMIT 1',
          [year, Number(st.id), Number(l.id)]
        );

        if (existing.length === 0) {
          if (shortname === 'CL') {
            await upsertMonthlyClEntitlement(Number(st.id), l, year, month, clEntitled);
            applied++;
          } else if (shortname === 'EL') {
            if (await ensureEntitlement(year, Number(st.id), Number(l.id),
              `INSERT INTO leave_staff_entitlements
               (year, staff_id, leave_id, entitled_curr_year, wef, status, created_at, updated_at)
               VALUES ($1, $2, $3, $4, $5, 'active', NOW(), NOW())`,
              [year, Number(st.id), Number(l.id), 0, `${year}-01-01`] )) applied++;
          } else {
            if (await ensureEntitlement(year, Number(st.id), Number(l.id),
              `INSERT INTO leave_staff_entitlements
               (year, staff_id, leave_id, entitled_curr_year, wef, status, created_at, updated_at)
               VALUES ($1, $2, $3, $4, $5, 'active', NOW(), NOW())`,
              [year, Number(st.id), Number(l.id), Number(l.max_entitlement || 0), `${year}-01-01`] )) applied++;
          }
        } else if (shortname === 'CL') {
          await upsertMonthlyClEntitlement(Number(st.id), l, year, month, clEntitled);
          applied++;
        }
      }
    }

    if (run) { try { await jobRunService.finishRun(run.id, 'success', { applied }); } catch (e) { console.warn('Could not record job success:', e && e.message); } }
    console.log('monthly_leave_entitlements applied to staff count:', applied);
    return { applied };
  } catch (err) {
    console.error('monthly_leave_entitlements failed:', err);
    if (run) { try { await jobRunService.finishRun(run.id, 'failed', { error: err && err.message }); } catch (e) { console.warn('Could not record job failure:', e && e.message); } }
    throw err;
  }
}

async function upsertMonthlyClEntitlement(staffId, leaveObjOrId, leaveIdFromArgs, yearArg, monthArg, grantArg) {
  let leaveObj = leaveObjOrId;
  let year = yearArg;
  let grant = grantArg;

  if (arguments.length === 5) {
    year = leaveIdFromArgs;
    grant = monthArg;
  } else if (arguments.length >= 6) {
    year = yearArg;
    grant = grantArg;
  }

  if (!leaveObj || typeof leaveObj !== 'object') {
    try {
      const { rows } = await pool.query('SELECT * FROM leaves WHERE id = $1 LIMIT 1', [leaveObj]);
      leaveObj = rows && rows[0];
    } catch (e) {
      leaveObj = null;
    }
  }

  year = Number(year) || getIstNowParts().year;
  grant = Number(grant) || 0;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: entRows } = await client.query('SELECT * FROM leave_staff_entitlements WHERE year=$1 AND staff_id=$2 AND leave_id=$3 LIMIT 1', [year, staffId, leaveObj.id]);
    let entitlement = entRows && entRows[0];
    const leaveMax = safeNumber(leaveObj.max_entitlement, 0);
    const grantToApply = Math.min(Math.max(grant, 0), leaveMax);

    if (!entitlement) {
      await client.query(`INSERT INTO leave_staff_entitlements (year, staff_id, leave_id, entitled_curr_year, wef, status, created_at, updated_at)
        VALUES ($1,$2,$3,$4,$5,'active', NOW(), NOW())`, [year, staffId, leaveObj.id, grantToApply, `${year}-01-01`]);
      await client.query('COMMIT');
      return;
    }

    const currentEntitled = safeNumber(entitlement.entitled_curr_year, 0);
    const remainingEntitlement = Math.max(leaveMax - currentEntitled, 0);
    const actualGrant = Math.min(grantToApply, remainingEntitlement);

    if (actualGrant > 0) {
      await client.query('UPDATE leave_staff_entitlements SET entitled_curr_year=$1, updated_at=NOW() WHERE id=$2', [currentEntitled + actualGrant, entitlement.id]);
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function check_dorCL(staffId, leaveObj) {
  const year = getIstNowParts().year + 1;
  const { rows } = await pool.query('SELECT date_of_superanuation FROM staff WHERE id = $1 LIMIT 1', [staffId]);
  const staff = rows && rows[0];
  if (!staff || !staff.date_of_superanuation) return Number(leaveObj.max_entitlement || 0);
  const dor = parseDateOnly(staff.date_of_superanuation).getUTCFullYear();
  if (dor === year) {
    const diffDays = daysBetweenDateOnly(staff.date_of_superanuation, `${year}-01-01`);
    return Math.ceil(diffDays * (Number(leaveObj.max_entitlement||0)) / 365);
  }
  return Number(leaveObj.max_entitlement || 0);
}

async function daily_Non_Vacational_EL() {
  console.log('Running job: daily_Non_Vacational_EL');
  const context = arguments[0] || {};
  const initiatedBy = context.fromApi ? (context.userId || 'api') : 'cli';
  let run = null;
  try { run = await jobRunService.startRun('daily_Non_Vacational_EL', { initiatedBy }); } catch (e) { console.warn('Could not record job run start:', e && e.message); }

  try {
    const nowParts = getIstNowParts();
    const year = Number(context.year) || nowParts.year;
    const month = nowParts.month;
    const day = nowParts.day;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // find non-vacational EL leave
      const { rows: leaves } = await client.query(
        "SELECT * FROM leaves WHERE LOWER(shortname) = 'el' AND LOWER(vacation_type) = 'non-vacational' AND LOWER(status) = 'active' LIMIT 1"
      );
      const leave = leaves && leaves[0];
      if (!leave) {
        console.log('No non-vacational EL leave found; nothing to do');
        await client.query('COMMIT');
        if (run) { try { await jobRunService.finishRun(run.id, 'success', { applied: 0 }); } catch (e) {} }
        return { applied: 0 };
      }

      const { rows: entitlements } = await client.query(
        'SELECT * FROM leave_staff_entitlements WHERE leave_id = $1 AND year = $2 AND status = $3',
        [leave.id, year, 'active']
      );

      let applied = 0;

      for (const eRow of entitlements) {
        // find earliest additional non-vacational designation start_date for this staff before current year
        const { rows: desRows } = await client.query(
          `SELECT start_date FROM designation_staff
           WHERE status = 'active' AND EXTRACT(YEAR FROM start_date) < $1
           AND designation_id IN (SELECT id FROM designations WHERE isadditional = 1 AND LOWER(isvacational) = 'non-vacational' AND status = 'active')
           AND staff_id = $2
           ORDER BY start_date LIMIT 1`,
          [year, eRow.staff_id]
        );

        if (!desRows || desRows.length === 0) continue;
        const startDate = desRows[0].start_date;
        const sDate = parseDateOnly(startDate);
        const sMonth = sDate.getUTCMonth() + 1;
        const sDay = sDate.getUTCDate();

        if (sMonth === month && sDay === day) {
          const { rows: staffRows } = await client.query('SELECT date_of_superanuation FROM staff WHERE id = $1 LIMIT 1', [eRow.staff_id]);
          const staff = staffRows && staffRows[0];
          if (!staff || !staff.date_of_superanuation) continue;

          const retirementDate = parseDateOnly(staff.date_of_superanuation);
          const retirementYear = retirementDate.getUTCFullYear();

          if (retirementYear === year && retirementDate > sDate) {
            const diffDays = daysBetweenDateOnly(sDate, retirementDate);
            const extra = Math.round((Number(leave.max_entitlement) || 0) * diffDays / 365);
            const newEntitled = (Number(leave.max_entitlement) || 0) + extra;
            await client.query('UPDATE leave_staff_entitlements SET entitled_curr_year = $1, updated_at = NOW() WHERE id = $2', [newEntitled, eRow.id]);
            applied++;
          } else if (retirementYear !== year) {
            const newEntitled = Number(leave.max_entitlement) || 0;
            await client.query('UPDATE leave_staff_entitlements SET entitled_curr_year = $1, updated_at = NOW() WHERE id = $2', [newEntitled, eRow.id]);
            applied++;
          }
        }
      }

      await client.query('COMMIT');
      if (run) { try { await jobRunService.finishRun(run.id, 'success', { applied }); } catch (e) {} }
      console.log('daily_Non_Vacational_EL applied to entitlements:', applied);
      return { applied };
    } catch (errInner) {
      await client.query('ROLLBACK');
      throw errInner;
    } finally {
      client.release();
    }
  } catch (err) {
    if (run) { try { await jobRunService.finishRun(run.id, 'failed', { error: err && err.message }); } catch (e) {} }
    throw err;
  }
}

async function halfyearlyEL() {
  console.log('Running job: halfyearlyEL');
  const context = arguments[0] || {};
  const initiatedBy = context.fromApi ? (context.userId || 'api') : 'cli';
  let run = null;
  try { run = await jobRunService.startRun('halfyearlyEL', { initiatedBy }); } catch (e) { console.warn('Could not record job run start:', e && e.message); }

  try {
    const nowParts = getIstNowParts();
    const year = Number(context.year) || nowParts.year;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // staff selection roughly matching Laravel query
      const staffSql = `SELECT staff.id, staff.fname, staff.mname, staff.lname, staff.date_of_superanuation
        FROM staff
        JOIN employee_types ON employee_types.staff_id = staff.id
        JOIN association_staff ON association_staff.staff_id = staff.id
        WHERE staff.id NOT IN (
          SELECT s.id FROM staff s
          JOIN designation_staff ON s.id = designation_staff.staff_id
          JOIN designations ON designation_staff.designation_id = designations.id
          WHERE designation_staff.status = 'active' AND designations.isadditional = 1 AND LOWER(designations.isvacational) = 'non-vacational'
        )
          AND LOWER(employee_types.employee_type) = 'teaching'
        AND association_staff.association_id IN (SELECT id FROM associations WHERE LOWER(asso_name) = 'confirmed' OR LOWER(asso_name) = 'promotional probationary')
        AND association_staff.status = 'active'`;

      const { rows: staffRows } = await client.query(staffSql);

      const { rows: leaveRows } = await client.query(
        "SELECT * FROM leaves WHERE LOWER(vacation_type) = 'vacational' AND LOWER(shortname) = 'el' AND LOWER(status) = 'active' LIMIT 1"
      );
      const leave = leaveRows && leaveRows[0];
      if (!leave) {
        console.log('Vacational EL leave not found; nothing to do');
        await client.query('COMMIT');
        if (run) { try { await jobRunService.finishRun(run.id, 'success', { applied: 0 }); } catch (e) {} }
        return { applied: 0 };
      }

      let applied = 0;

      for (const st of staffRows) {
        const { rows: entRows } = await client.query(
          'SELECT * FROM leave_staff_entitlements WHERE staff_id = $1 AND leave_id = $2 AND year = $3 AND status = $4 ORDER BY id LIMIT 1',
          [st.id, leave.id, year, 'active']
        );
        if (!entRows || entRows.length === 0) continue;
        const ent = entRows[0];

        const dor = st.date_of_superanuation ? parseDateOnly(st.date_of_superanuation).getUTCFullYear() : null;

        const current = safeNumber(ent.entitled_curr_year, 0);
        let max_entitlement_full;
        if (dor === year && st.date_of_superanuation) {
          const noOfDaysRemaining = daysBetweenDateOnly(st.date_of_superanuation, `${year}-07-01`);
          const base = safeNumber(leave.max_entitlement, 0);
          max_entitlement_full = Math.ceil(noOfDaysRemaining * base / 365);
        } else {
          const base = safeNumber(leave.max_entitlement, 0);
          max_entitlement_full = Math.max(base - current, 0);
        }

        const newEntitled = Math.round(current + max_entitlement_full);

        await client.query('UPDATE leave_staff_entitlements SET entitled_curr_year = $1, updated_at = NOW() WHERE id = $2', [newEntitled, ent.id]);
        applied++;
      }

      await client.query('COMMIT');
      if (run) { try { await jobRunService.finishRun(run.id, 'success', { applied }); } catch (e) {} }
      console.log('halfyearlyEL applied to staff count:', applied);
      return { applied };
    } catch (errInner) {
      await client.query('ROLLBACK');
      throw errInner;
    } finally {
      client.release();
    }
  } catch (err) {
    if (run) { try { await jobRunService.finishRun(run.id, 'failed', { error: err && err.message }); } catch (e) {} }
    throw err;
  }
}

async function sendMissingPunchesEmail() {
  console.log('Running job: sendMissingPunchesEmail');
  const nodemailer = require('nodemailer');
  const nowParts = getIstNowParts();
  const date = nowParts.date;
  const month = nowParts.month;
  const year = nowParts.year;

  try {
    // Fetch device logs from secondary biometric DB (Laravel uses mysql2 connection).
    const deviceTable = `DeviceLogs_${month}_${year}`;
    let loggedEmployeeCodes = [];
    try {
      const mysqlPool = mysql.createPool(SECONDARY_DB);
      const conn = await mysqlPool.getConnection();
      try {
        const [logRows] = await conn.query(
          `SELECT EmployeeCode FROM \`${deviceTable}\` WHERE LogDate_Date = ?`,
          [date]
        );
        loggedEmployeeCodes = (logRows || []).map((r) => String(r.EmployeeCode));
      } finally {
        try { conn.release(); } catch (_) {}
        await mysqlPool.end();
      }
    } catch (e) {
      // Backward-compatible fallback in case secondary DB is not configured.
      console.warn('Could not query secondary biometric logs DB, falling back to primary DB:', e && e.message);
      try {
        const { rows: logRows } = await pool.query(`SELECT EmployeeCode FROM \`${deviceTable}\` WHERE LogDate_Date = $1`, [date]);
        loggedEmployeeCodes = (logRows || []).map((r) => String(r.employeecode || r.EmployeeCode || r.employeeCode));
      } catch (inner) {
        console.warn('Could not query device logs table from primary DB fallback:', inner && inner.message);
      }
    }

    const missingSql = `SELECT DISTINCT staff.id, departments.dept_shortname, staff.EmployeeCode, users.email, CONCAT(staff.fname, ' ', COALESCE(staff.mname, ''), ' ', staff.lname) AS full_name
      FROM staff
      JOIN department_staff ON department_staff.staff_id = staff.id
      JOIN departments ON departments.id = department_staff.department_id
      JOIN users ON users.id = staff.user_id
      WHERE department_staff.status = 'active'
      ORDER BY department_staff.department_id, staff.fname`;

    const { rows: allStaff } = await pool.query(missingSql);
    const missing = [];
    for (const s of allStaff) {
      const empCode = String(s.employeecode || s.EmployeeCode || s.employeeCode || '');
      if (loggedEmployeeCodes.includes(empCode)) continue;
      const { rows: leaveRows } = await pool.query('SELECT 1 FROM leave_staff_applications WHERE start <= $1 AND "end" >= $1 AND appl_status NOT IN (\'rejected\', \'cancelled\') AND staff_id = $2 LIMIT 1', [date, s.id]);
      if (leaveRows && leaveRows.length > 0) continue;
      missing.push(s);
    }

    if (missing.length === 0) {
      console.log('No missing punches found');
    }

    const transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST || 'localhost',
      port: Number(process.env.MAIL_PORT) || 25,
      secure: false,
      auth: process.env.MAIL_USER ? { user: process.env.MAIL_USER, pass: process.env.MAIL_PASS } : undefined,
    });

    const deanEmail = process.env.DEAN_EMAIL || 'vcpatil@git.edu';

    for (const st of missing) {
      if (!st.email) {
        console.warn('Missing email for staff member:', st.full_name);
        continue;
      }
      const mailOptions = {
        from: process.env.MAIL_FROM || 'no-reply@git.edu',
        to: deanEmail,
        subject: `Missing biometric punch for ${date}`,
        text: `Dear ${st.full_name || 'Staff'},\n\nWe could not find your biometric punch for ${date}. Please verify.`,
      };
      try { await transporter.sendMail(mailOptions); } catch (e) { console.warn('Failed sending mail to', st.email, e && e.message); }
    }

    try {
      await transporter.sendMail({ from: process.env.MAIL_FROM || 'no-reply@git.edu', to: deanEmail, subject: `Missing punches summary ${date}`, text: `Missing records count: ${missing.length}` });
    } catch (e) { console.warn('Failed sending dean summary', e && e.message); }

    console.log('sendMissingPunchesEmail completed; mails attempted:', missing.length);
    return { sent: missing.length };
  } catch (err) {
    console.error('sendMissingPunchesEmail failed:', err && err.stack ? err.stack : err);
    throw err;
  }
}

module.exports = {
  yearly_leave_entitlements,
  inactivate_previous_year,
  monthly_leave_entitlements,
  daily_Non_Vacational_EL,
  halfyearlyEL,
  sendMissingPunchesEmail,
};
