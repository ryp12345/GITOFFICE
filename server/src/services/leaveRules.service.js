// Port of the Laravel leave-management business rules
// (LeaveStaffApplicationsController::validateleave, ::store routing, the
// HoD / Dean_admin / Principal approval views and the entitlement bookkeeping).
// Every leave endpoint must go through these helpers so the React app behaves
// exactly like the Laravel application.
const { pool } = require('../config/db');

const IST = 'Asia/Kolkata';
const HOD_DESIGNATIONS = [
  'hod',
  'registrar',
  'controller of examination',
  'dean mba',
  'placement officer',
  'vehicle maintenance in charge',
  'it cell incharge',
];

// ── date helpers (YYYY-MM-DD strings, UTC arithmetic → no timezone drift) ──
function pad(n) {
  return String(n).padStart(2, '0');
}

function toDateKey(value) {
  if (!value) return null;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
  }
  const s = String(value).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

function keyToUtc(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function addDays(key, n) {
  const dt = keyToUtc(key);
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
}

// number of days from a to b (b - a)
function diffDays(a, b) {
  return Math.round((keyToUtc(b) - keyToUtc(a)) / 86400000);
}

function dayOfWeek(key) {
  return keyToUtc(key).getUTCDay();
}

function yearOf(key) {
  return Number(String(key).slice(0, 4));
}

function isFirstOrThirdSaturday(key) {
  if (dayOfWeek(key) !== 6) return false;
  const d = Number(key.slice(8, 10));
  return (d >= 1 && d <= 7) || (d >= 15 && d <= 21);
}

function todayKey() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: IST,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  return parts.slice(0, 10);
}

// Laravel blocks applying for dates before the 25th of the previous month.
function earliestApplicableDate(reference = todayKey()) {
  let y = yearOf(reference);
  let m = Number(reference.slice(5, 7)) - 1;
  if (m === 0) {
    m = 12;
    y -= 1;
  }
  return `${y}-${pad(m)}-25`;
}

function normalizeShort(value) {
  return String(value || '').trim().toUpperCase();
}

function normalizeStatus(value) {
  return String(value || '').trim().toLowerCase();
}

function computeNoOfDays(startDate, endDate, clType = 'Full') {
  const s = toDateKey(startDate);
  const e = toDateKey(endDate);
  if (!s || !e || e < s) return null;
  const days = diffDays(s, e) + 1;
  if (days === 1 && (clType === 'Morning' || clType === 'Afternoon')) return 0.5;
  return days;
}

// Days of a leave that fall into each calendar year.
function splitDaysByYear(startDate, endDate, noOfDays) {
  const s = toDateKey(startDate);
  const e = toDateKey(endDate);
  if (!s || !e) return {};
  if (yearOf(s) === yearOf(e)) return { [yearOf(s)]: Number(noOfDays) || 0 };

  const result = {};
  for (let y = yearOf(s); y <= yearOf(e); y += 1) {
    const from = y === yearOf(s) ? s : `${y}-01-01`;
    const to = y === yearOf(e) ? e : `${y}-12-31`;
    result[y] = diffDays(from, to) + 1;
  }
  return result;
}

// ── staff profile ──────────────────────────────────────────────────────────
async function getStaffLeaveProfile(staffId, db = pool) {
  const id = Number(staffId);
  const [empType, additional, association, deanOrPrincipal] = await Promise.all([
    db.query(
      `SELECT employee_type FROM employee_types
       WHERE staff_id = $1 AND LOWER(COALESCE(status, 'active')) = 'active'
       ORDER BY id DESC LIMIT 1`,
      [id]
    ),
    db.query(
      `SELECT d.id, d.design_name, d.isvacational, d.leave_authorizer
       FROM designation_staff ds
       JOIN designations d ON d.id = ds.designation_id
       WHERE ds.staff_id = $1
         AND LOWER(COALESCE(ds.status, 'active')) = 'active'
         AND d.isadditional = 1
       ORDER BY ds.id ASC`,
      [id]
    ),
    db.query(
      `SELECT a.asso_name
       FROM association_staff ast
       JOIN associations a ON a.id = ast.association_id
       WHERE ast.staff_id = $1 AND LOWER(COALESCE(ast.status, 'active')) = 'active'
       ORDER BY ast.id DESC LIMIT 1`,
      [id]
    ),
    db.query(
      `SELECT 1
       FROM designation_staff ds
       JOIN designations d ON d.id = ds.designation_id
       WHERE ds.staff_id = $1
         AND LOWER(COALESCE(ds.status, 'active')) = 'active'
         AND (d.design_name ILIKE '%Dean%' OR d.design_name ILIKE '%Principal%')
       LIMIT 1`,
      [id]
    ),
  ]);

  const employeeType = empType.rows[0]?.employee_type || null;
  const isTeaching = String(employeeType || '').trim().toLowerCase() === 'teaching';
  const associationName = String(association.rows[0]?.asso_name || '').trim();
  const additionalDesignations = additional.rows;

  // LeaveStaffApplicationsController::index — vacation type of the leave list.
  let vacationType;
  if (additionalDesignations.length > 0) {
    const last = additionalDesignations[additionalDesignations.length - 1];
    vacationType = String(last.isvacational || '').toLowerCase().includes('non') ? 'Non-Vacational' : 'Vacational';
  } else if (isTeaching && ['confirmed', 'promotional probationary'].includes(associationName.toLowerCase())) {
    vacationType = 'Vacational';
  } else {
    vacationType = 'Non-Vacational';
  }

  return {
    staffId: id,
    employeeType,
    isTeaching,
    associationName,
    additionalDesignations,
    hasAdditionalDesignation: additionalDesignations.length > 0,
    hasAdditionalNonVacational: additionalDesignations.some(
      (d) => String(d.isvacational || '').toLowerCase().includes('non')
    ),
    hasDeanOrPrincipalDesignation: deanOrPrincipal.rows.length > 0,
    vacationType,
  };
}

// Leave types the staff member may apply for (general leaves of their vacation type).
async function getEligibleLeaveTypes(staffId, db = pool) {
  const profile = await getStaffLeaveProfile(staffId, db);
  const { rows } = await db.query(
    `SELECT DISTINCT ON (l.id)
        l.id, l.longname, l.shortname, l.vacation_type, l.max_entitlement, l.min_days, l.max_days, l.status
     FROM leaves l
     JOIN leave_rules lr ON lr.leave_id = l.id
     WHERE lr.max_time_allowed IS NULL
       AND LOWER(TRIM(l.vacation_type)) = LOWER($1)
       AND LOWER(COALESCE(l.status, 'active')) = 'active'
     ORDER BY l.id`,
    [profile.vacationType]
  );
  rows.sort((a, b) => String(a.shortname).localeCompare(String(b.shortname)));
  return { profile, leaveTypes: rows };
}

// ── routing (recommender / approver) — LeaveController::ESTB_Leave_store ──
async function findUserIdByRole(role, db = pool) {
  const { rows } = await db.query(
    'SELECT id FROM users WHERE LOWER(TRIM(role)) = LOWER($1) ORDER BY id ASC LIMIT 1',
    [role]
  );
  return rows[0]?.id ? Number(rows[0].id) : null;
}

async function findHodUserIdForStaff(staffId, db = pool) {
  const { rows } = await db.query(
    `SELECT s.user_id
     FROM designation_staff dsg
     JOIN designations d ON d.id = dsg.designation_id
     JOIN staff s ON s.id = dsg.staff_id
     WHERE LOWER(TRIM(d.design_name)) = ANY($2::text[])
       AND LOWER(COALESCE(dsg.status, 'active')) = 'active'
       AND dsg.dept_id = (
         SELECT ds.department_id
         FROM department_staff ds
         WHERE ds.staff_id = $1
           AND LOWER(COALESCE(ds.status, 'active')) = 'active'
           AND NOT EXISTS (
             SELECT 1 FROM designation_staff own
             WHERE own.staff_id = $1
               AND own.dept_id = ds.department_id
               AND own.dept_id IS NOT NULL
               AND LOWER(COALESCE(own.status, 'active')) = 'active'
           )
         ORDER BY ds.id ASC
         LIMIT 1
       )
     ORDER BY dsg.id ASC
     LIMIT 1`,
    [Number(staffId), HOD_DESIGNATIONS]
  );
  return rows[0]?.user_id ? Number(rows[0].user_id) : null;
}

// Staff applying themselves (LeaveStaffApplicationsController::store, since 29-05-2026):
//   the HoD lookup is disabled, so the recommender is always Dean_admin.
// Establishment applying on behalf (LeaveController::ESTB_Leave_store):
//   additional non-vacational designation → Principal, otherwise the department HoD;
//   no HoD → the application is refused ("HOD not found.").
// In both flows the approver is the recommender for additional non-vacational staff
// or leaves of 5+ days, otherwise Dean_admin.
async function resolveRouting(staffId, noOfDays, db = pool, { isEstablishment = false } = {}) {
  const profile = await getStaffLeaveProfile(staffId, db);
  const deanAdminUserId = await findUserIdByRole('Dean_admin', db);

  let recommenderUserId;
  if (!isEstablishment) {
    recommenderUserId = deanAdminUserId;
  } else if (profile.hasAdditionalNonVacational) {
    recommenderUserId = await findUserIdByRole('Principal', db);
  } else {
    recommenderUserId = await findHodUserIdForStaff(staffId, db);
  }

  if (!recommenderUserId) {
    const err = new Error('HOD not found.');
    err.statusCode = 409;
    throw err;
  }

  const approverUserId = (profile.hasAdditionalNonVacational || Number(noOfDays) >= 5)
    ? recommenderUserId
    : deanAdminUserId;

  return { profile, recommenderUserId, approverUserId, deanAdminUserId };
}

// ── validation — LeaveStaffApplicationsController::validateleave ──────────
async function findAdjacentLeave(db, staffId, column, dateKey, excludedClType, excludeAppId) {
  const params = [staffId, dateKey, excludedClType];
  let sql = `
    SELECT la.id, la.leave_id, la.no_of_days, l.shortname
    FROM leave_staff_applications la
    JOIN leaves l ON l.id = la.leave_id
    WHERE la.staff_id = $1
      AND la.${column}::date = $2::date
      AND COALESCE(la.cl_type, 'Full') <> $3
      AND LOWER(COALESCE(la.appl_status, 'pending')) NOT IN ('rejected', 'cancelled')
      AND UPPER(l.shortname) NOT LIKE '%DL%'`;
  if (excludeAppId) {
    params.push(Number(excludeAppId));
    sql += ` AND la.id <> $${params.length}`;
  }
  sql += ' ORDER BY la.id ASC LIMIT 1';
  const { rows } = await db.query(sql, params);
  return rows[0] || null;
}

async function isHoliday(db, dateKey) {
  const { rows } = await db.query(
    "SELECT 1 FROM holidayrhs WHERE start = $1::date AND type = 'Holiday' LIMIT 1",
    [dateKey]
  );
  return rows.length > 0;
}

async function getExistingApplication(db, applicationId) {
  if (!applicationId) return null;
  const { rows } = await db.query(
    `SELECT id, staff_id, leave_id, no_of_days, cl_type, appl_status,
            TO_CHAR(start::date, 'YYYY-MM-DD') AS start_date,
            TO_CHAR("end"::date, 'YYYY-MM-DD') AS end_date
     FROM leave_staff_applications WHERE id = $1 LIMIT 1`,
    [Number(applicationId)]
  );
  return rows[0] || null;
}

async function validateLeave(db, {
  staffId,
  leaveId,
  startDate,
  endDate,
  noOfDays,
  clType = 'Full',
  applicationId = null,
}) {
  const fail = (message) => ({ valid: false, message });
  const start = toDateKey(startDate);
  const end = toDateKey(endDate);
  if (!start || !end || end < start) return fail('Invalid date range');

  const { rows: leaveRows } = await db.query('SELECT * FROM leaves WHERE id = $1 LIMIT 1', [Number(leaveId)]);
  const leave = leaveRows[0];
  if (!leave) return fail('Invalid leave type');

  const shortname = normalizeShort(leave.shortname);
  // DL-* and LWP leaves are not validated in Laravel.
  if (shortname.includes('DL') || shortname.includes('LWP')) return { valid: true };

  const days = Number(noOfDays);
  const { rows: ruleRows } = await db.query(
    `SELECT * FROM leave_rules WHERE leave_id = $1 AND LOWER(COALESCE(status, 'active')) = 'active'
     ORDER BY id ASC LIMIT 1`,
    [Number(leaveId)]
  );
  const rules = ruleRows[0] || null;
  const { rows: combineRows } = await db.query(
    `SELECT combined_id FROM combine_leaves WHERE leave_id = $1 AND LOWER(COALESCE(status, 'active')) = 'active'`,
    [Number(leaveId)]
  );
  const combinable = new Set(combineRows.map((r) => Number(r.combined_id)));
  const existing = await getExistingApplication(db, applicationId);

  // Rule 4: minimum gap between two leaves of the same kind.
  if (rules && String(rules.gap || '').toLowerCase() === 'yes') {
    const params = [Number(staffId), Number(leaveId), start];
    let sql = `
      SELECT ABS(start::date - $3::date) AS days
      FROM leave_staff_applications
      WHERE staff_id = $1 AND leave_id = $2 AND start::date <= $3::date
        AND LOWER(COALESCE(appl_status, 'pending')) NOT IN ('rejected', 'cancelled')`;
    if (applicationId) {
      params.push(Number(applicationId));
      sql += ` AND id <> $${params.length}`;
    }
    sql += ' ORDER BY days ASC LIMIT 1';
    const { rows } = await db.query(sql, params);
    if (rows[0] && Number(rules.min_gap || 0) > Number(rows[0].days)) {
      return fail(`You have already taken a similar leave recently. You must wait for at least ${rules.min_gap} days.`);
    }
  }

  const messages = [];

  // Rule 7: entitlement balance, per calendar year.
  const entitledType = Number(leave.max_entitlement || 0) > 0
    && !shortname.startsWith('SML')
    && shortname !== 'ML';
  if (entitledType) {
    const requested = splitDaysByYear(start, end, days);
    const previous = existing && Number(existing.leave_id) === Number(leaveId)
      && !['rejected', 'cancelled'].includes(normalizeStatus(existing.appl_status))
      ? splitDaysByYear(existing.start_date, existing.end_date, existing.no_of_days)
      : {};

    for (const [yearKey, requestedDays] of Object.entries(requested)) {
      const extra = requestedDays - (previous[yearKey] || 0);
      if (extra <= 0) continue;
      const { rows } = await db.query(
        `SELECT entitled_curr_year, accumulated, consumed_curr_year
         FROM leave_staff_entitlements
         WHERE staff_id = $1 AND leave_id = $2 AND year = $3
         ORDER BY id DESC LIMIT 1`,
        [Number(staffId), Number(leaveId), Number(yearKey)]
      );
      const ent = rows[0];
      if (!ent) {
        messages.push(`You do not have any leave entitlement for the year ${yearKey}.`);
        continue;
      }
      const available = Number(ent.entitled_curr_year || 0) + Number(ent.accumulated || 0);
      const consumed = Number(ent.consumed_curr_year || 0);
      if (extra + consumed > available) {
        messages.push(`You do not have that many leaves left to your credit for the year ${yearKey}. You can avail only ${available - consumed} days leave.`);
      }
    }
  }

  // Rule 1: no overlapping leave days.
  {
    const params = [Number(staffId), start, end];
    let sql = `
      SELECT 1 FROM leave_staff_applications
      WHERE staff_id = $1
        AND LOWER(COALESCE(appl_status, 'pending')) NOT IN ('rejected', 'cancelled')
        AND start::date <= $3::date AND "end"::date >= $2::date`;
    if (applicationId) {
      params.push(Number(applicationId));
      sql += ` AND id <> $${params.length}`;
    }
    const { rows } = await db.query(`${sql} LIMIT 1`, params);
    if (rows.length > 0) {
      return fail('The day mentioned in this leave application is having an overlapping days of another leave application.');
    }
  }

  // Rule 2 + the 5-day rule: walk back over holidays / RH / adjoining leaves.
  const exempt = (s) => s === 'EL' || s === 'LWP';
  const rhDates = [];
  const holidayDates = [];
  let prev = addDays(start, -1);
  let walking = true;
  let guard = 0;
  while (walking && clType !== 'Afternoon' && guard < 60) {
    guard += 1;
    const holiday = await isHoliday(db, prev);
    if (holiday) {
      holidayDates.push(prev);
      prev = addDays(prev, -1);
    }
    const dow = dayOfWeek(prev);
    if (dow === 0) {
      holidayDates.push(prev);
      prev = addDays(prev, -1);
    }
    const saturday = isFirstOrThirdSaturday(prev);
    if (saturday) {
      holidayDates.push(prev);
      prev = addDays(prev, -1);
    }

    const before = await findAdjacentLeave(db, Number(staffId), '"end"', prev, 'Morning', applicationId);
    if (before && normalizeShort(before.shortname) === 'RH') {
      rhDates.push(prev);
      prev = addDays(prev, -1);
      continue;
    }

    if (before) {
      const beforeShort = normalizeShort(before.shortname);
      if (holidayDates.length > 0) {
        if (rhDates.length + holidayDates.length + days > 5 && !exempt(beforeShort)) {
          return fail('You have applied for leave combining with RH and holidays and the total number of days of leave including RH & holidays will be more than 5. You are not allowed to take more than 5 days off.');
        }
        if (beforeShort !== 'EL' && Number(before.no_of_days) + days + holidayDates.length > 5) {
          return fail('You have applied for a leave followed by holidays and the total number of days of leave including the holidays will be more than 5. You are not allowed to take more than 5 days off.');
        }
      } else if (rhDates.length + holidayDates.length + days > 5 && !exempt(shortname)) {
        return fail('You have applied leave with holidays/RH and the total number of days of leave including RH/holidays will be more than 5. You are not allowed to take more than 5 days off.');
      }

      if (Number(before.leave_id) !== Number(leaveId) && !combinable.has(Number(before.leave_id))) {
        return fail('Application rejected as it is combined with a leave that is not allowed.');
      }
      prev = addDays(prev, -1);
    } else {
      walking = false;
    }

    if (!before && !holiday && dow !== 0 && !saturday) walking = false;
  }

  // ...and forward from the end date.
  const postHolidayDates = [];
  let rhFoundPost = false;
  let next = addDays(end, 1);
  walking = true;
  guard = 0;
  while (walking && clType !== 'Morning' && guard < 60) {
    guard += 1;
    const holiday = await isHoliday(db, next);
    if (holiday) {
      postHolidayDates.push(next);
      next = addDays(next, 1);
    }
    const saturday = isFirstOrThirdSaturday(next);
    if (saturday) {
      postHolidayDates.push(next);
      next = addDays(next, 1);
    }
    const dow = dayOfWeek(next);
    if (dow === 0) {
      postHolidayDates.push(next);
      next = addDays(next, 1);
    }

    const after = await findAdjacentLeave(db, Number(staffId), 'start', next, 'Afternoon', applicationId);
    if (after && normalizeShort(after.shortname) === 'RH') {
      rhDates.push(next);
      if (clType === 'Afternoon') rhFoundPost = true;
      next = addDays(next, 1);
      continue;
    }

    if (after) {
      if (clType === 'Afternoon' && rhFoundPost) {
        return fail('You cannot apply this afternoon leave as there is a regular leave after the RH and holidays that follow your leave date. The leave can only be granted if there is no leave after the RH and subsequent holidays/weekends.');
      }
      const afterShort = normalizeShort(after.shortname);
      if (postHolidayDates.length + days > 5 && !exempt(afterShort)) {
        return fail('You have applied for leave combining with RH and holidays and the total number of days of leave including RH & holidays will be more than 5. You are not allowed to take more than 5 days off.');
      }
      if (!exempt(afterShort) && Number(after.no_of_days) + days + postHolidayDates.length > 5) {
        return fail('You have applied for a leave followed by holidays and the total number of days of leave including the holidays will be more than 5. You are not allowed to take more than 5 days off.');
      }
      if (Number(after.leave_id) !== Number(leaveId) && !combinable.has(Number(after.leave_id))) {
        return fail('Application rejected as it is combined with a leave that is not allowed.');
      }
      next = addDays(next, 1);
      continue;
    }

    if (postHolidayDates.length + days > 6 && !exempt(shortname) && !(clType === 'Afternoon' && rhFoundPost)) {
      return fail('You have applied for leave combining with RH and holidays and the total number of days of leave including RH & holidays will be more than 5. You are not allowed to take more than 5 days off.');
    }
    if (!holiday && dow !== 0 && !saturday) walking = false;
  }

  // Rule 3: min / max days of the leave type.
  if (leave.min_days != null && days < Number(leave.min_days)) {
    messages.push(`Request does not match the min days requirement - Min days allowed is ${leave.min_days}.`);
  } else if (leave.max_days != null && days > Number(leave.max_days)) {
    messages.push(`You are violating the max days allowed for this leave type and Max days allowed is ${leave.max_days}.`);
  }

  // Rule 6: prior intimation.
  const prior = Number(rules?.prior_intimation_days || 0);
  if (prior > 0 && start <= addDays(todayKey(), prior)) {
    messages.push(`Application is rejected as the application must be done ${prior} days before.`);
  }

  if (messages.length > 0) return fail(messages.join(' '));
  return { valid: true };
}

// Request-level checks the Laravel staff form enforces before validateleave.
async function validateStaffRequest(db, { staffId, leaveId, startDate, endDate, clType, alternate, isNew }) {
  const fail = (message) => ({ valid: false, message });
  if (!alternate) return fail('You have not selected the leave type or Alternate arrangement.');

  const { leaveTypes } = await getEligibleLeaveTypes(staffId, db);
  const leaveType = leaveTypes.find((l) => Number(l.id) === Number(leaveId));
  if (!leaveType) return fail('This leave type is not applicable to you.');

  const shortname = normalizeShort(leaveType.shortname);
  const start = toDateKey(startDate);
  const end = toDateKey(endDate);
  if (!start || !end || end < start) return fail('To date should be greater than from date');
  if (diffDays(start, end) > 30) return fail('Leave cannot be applied for more than 30 days at a time.');

  if ((clType === 'Morning' || clType === 'Afternoon') && (shortname !== 'CL' || start !== end)) {
    return fail('Half day leave can be applied only for a single day CL.');
  }

  if (shortname === 'RH') {
    if (start !== end) return fail('RH can be applied only for one day.');
    const { rows } = await db.query("SELECT 1 FROM holidayrhs WHERE start = $1::date AND type = 'RH' LIMIT 1", [start]);
    if (rows.length === 0) return fail('RH can be applied only on a Restricted Holiday.');
  }

  if (isNew && start < earliestApplicableDate()) {
    return fail('Sorry, you are not allowed to apply leave for this date.');
  }

  return { valid: true };
}

// ── entitlement bookkeeping (Laravel increments / decrements consumed) ─────
async function adjustConsumed(db, { staffId, leaveId, startDate, endDate, noOfDays, sign }) {
  const perYear = splitDaysByYear(startDate, endDate, noOfDays);
  for (const [yearKey, yearDays] of Object.entries(perYear)) {
    const delta = sign * Number(yearDays || 0);
    if (!delta) continue;
    const { rows } = await db.query(
      `SELECT id FROM leave_staff_entitlements
       WHERE staff_id = $1 AND leave_id = $2 AND year = $3
       ORDER BY id DESC LIMIT 1`,
      [Number(staffId), Number(leaveId), Number(yearKey)]
    );
    if (rows[0]) {
      await db.query(
        `UPDATE leave_staff_entitlements
         SET consumed_curr_year = COALESCE(consumed_curr_year, 0) + $1, updated_at = NOW()
         WHERE id = $2`,
        [delta, rows[0].id]
      );
    } else if (delta > 0) {
      // First application of a leave without a yearly grant (DL-GIT, DL-VTU...).
      await db.query(
        `INSERT INTO leave_staff_entitlements
           (year, staff_id, leave_id, entitled_curr_year, accumulated, consumed_curr_year,
            encashed_curr_year, total_encashed, wef, status, created_at, updated_at)
         VALUES ($1, $2, $3, 0, 0, $4, 0, 0, $5, 'active', NOW(), NOW())`,
        [Number(yearKey), Number(staffId), Number(leaveId), delta, `${yearKey}-01-01`]
      );
    }
  }
}

// ── approval permissions (HoD / Dean_admin / Principal leave views) ────────
async function getAdditionalDesignationMap(staffIds, db = pool) {
  const ids = [...new Set((staffIds || []).map(Number).filter(Boolean))];
  const map = new Map();
  if (ids.length === 0) return map;
  const { rows } = await db.query(
    `SELECT ds.staff_id, d.design_name, d.leave_authorizer
     FROM designation_staff ds
     JOIN designations d ON d.id = ds.designation_id
     WHERE ds.staff_id = ANY($1::bigint[])
       AND LOWER(COALESCE(ds.status, 'active')) = 'active'
       AND d.isadditional = 1`,
    [ids]
  );
  for (const row of rows) {
    const key = Number(row.staff_id);
    const entry = map.get(key) || { names: [], authorizers: [] };
    entry.names.push(row.design_name);
    if (row.leave_authorizer) entry.authorizers.push(String(row.leave_authorizer));
    map.set(key, entry);
  }
  return map;
}

function canHodRecommend(app, additional) {
  const status = normalizeStatus(app.appl_status);
  const authorized = !additional || additional.authorizers.some((a) => a.toLowerCase() === 'hod');
  return authorized && (status === 'pending' || status === 'rejected');
}

function canHodReject(app, additional) {
  const authorized = !additional || additional.authorizers.some((a) => a.toLowerCase() === 'hod');
  return authorized && normalizeStatus(app.appl_status) === 'pending';
}

function canDeanAct(app, additional) {
  return !additional
    && Number(app.no_of_days || 0) < 5
    && normalizeStatus(app.appl_status) === 'recommended';
}

function canPrincipalAct(app, additional) {
  const status = normalizeStatus(app.appl_status);
  if (status === 'cancelled') return false;
  return (Boolean(additional) && status !== 'approved')
    || (Number(app.no_of_days || 0) > 4 && status === 'recommended');
}

// Annotate list rows with `additional`, `leave_authorizer` and the action flags.
async function annotateApplications(rows, role, db = pool) {
  if (!Array.isArray(rows) || rows.length === 0) return rows || [];
  const map = await getAdditionalDesignationMap(rows.map((r) => r.staff_id), db);
  return rows.map((row) => {
    const additional = map.get(Number(row.staff_id)) || null;
    const flags = {};
    if (role === 'hod') {
      flags.can_recommend = canHodRecommend(row, additional);
      flags.can_reject = canHodReject(row, additional);
    } else if (role === 'dean') {
      flags.can_approve = canDeanAct(row, additional);
      flags.can_reject = flags.can_approve;
    } else if (role === 'principal') {
      flags.can_approve = canPrincipalAct(row, additional);
      flags.can_reject = flags.can_approve;
    }
    return {
      ...row,
      additional: additional ? additional.names.join(', ') : null,
      leave_authorizer: additional ? additional.authorizers.join(', ') : null,
      ...flags,
    };
  });
}

async function insertNotification(db, userId, title, description, type = 'Leave') {
  if (!userId) return;
  await db.query(
    `INSERT INTO notifications (user_id, notification_title, notification_type, date, description, created_at, updated_at)
     VALUES ($1, $2, $3, $4::date, $5, NOW(), NOW())`,
    [Number(userId), title, type, todayKey(), description]
  );
}

// Apply a status transition with Laravel's entitlement side effects:
//   rejected → recommended/approved re-adds the days, any → rejected removes them.
async function transitionApplicationStatus(db, app, nextStatus, { actorUserId = null, notifyStaff = false } = {}) {
  const current = normalizeStatus(app.appl_status);
  const wasCounted = !['rejected', 'cancelled'].includes(current);
  const willCount = !['rejected', 'cancelled'].includes(nextStatus);
  const leave = {
    staffId: app.staff_id,
    leaveId: app.leave_id,
    startDate: app.start_date,
    endDate: app.end_date,
    noOfDays: app.no_of_days,
  };
  if (wasCounted && !willCount) await adjustConsumed(db, { ...leave, sign: -1 });
  if (!wasCounted && willCount) await adjustConsumed(db, { ...leave, sign: 1 });

  const { rows } = await db.query(
    `UPDATE leave_staff_applications
     SET appl_status = $1,
         recommender = CASE WHEN $1 = 'recommended' AND $2::bigint IS NOT NULL THEN $2 ELSE recommender END,
         approver = CASE WHEN $1 = 'approved' AND $2::bigint IS NOT NULL THEN $2 ELSE approver END,
         updated_at = NOW()
     WHERE id = $3
     RETURNING id, appl_status`,
    [nextStatus, actorUserId ? Number(actorUserId) : null, Number(app.id)]
  );

  if (notifyStaff) {
    const { rows: staffRows } = await db.query('SELECT user_id FROM staff WHERE id = $1 LIMIT 1', [Number(app.staff_id)]);
    const staffUserId = staffRows[0]?.user_id;
    if (nextStatus === 'approved') {
      await insertNotification(db, staffUserId, 'Leave Application Approved', 'Your leave application has been approved successfully.');
    } else if (nextStatus === 'rejected') {
      await insertNotification(db, staffUserId, 'Leave Application Rejected', 'Your leave application has been rejected.');
    }
  }

  return rows[0] || null;
}

async function getApplicationForAction(db, applicationId) {
  const { rows } = await db.query(
    `SELECT id, staff_id, leave_id, no_of_days, appl_status,
            TO_CHAR(start::date, 'YYYY-MM-DD') AS start_date,
            TO_CHAR("end"::date, 'YYYY-MM-DD') AS end_date
     FROM leave_staff_applications WHERE id = $1 LIMIT 1 FOR UPDATE`,
    [Number(applicationId)]
  );
  return rows[0] || null;
}

module.exports = {
  toDateKey,
  addDays,
  diffDays,
  todayKey,
  earliestApplicableDate,
  computeNoOfDays,
  splitDaysByYear,
  normalizeStatus,
  getStaffLeaveProfile,
  getEligibleLeaveTypes,
  resolveRouting,
  validateLeave,
  validateStaffRequest,
  adjustConsumed,
  getAdditionalDesignationMap,
  canHodRecommend,
  canHodReject,
  canDeanAct,
  canPrincipalAct,
  annotateApplications,
  insertNotification,
  transitionApplicationStatus,
  getApplicationForAction,
};
