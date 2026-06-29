const { pool } = require('../config/db');

function normalizeStatus(value) {
  return String(value || '').trim().toLowerCase();
}

async function resolveStaffIdFromUserId(userId) {
  const id = Number(userId);
  if (!id) return null;

  const byUser = await pool.query('SELECT id FROM staff WHERE user_id = $1 LIMIT 1', [id]);
  if (byUser.rows[0]?.id) return Number(byUser.rows[0].id);

  // Fallback: sometimes callers may already pass staff.id
  const byStaff = await pool.query('SELECT id FROM staff WHERE id = $1 LIMIT 1', [id]);
  if (byStaff.rows[0]?.id) return Number(byStaff.rows[0].id);

  return null;
}

async function getActiveDepartmentIdsForStaff(staffId) {
  const { rows } = await pool.query(
    `
      SELECT DISTINCT ds.department_id
      FROM department_staff ds
      WHERE ds.staff_id = $1
        AND LOWER(COALESCE(ds.status, 'active')) = 'active'
        AND ds.department_id IS NOT NULL
    `,
    [staffId]
  );
  return rows.map((row) => Number(row.department_id)).filter(Boolean);
}

async function getActiveEmployeeTypeForStaff(staffId) {
  const { rows } = await pool.query(
    `
      SELECT et.employee_type
      FROM employee_types et
      WHERE et.staff_id = $1
        AND LOWER(COALESCE(et.status, 'active')) = 'active'
      ORDER BY et.id DESC
      LIMIT 1
    `,
    [staffId]
  );
  return rows[0]?.employee_type || null;
}

async function getMeta() {
  const [leavesResult, yearsResult] = await Promise.all([
    pool.query(
      `SELECT id, longname, shortname, status
       FROM leaves
       WHERE LOWER(COALESCE(status, 'active')) = 'active'
       ORDER BY shortname ASC`
    ),
    pool.query(
      `SELECT DISTINCT EXTRACT(YEAR FROM start)::int AS year
       FROM holidayrhs
       WHERE start IS NOT NULL
       ORDER BY year ASC`
    ),
  ]);

  return {
    leaves: leavesResult.rows || [],
    holidayYears: (yearsResult.rows || []).map((row) => row.year).filter(Boolean),
  };
}

async function getCalendarEvents({ year, month } = {}) {
  const y = Number(year);
  const m = Number(month);
  if (!y || !m || m < 1 || m > 12) return [];

  const from = `${y}-${String(m).padStart(2, '0')}-01`;
  const to = new Date(y, m, 0).toISOString().slice(0, 10);

  const { rows } = await pool.query(
    `
      SELECT
        la.id,
        la.staff_id,
        CONCAT_WS(' ', s.fname, s.mname, s.lname) AS staff_name,
        dept.shortname,
        la.leave_id,
        l.shortname AS leave_shortname,
        l.longname AS leave_longname,
        TO_CHAR(la.start::date, 'YYYY-MM-DD') AS start_date,
        TO_CHAR(la.end::date, 'YYYY-MM-DD') AS end_date,
        la.no_of_days,
        la.cl_type,
        la.reason,
        la.alternate,
        CONCAT_WS(' ', s2.fname, s2.mname, s2.lname) AS alternate_staff,
        la.appl_status,
        la.appl_status AS status,
        la.created_at
      FROM leave_staff_applications la
      LEFT JOIN leaves l ON l.id = la.leave_id
      LEFT JOIN staff s ON s.id = la.staff_id
      LEFT JOIN staff s2 ON s2.id = la.alternate
      LEFT JOIN LATERAL (
        SELECT STRING_AGG(DISTINCT d.dept_shortname, ', ' ORDER BY d.dept_shortname) AS shortname
        FROM department_staff ds
        JOIN departments d ON d.id = ds.department_id
        WHERE ds.staff_id = la.staff_id
          AND LOWER(COALESCE(ds.status, 'active')) = 'active'
      ) dept ON TRUE
      WHERE la.start::date <= $2::date
        AND la.end::date >= $1::date
      ORDER BY la.start ASC, la.id ASC
    `,
    [from, to]
  );

  return rows || [];
}

async function getApplicationsByStaffUserId(userId) {
  const staffId = await resolveStaffIdFromUserId(userId);
  if (!staffId) return [];

  const { rows } = await pool.query(
    `
      SELECT
        la.id,
        la.staff_id,
        la.leave_id,
        l.shortname AS leave_shortname,
        l.longname AS leave_longname,
        TO_CHAR(la.start::date, 'YYYY-MM-DD') AS start_date,
        TO_CHAR(la.end::date, 'YYYY-MM-DD') AS end_date,
        la.no_of_days,
        la.cl_type,
        la.reason,
        la.alternate,
        la.additional_alternate,
        la.appl_status AS status,
        la.created_at
      FROM leave_staff_applications la
      LEFT JOIN leaves l ON l.id = la.leave_id
      WHERE la.staff_id = $1
      ORDER BY la.start DESC, la.id DESC
    `,
    [staffId]
  );

  return rows || [];
}

async function getLeaveApplicationById(applicationId) {
  const id = Number(applicationId);
  if (!id) return null;

  const { rows } = await pool.query(
    `
      SELECT
        la.id,
        la.staff_id,
        la.leave_id,
        l.shortname AS leave_shortname,
        l.longname AS leave_longname,
        TO_CHAR(la.start::date, 'YYYY-MM-DD') AS start_date,
        TO_CHAR(la.end::date, 'YYYY-MM-DD') AS end_date,
        la.no_of_days,
        la.cl_type,
        la.reason,
        la.alternate,
        la.additional_alternate,
        la.appl_status AS status,
        la.created_at,
        la.updated_at
      FROM leave_staff_applications la
      LEFT JOIN leaves l ON l.id = la.leave_id
      WHERE la.id = $1
      LIMIT 1
    `,
    [id]
  );

  return rows[0] || null;
}

async function validateLeaveApplication({ staffId: userId, startDate, endDate, applicationId = null } = {}) {
  const staffId = await resolveStaffIdFromUserId(userId);
  if (!staffId) {
    return { valid: false, message: 'Staff record not found for this user' };
  }

  const params = [staffId, endDate, startDate];
  let sql = `
    SELECT id
    FROM leave_staff_applications
    WHERE staff_id = $1
      AND LOWER(COALESCE(appl_status, 'pending')) NOT IN ('rejected', 'cancelled')
      AND start::date <= $2::date
      AND "end"::date >= $3::date
  `;

  if (applicationId) {
    sql += ' AND id <> $4';
    params.push(Number(applicationId));
  }

  sql += ' LIMIT 1';

  const { rows } = await pool.query(sql, params);
  if (rows.length > 0) {
    return { valid: false, message: 'Overlaps with an existing leave application' };
  }

  return { valid: true };
}

async function getLeaveRules(leaveId) {
  const { rows } = await pool.query(
    `SELECT * FROM leave_rules WHERE leave_id = $1 AND LOWER(TRIM(COALESCE(status, ''))) = 'active' ORDER BY id DESC LIMIT 1`,
    [Number(leaveId)]
  );
  return rows[0] || null;
}

async function getLeaveById(leaveId) {
  const { rows } = await pool.query(
    `SELECT * FROM leaves WHERE id = $1 LIMIT 1`,
    [Number(leaveId)]
  );
  return rows[0] || null;
}

async function getCombineLeaves(leaveId) {
  const { rows } = await pool.query(
    `SELECT cl.combined_id FROM combine_leaves cl WHERE cl.leave_id = $1 AND LOWER(TRIM(COALESCE(cl.status, ''))) = 'active'`,
    [Number(leaveId)]
  );
  return rows.map((r) => Number(r.combined_id));
}

async function getHolidaysForDates(dateKeys) {
  if (!Array.isArray(dateKeys) || dateKeys.length === 0) return [];
  const { rows } = await pool.query(
    `SELECT start, type, title FROM holidayrhs WHERE start = ANY($1::date[]) AND LOWER(TRIM(COALESCE(type, ''))) IN ('holiday', 'rh')`,
    [dateKeys]
  );
  return rows;
}

function isFirstOrThirdSaturday(dateStr) {
  const date = new Date(dateStr + 'T00:00:00');
  if (isNaN(date.getTime()) || date.getDay() !== 6) return false;
  const day = date.getDate();
  return (day >= 1 && day <= 7) || (day >= 15 && day <= 21);
}

async function checkOverlappingLeave(client, staffId, startDate, endDate, excludeAppId = null) {
  const params = [staffId, endDate, startDate];
  let sql = `
    SELECT la.id, l.shortname, la.start, la."end", la.no_of_days, la.cl_type, la.appl_status
    FROM leave_staff_applications la
    JOIN leaves l ON l.id = la.leave_id
    WHERE la.staff_id = $1
      AND LOWER(COALESCE(la.appl_status, 'pending')) NOT IN ('rejected', 'cancelled')
      AND la.start::date <= $2::date
      AND la."end"::date >= $3::date
  `;
  if (excludeAppId) {
    sql += ' AND la.id <> $4';
    params.push(Number(excludeAppId));
  }
  sql += ' LIMIT 1';
  const { rows } = await client.query(sql, params);
  return rows[0] || null;
}

async function findPreviousLeaveBefore(client, staffId, endDate) {
  const { rows } = await client.query(
    `
    SELECT la.id, l.shortname, la.start, la."end", la.no_of_days, la.cl_type, la.appl_status, la.leave_id
    FROM leave_staff_applications la
    JOIN leaves l ON l.id = la.leave_id
    WHERE la.staff_id = $1
      AND la."end" = $2
      AND LOWER(COALESCE(la.cl_type, 'full')) != 'morning'
      AND LOWER(COALESCE(la.appl_status, 'pending')) NOT IN ('rejected', 'cancelled')
      AND UPPER(TRIM(l.shortname)) NOT LIKE '%DL%'
    LIMIT 1
    `,
    [staffId, endDate]
  );
  return rows[0] || null;
}

async function findNextLeaveAfter(client, staffId, startDate) {
  const { rows } = await client.query(
    `
    SELECT la.id, l.shortname, la.start, la."end", la.no_of_days, la.cl_type, la.appl_status, la.leave_id
    FROM leave_staff_applications la
    JOIN leaves l ON l.id = la.leave_id
    WHERE la.staff_id = $1
      AND la.start = $2
      AND LOWER(COALESCE(la.cl_type, 'full')) != 'afternoon'
      AND LOWER(COALESCE(la.appl_status, 'pending')) NOT IN ('rejected', 'cancelled')
      AND UPPER(TRIM(l.shortname)) NOT LIKE '%DL%'
    LIMIT 1
    `,
    [staffId, startDate]
  );
  return rows[0] || null;
}

async function validateLeaveRules(client, staffId, leaveId, startDate, endDate, noOfDays, clType, applicationId = null) {
  const leave = await getLeaveById(leaveId);
  if (!leave) {
    return { valid: false, message: 'Invalid leave type' };
  }

  const rules = await getLeaveRules(leaveId);
  const combineLeaveIds = await getCombineLeaves(leaveId);
  const shortname = String(leave.shortname || '').toUpperCase();

  if (shortname.startsWith('DL') || shortname.toLowerCase().includes('lwp')) {
    return { valid: true };
  }

  const start = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T00:00:00');

  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
    return { valid: false, message: 'Invalid date range' };
  }

  const entitlementResult = await client.query(
    `
    SELECT lse.entitled_curr_year, lse.accumulated, lse.consumed_curr_year, lse.encashed_curr_year, lse.total_encashed
    FROM leave_staff_entitlements lse
    WHERE lse.staff_id = $1 AND lse.leave_id = $2 AND lse.year = $3
    ORDER BY lse.id DESC LIMIT 1
    `,
    [staffId, leaveId, start.getFullYear()]
  );
  const entitlement = entitlementResult.rows[0] || null;
  if (entitlement) {
    const entitled = Number(entitlement.entitled_curr_year || 0);
    const accumulated = Number(entitlement.accumulated || 0);
    const consumed = Number(entitlement.consumed_curr_year || 0);
    const encashed = Number(entitlement.encashed_curr_year || 0) + Number(entitlement.total_encashed || 0);
    const availableBalance = Math.max(entitled + accumulated - consumed - encashed, 0);

    if (noOfDays > availableBalance) {
      return { valid: false, message: `You do not have enough leave balance. Available: ${availableBalance}, requested: ${noOfDays}` };
    }
  }

  const dayDiff = Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;
  const clNormalized = String(clType || 'Full').trim().toLowerCase();
  const isFullDay = clNormalized === 'full' || clNormalized === 'full day';
  const effectiveDays = (dayDiff === 1 && !isFullDay) ? 0.5 : dayDiff;

  if (noOfDays !== effectiveDays) {
    return { valid: false, message: `No of days mismatch. Expected ${effectiveDays} but got ${noOfDays}` };
  }

  if (leave.min_days != null && noOfDays < Number(leave.min_days)) {
    return { valid: false, message: `Minimum ${leave.min_days} days required for this leave type` };
  }

  if (leave.max_days != null && noOfDays > Number(leave.max_days)) {
    return { valid: false, message: `Maximum ${leave.max_days} days allowed for this leave type` };
  }

  if (rules && String(rules.gap || '').toLowerCase() === 'yes') {
    const minGap = Number(rules.min_gap || 0);
    if (minGap > 0) {
      const similarLeave = await client.query(
        `
        SELECT id, start
        FROM leave_staff_applications
        WHERE staff_id = $1 AND leave_id = $2 AND start::date <= $3::date
        ORDER BY ABS(EXTRACT(DAY FROM (start::date - $3::date))) ASC
        LIMIT 1
        `,
        [staffId, leaveId, startDate]
      );
      if (similarLeave.rows[0]?.start) {
        const lastStart = new Date(String(similarLeave.rows[0].start));
        const thisStart = new Date(startDate + 'T00:00:00');
        const diffDays = Math.abs(Math.floor((thisStart - lastStart) / 86400000));
        if (diffDays > 0 && diffDays < minGap) {
          return { valid: false, message: `You must wait at least ${minGap} days between similar leaves. Last leave was ${diffDays} days ago.` };
        }
      }
    }
  }

  // Rule-5: Max time allowed in period (max times in specified period)
  if (rules && rules.period && rules.max_time_allowed) {
    const normalizedPeriod = String(rules.period || '').toLowerCase();
    let periodStart = new Date(startDate + 'T00:00:00');
    const periodStartCloned = new Date(periodStart);

    if (normalizedPeriod.includes('entire service')) {
      periodStart = new Date('2000-01-01');
    } else if (normalizedPeriod.includes('five years')) {
      periodStartCloned.setFullYear(periodStartCloned.getFullYear() - 5);
    } else if (normalizedPeriod.includes('one year')) {
      periodStartCloned.setFullYear(periodStartCloned.getFullYear() - 1);
    } else if (normalizedPeriod.includes('six months')) {
      periodStartCloned.setMonth(periodStartCloned.getMonth() - 6);
    } else if (normalizedPeriod.includes('one month')) {
      periodStartCloned.setMonth(periodStartCloned.getMonth() - 1);
    } else {
      periodStartCloned.setFullYear(periodStartCloned.getFullYear() - 1);
    }

    const countResult = await client.query(
      `SELECT COUNT(*) AS cnt FROM leave_staff_applications WHERE staff_id = $1 AND leave_id = $2 AND LOWER(COALESCE(appl_status, 'pending')) NOT IN ('rejected', 'cancelled') AND start >= $3::date`,
      [staffId, leaveId, periodStartCloned.toISOString().slice(0, 10)]
    );

    const count = Number(countResult.rows[0]?.cnt || 0);
    if (count >= Number(rules.max_time_allowed)) {
      return { valid: false, message: `You cannot take this leave more than ${rules.max_time_allowed} times in the specified period.` };
    }
  }

  if (rules && Number(rules.prior_intimation_days || 0) > 0) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const leaveStart = new Date(startDate + 'T00:00:00');
    const requiredDate = new Date(today);
    requiredDate.setDate(requiredDate.getDate() + Number(rules.prior_intimation_days));

    if (leaveStart < requiredDate) {
      return { valid: false, message: `Application must be submitted at least ${rules.prior_intimation_days} days before the leave start date` };
    }
  }

  const overlap = await checkOverlappingLeave(client, staffId, startDate, endDate, applicationId);
  if (overlap) {
    return { valid: false, message: 'Overlaps with an existing leave application' };
  }

  const holidayDates = [];
  const rhDates = [];
  const holidayDateKeys = [];
  let checkDate = new Date(startDate + 'T00:00:00');
  checkDate.setDate(checkDate.getDate() - 1);

  while (checkDate >= new Date('2000-01-01')) {
    const dateKey = checkDate.toISOString().slice(0, 10);
    const holidayRows = await client.query(
      `SELECT type, title FROM holidayrhs WHERE start = $1 AND LOWER(TRIM(type)) IN ('holiday', 'rh')`,
      [dateKey]
    );
    if (holidayRows.rows.length > 0) {
      for (const h of holidayRows.rows) {
        if (String(h.type).trim().toLowerCase() === 'holiday') {
          holidayDates.push(dateKey);
          holidayDateKeys.push(dateKey);
        } else {
          rhDates.push(dateKey);
        }
      }
      checkDate.setDate(checkDate.getDate() - 1);
      continue;
    }

    const dow = checkDate.getDay();
    if (dow === 0) {
      holidayDates.push(dateKey);
      holidayDateKeys.push(dateKey);
      checkDate.setDate(checkDate.getDate() - 1);
      continue;
    }

    if (isFirstOrThirdSaturday(dateKey)) {
      holidayDates.push(dateKey);
      holidayDateKeys.push(dateKey);
      checkDate.setDate(checkDate.getDate() - 1);
      continue;
    }

    const prevLeave = await findPreviousLeaveBefore(client, staffId, dateKey);
    if (prevLeave) {
      if (String(prevLeave.shortname).toUpperCase() === 'RH') {
        rhDates.push(dateKey);
        checkDate.setDate(checkDate.getDate() - 1);
        continue;
      }

      if (String(prevLeave.shortname).toUpperCase() !== 'EL' && String(prevLeave.shortname).toUpperCase() !== 'LWP') {
        if (holidayDates.length > 0 && clNormalized !== 'afternoon') {
          if (rhDates.length + holidayDates.length + noOfDays > 5 && prevLeave.no_of_days + noOfDays + holidayDates.length > 5) {
            return { valid: false, message: 'Combined leave with holidays exceeds 5 days limit' };
          }
        }

        if (prevLeave.leave_id !== leaveId) {
          const allowed = await client.query(
            `SELECT 1 FROM combine_leaves WHERE leave_id = $1 AND combined_id = $2 AND LOWER(TRIM(COALESCE(status, ''))) = 'active'`,
            [leaveId, prevLeave.leave_id]
          );
          if (allowed.rows.length === 0) {
            return { valid: false, message: 'This leave cannot be combined with the previous leave type' };
          }
        }
      }
    }
    break;
  }

  checkDate = new Date(endDate + 'T00:00:00');
  checkDate.setDate(checkDate.getDate() + 1);
  let rhFoundPost = false;

  while (checkDate <= new Date('2099-12-31')) {
    const dateKey = checkDate.toISOString().slice(0, 10);
    const holidayRows = await client.query(
      `SELECT type, title FROM holidayrhs WHERE start = $1 AND LOWER(TRIM(type)) IN ('holiday', 'rh')`,
      [dateKey]
    );

    if (holidayRows.rows.length > 0) {
      for (const h of holidayRows.rows) {
        if (String(h.type).trim().toLowerCase() === 'holiday') {
          holidayDateKeys.push(dateKey);
        } else {
          rhDates.push(dateKey);
          if (clNormalized === 'afternoon') rhFoundPost = true;
        }
      }
      checkDate.setDate(checkDate.getDate() + 1);
      continue;
    }

    if (isFirstOrThirdSaturday(dateKey)) {
      holidayDateKeys.push(dateKey);
      checkDate.setDate(checkDate.getDate() + 1);
      continue;
    }

    const dow = checkDate.getDay();
    if (dow === 0) {
      holidayDateKeys.push(dateKey);
      checkDate.setDate(checkDate.getDate() + 1);
      continue;
    }

    const nextLeave = await findNextLeaveAfter(client, staffId, dateKey);
    if (nextLeave) {
      if (String(nextLeave.shortname).toUpperCase() === 'RH') {
        if (clNormalized === 'afternoon') rhFoundPost = true;
        checkDate.setDate(checkDate.getDate() + 1);
        continue;
      }

      if (clNormalized === 'afternoon' && rhFoundPost) {
        return { valid: false, message: 'Cannot apply afternoon leave as there is a regular leave after the RH/holiday chain' };
      }

      if (String(nextLeave.shortname).toUpperCase() !== 'EL' && String(nextLeave.shortname).toUpperCase() !== 'LWP') {
        if (holidayDateKeys.length + noOfDays > 5 && nextLeave.no_of_days + noOfDays + holidayDateKeys.length > 5) {
          return { valid: false, message: 'Combined leave with holidays exceeds 5 days limit' };
        }
      }

      if (nextLeave.leave_id !== leaveId) {
        const allowed = await client.query(
          `SELECT 1 FROM combine_leaves WHERE leave_id = $1 AND combined_id = $2 AND LOWER(TRIM(COALESCE(status, ''))) = 'active'`,
          [leaveId, nextLeave.leave_id]
        );
        if (allowed.rows.length === 0 && clNormalized !== 'morning') {
          return { valid: false, message: 'This leave cannot be combined with the next leave type' };
        }
      }
    }
    break;
  }

  return { valid: true };
}

async function insertDaywiseLeaves(client, applicationId, startDate, endDate, leaveId) {
  const periodStart = new Date(startDate + 'T00:00:00');
  const periodEnd = new Date(endDate + 'T00:00:00');

  const cursor = new Date(periodStart);
  while (cursor <= periodEnd) {
    const dateStr = cursor.toISOString().slice(0, 10);
    await client.query(
      `INSERT INTO daywise__leaves (leave_staff_applications_id, leave_id, start, created_at, updated_at) VALUES ($1, $2, $3::date, NOW(), NOW())`,
      [applicationId, leaveId, dateStr]
    );
    cursor.setDate(cursor.getDate() + 1);
  }
}

async function deleteDaywiseLeaves(client, applicationId) {
  await client.query(
    `DELETE FROM daywise__leaves WHERE leave_staff_applications_id = $1`,
    [applicationId]
  );
}

async function getRoutingInfoForLeave(staffId) {
  const staffResult = await pool.query(
    `SELECT s.id, s.user_id, s.fname, s.mname, s.lname FROM staff s WHERE s.id = $1 LIMIT 1`,
    [staffId]
  );
  const staff = staffResult.rows[0];
  if (!staff) return null;

  const empTypeResult = await pool.query(
    `SELECT employee_type FROM employee_types WHERE staff_id = $1 AND LOWER(TRIM(COALESCE(status, ''))) = 'active' ORDER BY id DESC LIMIT 1`,
    [staffId]
  );
  const employeeType = empTypeResult.rows[0]?.employee_type || null;

  const designationResult = await pool.query(
    `
    SELECT d.design_name, d.isadditional, d.isvacational
    FROM designation_staff ds
    JOIN designations d ON d.id = ds.designation_id
    WHERE ds.staff_id = $1 AND LOWER(TRIM(COALESCE(ds.status, ''))) = 'active'
    ORDER BY ds.id DESC
    `,
    [staffId]
  );
  const designations = designationResult.rows;

  const hasAdditionalNonVacational = designations.some(
    (d) => Number(d.isadditional) === 1 && String(d.isvacational || '').trim().toLowerCase().includes('non')
  );

  const assocResult = await pool.query(
    `
    SELECT LOWER(a.asso_name) AS asso_name
    FROM association_staff ast
    JOIN associations a ON a.id = ast.association_id
    WHERE ast.staff_id = $1 AND LOWER(TRIM(COALESCE(ast.status, ''))) = 'active'
    ORDER BY ast.id DESC LIMIT 1
    `,
    [staffId]
  );
  const associationName = assocResult.rows[0]?.asso_name || '';

  const isTeachingConfirmed = employeeType === 'Teaching' && (
    associationName.includes('confirmed') || associationName.includes('promotional probationary')
  );

  let vacationType = 'vacational';
  if (employeeType === 'Non-Teaching' || employeeType === 'non-teaching') {
    vacationType = 'non-vacational';
  } else if (hasAdditionalNonVacational) {
    vacationType = 'non-vacational';
  } else if (associationName.includes('contractual') || associationName.includes('temporary (non teaching)') || associationName.includes('temporary non teaching')) {
    vacationType = 'non-vacational';
  } else if (isTeachingConfirmed) {
    vacationType = 'vacational';
  }

  const isNonVacational = vacationType === 'non-vacational';
  const needsHodRouting = isNonVacational;

  const hodResult = await pool.query(
    `
    SELECT u.id AS user_id, u.role
    FROM designation_staff ds
    JOIN designations d ON d.id = ds.designation_id
    JOIN staff s ON s.id = ds.staff_id
    JOIN users u ON u.id = s.user_id
    WHERE ds.dept_id = (
      SELECT ds2.department_id
      FROM department_staff ds2
      WHERE ds2.staff_id = $1 AND LOWER(TRIM(COALESCE(ds2.status, ''))) = 'active'
      ORDER BY ds2.id DESC LIMIT 1
    )
    AND LOWER(TRIM(COALESCE(ds.status, ''))) = 'active'
    AND LOWER(TRIM(COALESCE(d.design_name, ''))) IN ('hod', 'registrar', 'controller of examination', 'dean mba', 'placement officer', 'vehicle maintenance in charge', 'it cell incharge')
    ORDER BY ds.id DESC LIMIT 1
    `,
    [staffId]
  );

  let hodUserId = hodResult.rows[0]?.user_id || null;
  let hodRole = hodResult.rows[0]?.role || null;

  if (!hodUserId) {
    const deanAdminResult = await pool.query(
      `SELECT id AS user_id, role FROM users WHERE LOWER(TRIM(role)) = 'dean_admin' LIMIT 1`
    );
    hodUserId = deanAdminResult.rows[0]?.user_id || null;
    hodRole = deanAdminResult.rows[0]?.role || null;
  }

  const deanAdminResult = await pool.query(
    `SELECT id AS user_id FROM users WHERE LOWER(TRIM(role)) = 'dean_admin' LIMIT 1`
  );
  const deanAdminUserId = deanAdminResult.rows[0]?.user_id || null;

  const principalResult = await pool.query(
    `SELECT id AS user_id FROM users WHERE LOWER(TRIM(role)) = 'principal' LIMIT 1`
  );
  const principalUserId = principalResult.rows[0]?.user_id || null;

  let recommenderUserId = hodUserId;
  let approverUserId = deanAdminUserId;

  if (needsHodRouting || hasAdditionalNonVacational) {
    recommenderUserId = hodUserId;
    approverUserId = hodUserId;
  } else if (hodRole === 'registrar' || hodRole === 'office') {
    recommenderUserId = hodUserId;
    approverUserId = deanAdminUserId;
  } else {
    recommenderUserId = hodUserId;
    approverUserId = deanAdminUserId;
  }

  return {
    staff,
    employeeType,
    designations,
    vacationType,
    isNonVacational,
    needsHodRouting,
    hodUserId,
    hodRole,
    deanAdminUserId,
    principalUserId,
    recommenderUserId,
    approverUserId,
    associationName,
  }
}

async function createLeaveApplication(payload) {
  const staffId = await resolveStaffIdFromUserId(payload.staffId);
  if (!staffId) {
    const err = new Error('Staff record not found for this user');
    err.statusCode = 404;
    throw err;
  }

  const year = Number(String(payload.endDate || payload.startDate || '').slice(0, 4));

  const routing = await getRoutingInfoForLeave(staffId);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const validation = await validateLeaveRules(client, staffId, payload.leaveId, payload.startDate, payload.endDate, payload.noOfDays, payload.clType, null);
    if (!validation.valid) {
      await client.query('ROLLBACK');
      const err = new Error(validation.message);
      err.statusCode = 409;
      throw err;
    }

    const { rows } = await client.query(
      `
      INSERT INTO leave_staff_applications
        (staff_id, leave_id, start, "end", no_of_days, reason, cl_type,
         alternate, additional_alternate, appl_status, leave_status, year,
         recommender, approver, created_at, updated_at)
      VALUES
        ($1, $2, $3::date, $4::date, $5, $6, $7, $8, $9, 'pending', 'awaiting', $10, $11, $12, NOW(), NOW())
      RETURNING id
      `,
      [
        staffId,
        payload.leaveId,
        payload.startDate,
        payload.endDate,
        payload.noOfDays,
        payload.reason,
        payload.clType || 'Full',
        payload.alternate || null,
        payload.additionalAlternate || null,
        year,
        routing?.recommenderUserId || null,
        routing?.approverUserId || null,
      ]
    );

    const applicationId = rows[0]?.id;
    if (!applicationId) {
      await client.query('ROLLBACK');
      throw new Error('Failed to create leave application');
    }

    await insertDaywiseLeaves(client, applicationId, payload.startDate, payload.endDate, payload.leaveId);

    const fromYear = new Date(payload.startDate + 'T00:00:00').getFullYear();
    const toYear = new Date(payload.endDate + 'T00:00:00').getFullYear();
    if (fromYear !== toYear) {
      const endOfYear = new Date(fromYear, 11, 31);
      const noOfDays1 = Math.floor((endOfYear - new Date(payload.startDate + 'T00:00:00')) / 86400000) + 1;

      const fromEntitlement = await client.query(
        `SELECT id, consumed_curr_year, entitled_curr_year, accumulated FROM leave_staff_entitlements WHERE staff_id = $1 AND leave_id = $2 AND year = $3 ORDER BY id DESC LIMIT 1`,
        [staffId, payload.leaveId, fromYear]
      );

      if (fromEntitlement.rows.length > 0) {
        const ent = fromEntitlement.rows[0];
        await client.query(
          `UPDATE leave_staff_entitlements SET consumed_curr_year = $1, updated_at = NOW() WHERE id = $2`,
          [Number(ent.consumed_curr_year) + noOfDays1, ent.id]
        );
      } else {
        await client.query(
          `INSERT INTO leave_staff_entitlements (year, staff_id, leave_id, entitled_curr_year, accumulated, consumed_curr_year, encashed_curr_year, total_encashed, wef, status, created_at, updated_at) VALUES ($1, $2, $3, 0, 0, $4, 0, 0, $5, 'active', NOW(), NOW())`,
          [fromYear, staffId, payload.leaveId, noOfDays1, `${fromYear}-01-01`]
        );
      }

      const startOfYear = new Date(toYear, 0, 1);
      const noOfDays2 = Math.floor((new Date(payload.endDate + 'T00:00:00') - startOfYear) / 86400000) + 1;

      const toEntitlement = await client.query(
        `SELECT id, consumed_curr_year, entitled_curr_year, accumulated FROM leave_staff_entitlements WHERE staff_id = $1 AND leave_id = $2 AND year = $3 ORDER BY id DESC LIMIT 1`,
        [staffId, payload.leaveId, toYear]
      );

      if (toEntitlement.rows.length > 0) {
        const ent = toEntitlement.rows[0];
        await client.query(
          `UPDATE leave_staff_entitlements SET consumed_curr_year = $1, updated_at = NOW() WHERE id = $2`,
          [Number(ent.consumed_curr_year) + noOfDays2, ent.id]
        );
      } else {
        await client.query(
          `INSERT INTO leave_staff_entitlements (year, staff_id, leave_id, entitled_curr_year, accumulated, consumed_curr_year, encashed_curr_year, total_encashed, wef, status, created_at, updated_at) VALUES ($1, $2, $3, 0, 0, $4, 0, 0, $5, 'active', NOW(), NOW())`,
          [toYear, staffId, payload.leaveId, noOfDays2, `${toYear}-01-01`]
        );
      }
    } else {
      await syncConsumedEntitlement(client, staffId, payload.leaveId, year);
    }

    await insertNotificationsForApplication(client, applicationId, staffId, payload.alternate, payload.additionalAlternate, payload.startDate, payload.endDate, routing);

    await client.query('COMMIT');
    return { id: applicationId };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function updateLeaveApplication(applicationId, payload) {
  const id = Number(applicationId);
  if (!id) return null;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const beforeResult = await client.query(
      `
      SELECT staff_id, leave_id, EXTRACT(YEAR FROM start::date)::int AS start_year, EXTRACT(YEAR FROM "end"::date)::int AS end_year, alternate, additional_alternate
      FROM leave_staff_applications
      WHERE id = $1
      LIMIT 1
      `,
      [id]
    );
    const before = beforeResult.rows[0] || null;
    if (!before) {
      await client.query('ROLLBACK');
      return null;
    }

    const newStartYear = new Date(payload.startDate + 'T00:00:00').getFullYear();
    const newEndYear = new Date(payload.endDate + 'T00:00:00').getFullYear();

    const validation = await validateLeaveRules(client, Number(before.staff_id), payload.leaveId, payload.startDate, payload.endDate, payload.noOfDays, payload.clType, id);
    if (!validation.valid) {
      await client.query('ROLLBACK');
      const err = new Error(validation.message);
      err.statusCode = 409;
      throw err;
    }

    const { rows } = await client.query(
      `
      UPDATE leave_staff_applications
      SET leave_id = $1,
        start = $2::date,
        "end" = $3::date,
          no_of_days = $4,
          reason = $5,
          cl_type = $6,
          alternate = $7,
          additional_alternate = $8,
          year = $9,
          updated_at = NOW()
      WHERE id = $10
      RETURNING id, staff_id, leave_id, EXTRACT(YEAR FROM "end"::date)::int AS year
      `,
      [
        payload.leaveId,
        payload.startDate,
        payload.endDate,
        payload.noOfDays,
        payload.reason,
        payload.clType || 'Full',
        payload.alternate || null,
        payload.additionalAlternate || null,
        Number(String(payload.endDate || payload.startDate || '').slice(0, 4)),
        id,
      ]
    );

    const updated = rows[0] || null;
    if (!updated) {
      await client.query('ROLLBACK');
      return null;
    }

    await deleteDaywiseLeaves(client, id);
    await insertDaywiseLeaves(client, id, payload.startDate, payload.endDate, payload.leaveId);

    const yearsToSync = new Set([
      Number(before.start_year),
      Number(before.end_year),
      Number(updated.year),
      newStartYear,
      newEndYear,
    ].filter((y) => Number.isFinite(y) && y > 0));

    for (const y of yearsToSync) {
      await syncConsumedEntitlement(client, Number(before.staff_id), Number(before.leave_id), y);
    }

    const routing = await getRoutingInfoForLeave(Number(updated.staff_id));
    await updateNotificationsForUpdate(client, id, Number(before.staff_id), payload.startDate, payload.endDate, payload.alternate, payload.additionalAlternate, routing);

    await client.query('COMMIT');
    return { id: updated.id };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function cancelLeaveApplication(applicationId) {
  const id = Number(applicationId);
  if (!id) return null;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const beforeResult = await client.query(
      `
      SELECT staff_id, leave_id, EXTRACT(YEAR FROM start::date)::int AS start_year, EXTRACT(YEAR FROM "end"::date)::int AS end_year, TO_CHAR(start::date, 'YYYY-MM-DD') AS start_date, TO_CHAR("end"::date, 'YYYY-MM-DD') AS end_date, alternate, additional_alternate
      FROM leave_staff_applications
      WHERE id = $1
      LIMIT 1
      `,
      [id]
    );
    const before = beforeResult.rows[0] || null;
    if (!before) {
      await client.query('ROLLBACK');
      return null;
    }

    const { rows } = await client.query(
      `
      UPDATE leave_staff_applications
      SET appl_status = 'cancelled', updated_at = NOW()
      WHERE id = $1
      RETURNING id
      `,
      [id]
    );

    const yearsToSync = new Set([
      Number(before.start_year),
      Number(before.end_year),
    ].filter((y) => Number.isFinite(y) && y > 0));

    for (const y of yearsToSync) {
      await syncConsumedEntitlement(client, Number(before.staff_id), Number(before.leave_id), y);
    }

    // send notifications about cancellation (requester + alternates)
    try {
      const staffRes = await client.query('SELECT user_id, fname, mname, lname FROM staff WHERE id = $1 LIMIT 1', [before.staff_id]);
      const staffRow = staffRes.rows[0] || null;
      const requesterUserId = staffRow ? staffRow.user_id : null;
      const fullName = staffRow ? [staffRow.fname, staffRow.mname, staffRow.lname].filter(Boolean).join(' ') : 'Staff';

      if (requesterUserId) {
        await insertNotificationWithClient(client, requesterUserId, 'Leave Application', 'Leave', 'Leave application cancelled.');
      }

      const period = before && before.start_date && before.end_date ? `${before.start_date} to ${before.end_date}` : '';
      if (before.alternate) {
        const altRes = await client.query('SELECT user_id FROM staff WHERE id = $1 LIMIT 1', [before.alternate]);
        const altUserId = altRes.rows[0]?.user_id || null;
        if (altUserId) {
          const desc = period
            ? `Leave application for ${fullName} (${period}) has been cancelled.`
            : `Leave application for ${fullName} has been cancelled.`;
          await insertNotificationWithClient(client, altUserId, 'Leave Assignment', 'Leave', desc);
        }
      }

      if (before.additional_alternate) {
        const addRes = await client.query('SELECT user_id FROM staff WHERE id = $1 LIMIT 1', [before.additional_alternate]);
        const addUserId = addRes.rows[0]?.user_id || null;
        if (addUserId) {
          const desc = period
            ? `Leave application for ${fullName} (${period}) has been cancelled.`
            : `Leave application for ${fullName} has been cancelled.`;
          await insertNotificationWithClient(client, addUserId, 'Leave Assignment', 'Leave', desc);
        }
      }
    } catch (nfErr) {
      // ignore notification errors
    }
    await client.query('COMMIT');

    return rows[0] || null;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function syncConsumedEntitlement(client, staffId, leaveId, year) {
  const numericStaffId = Number(staffId);
  const numericLeaveId = Number(leaveId);
  const numericYear = Number(year);
  if (!numericStaffId || !numericLeaveId || !numericYear) return;

  const sumResult = await client.query(
    `
      SELECT COALESCE(SUM(no_of_days), 0) AS consumed
      FROM leave_staff_applications
      WHERE staff_id = $1
        AND leave_id = $2
        AND year = $3
        AND LOWER(COALESCE(appl_status, 'pending')) NOT IN ('rejected', 'cancelled')
    `,
    [numericStaffId, numericLeaveId, numericYear]
  );

  const consumed = Number(sumResult.rows[0]?.consumed || 0);

  const entitlement = await client.query(
    `
      SELECT id
      FROM leave_staff_entitlements
      WHERE staff_id = $1
        AND leave_id = $2
        AND year = $3
      ORDER BY id DESC
      LIMIT 1
    `,
    [numericStaffId, numericLeaveId, numericYear]
  );

  if (entitlement.rows.length > 0) {
    await client.query(
      `
        UPDATE leave_staff_entitlements
        SET consumed_curr_year = $1,
            status = 'active',
            updated_at = NOW()
        WHERE id = $2
      `,
      [consumed, entitlement.rows[0].id]
    );
    return;
  }

  await client.query(
    `
      INSERT INTO leave_staff_entitlements
        (year, staff_id, leave_id, entitled_curr_year, accumulated, consumed_curr_year, encashed_curr_year, total_encashed, wef, status, created_at, updated_at)
      VALUES
        ($1, $2, $3, 0, 0, $4, 0, 0, $5, 'active', NOW(), NOW())
    `,
    [numericYear, numericStaffId, numericLeaveId, consumed, `${numericYear}-01-01`]
  );
}

async function getActiveAdditionalDesignationIdsForStaff(staffId) {
  const { rows } = await pool.query(
    `
      SELECT ds.designation_id
      FROM designation_staff ds
      JOIN designations d ON d.id = ds.designation_id
      WHERE ds.staff_id = $1
        AND LOWER(COALESCE(ds.status, 'active')) = 'active'
        AND d.isadditional = 1
    `,
    [staffId]
  );
  return rows.map((row) => Number(row.designation_id)).filter(Boolean);
}

async function getAlternateStaffOptions(userId, employeeTypeHint = null) {
  const requesterStaffId = await resolveStaffIdFromUserId(userId);
  if (!requesterStaffId) return [];

  const requesterDepartmentIds = await getActiveDepartmentIdsForStaff(requesterStaffId);
  if (!requesterDepartmentIds.length) return [];

  // Resolve employee type from DB; fall back to the hint provided by the client
  // (which is derived from the user's role when no DB record exists).
  const dbEmployeeType = await getActiveEmployeeTypeForStaff(requesterStaffId);
  const requesterEmployeeType = dbEmployeeType
    || (employeeTypeHint ? employeeTypeHint.toLowerCase() : null);

  const conditions = [
    's.id <> $1',
    "LOWER(COALESCE(ds.status, 'active')) = 'active'",
    'ds.department_id = ANY($2::bigint[])',
  ];
  const values = [requesterStaffId, requesterDepartmentIds];

  if (requesterEmployeeType) {
    conditions.push(`LOWER(TRIM(COALESCE(et.employee_type, ''))) = LOWER(TRIM($${values.length + 1}))`);
    values.push(requesterEmployeeType);
  }

  const lateralEt = `
    LEFT JOIN LATERAL (
      SELECT et1.employee_type
      FROM employee_types et1
      WHERE et1.staff_id = s.id
        AND LOWER(COALESCE(et1.status, 'active')) = 'active'
      ORDER BY et1.id DESC
      LIMIT 1
    ) et ON true`;

  const { rows: deptRows } = await pool.query(
    `
      SELECT
        s.id,
        s.user_id,
        s.fname,
        s.mname,
        s.lname,
        COALESCE(et.employee_type, '') AS employee_type,
        ARRAY_AGG(DISTINCT ds.department_id) FILTER (WHERE ds.department_id IS NOT NULL) AS department_ids,
        MIN(d.dept_name) AS department_name,
        MIN(d.dept_name) AS group_label
      FROM staff s
      JOIN department_staff ds ON ds.staff_id = s.id
      LEFT JOIN departments d ON d.id = ds.department_id
      ${lateralEt}
      WHERE ${conditions.join(' AND ')}
      GROUP BY s.id, s.user_id, s.fname, s.mname, s.lname, et.employee_type
      ORDER BY MIN(d.dept_name) ASC NULLS LAST, s.fname ASC, s.mname ASC, s.lname ASC, s.id ASC
    `,
    values
  );

  // ── additional designation peers (e.g. Principal, Dean) ─────────────────
  // If the requester holds an additional designation, also include other staff
  // who hold the same additional designation(s), regardless of department.
  const additionalDesignationIds = await getActiveAdditionalDesignationIdsForStaff(requesterStaffId);

  let designationRows = [];
  if (additionalDesignationIds.length) {
    const { rows } = await pool.query(
      `
        SELECT
          s.id,
          s.user_id,
          s.fname,
          s.mname,
          s.lname,
          COALESCE(et.employee_type, '') AS employee_type,
          ARRAY_AGG(DISTINCT ds_dept.department_id) FILTER (WHERE ds_dept.department_id IS NOT NULL) AS department_ids,
          MIN(d_dept.dept_name) AS department_name,
          dsgn.design_name AS group_label
        FROM staff s
        JOIN designation_staff dsgn_s ON dsgn_s.staff_id = s.id
        JOIN designations dsgn ON dsgn.id = dsgn_s.designation_id
        LEFT JOIN department_staff ds_dept ON ds_dept.staff_id = s.id
          AND LOWER(COALESCE(ds_dept.status, 'active')) = 'active'
        LEFT JOIN departments d_dept ON d_dept.id = ds_dept.department_id
        ${lateralEt}
        WHERE s.id <> $1
          AND dsgn_s.designation_id = ANY($2::bigint[])
          AND LOWER(COALESCE(dsgn_s.status, 'active')) = 'active'
          AND dsgn.isadditional = 1
        GROUP BY s.id, s.user_id, s.fname, s.mname, s.lname, et.employee_type, dsgn.design_name
        ORDER BY dsgn.design_name ASC, s.fname ASC, s.mname ASC, s.lname ASC, s.id ASC
      `,
      [requesterStaffId, additionalDesignationIds]
    );
    designationRows = rows;
  }

  // Merge: dept staff first, then designation peers override if the same staff
  // already appears (so they show under their designation group, not dept group).
  // The `is_designation_peer` flag tells the client to skip dept/type filters.
  const merged = new Map();
  for (const row of deptRows) {
    merged.set(row.id, { ...row, is_designation_peer: false });
  }
  for (const row of designationRows) {
    merged.set(row.id, { ...row, is_designation_peer: true });
  }

  return Array.from(merged.values());
}

async function resolveUserIdFromStaffId(staffId) {
  const id = Number(staffId);
  if (!id) return null;
  const { rows } = await pool.query('SELECT user_id FROM staff WHERE id = $1 LIMIT 1', [id]);
  return rows[0]?.user_id || null;
}

async function insertNotificationWithClient(client, userId, title, type, description, date = null) {
  if (!userId) return;
  const notifDate = date ? date : new Date().toISOString().slice(0, 10);
  await client.query(
    `INSERT INTO notifications (user_id, notification_title, notification_type, date, description, created_at, updated_at)
     VALUES ($1, $2, $3, $4::date, $5, NOW(), NOW())`,
    [userId, title, type, notifDate, description]
  );
}

async function insertNotificationsForApplication(client, applicationId, staffId, alternateId, additionalAlternateId, startDate, endDate, routing) {
  const staffRes = await client.query('SELECT user_id, fname, mname, lname FROM staff WHERE id = $1 LIMIT 1', [staffId]);
  const staffRow = staffRes.rows[0] || null;
  const requesterUserId = staffRow ? staffRow.user_id : null;
  const fullName = staffRow ? [staffRow.fname, staffRow.mname, staffRow.lname].filter(Boolean).join(' ') : 'Staff';

  const period = startDate && endDate ? `${startDate} to ${endDate}` : '';

  if (requesterUserId) {
    await insertNotificationWithClient(client, requesterUserId, 'Leave Application', 'Leave', 'A leave application has been submitted successfully.');
  }

  if (routing?.recommenderUserId && Number(routing.recommenderUserId) !== Number(requesterUserId)) {
    await insertNotificationWithClient(
      client,
      routing.recommenderUserId,
      'Leave Application',
      'Leave',
      `A leave application has been submitted by ${fullName} for your Recommendation.`
    );
  }

  if (alternateId) {
    const altRes = await client.query('SELECT user_id FROM staff WHERE id = $1 LIMIT 1', [alternateId]);
    const altUserId = altRes.rows[0]?.user_id || null;
    if (altUserId) {
      const desc = period
        ? `You have been assigned as an alternate for a leave application submitted by ${fullName} (${period}).`
        : `You have been assigned as an alternate for a leave application submitted by ${fullName}.`;
      await insertNotificationWithClient(client, altUserId, 'Leave Assignment', 'Leave', desc);
    }
  }

  if (additionalAlternateId) {
    const addRes = await client.query('SELECT user_id FROM staff WHERE id = $1 LIMIT 1', [additionalAlternateId]);
    const addUserId = addRes.rows[0]?.user_id || null;
    if (addUserId) {
      const desc = period
        ? `You have been assigned as an additional alternate for a leave application submitted by ${fullName} (${period}).`
        : `You have been assigned as an additional alternate for a leave application submitted by ${fullName}.`;
      await insertNotificationWithClient(client, addUserId, 'Leave Assignment', 'Leave', desc);
    }
  }
}

async function updateNotificationsForUpdate(client, applicationId, staffId, startDate, endDate, alternateId, additionalAlternateId, routing) {
  const staffRes = await client.query('SELECT user_id, fname, mname, lname FROM staff WHERE id = $1 LIMIT 1', [staffId]);
  const staffRow = staffRes.rows[0] || null;
  const requesterUserId = staffRow ? staffRow.user_id : null;
  const fullName = staffRow ? [staffRow.fname, staffRow.mname, staffRow.lname].filter(Boolean).join(' ') : 'Staff';

  const period = startDate && endDate ? `${startDate} to ${endDate}` : '';

  if (requesterUserId) {
    await insertNotificationWithClient(client, requesterUserId, 'Leave Application', 'Leave', 'Leave application updated successfully.');
  }

  const appRes = await client.query('SELECT alternate, additional_alternate FROM leave_staff_applications WHERE id = $1 LIMIT 1', [applicationId]);
  const appRow = appRes.rows[0] || null;
  const currentAlternate = appRow?.alternate || alternateId;
  const currentAdditionalAlternate = appRow?.additional_alternate || additionalAlternateId;

  if (currentAlternate) {
    const altRes = await client.query('SELECT user_id FROM staff WHERE id = $1 LIMIT 1', [currentAlternate]);
    const altUserId = altRes.rows[0]?.user_id || null;
    if (altUserId) {
      const desc = period
        ? `Leave application for ${fullName} (${period}) has been updated.`
        : `Leave application for ${fullName} has been updated.`;
      await insertNotificationWithClient(client, altUserId, 'Leave Assignment', 'Leave', desc);
    }
  }

  if (currentAdditionalAlternate) {
    const addRes = await client.query('SELECT user_id FROM staff WHERE id = $1 LIMIT 1', [currentAdditionalAlternate]);
    const addUserId = addRes.rows[0]?.user_id || null;
    if (addUserId) {
      const desc = period
        ? `Leave application for ${fullName} (${period}) has been updated.`
        : `Leave application for ${fullName} has been updated.`;
      await insertNotificationWithClient(client, addUserId, 'Leave Assignment', 'Leave', desc);
    }
  }
}

module.exports = {
  resolveStaffIdFromUserId,
  getMeta,
  getCalendarEvents,
  getApplicationsByStaffUserId,
  getLeaveApplicationById,
  validateLeaveApplication,
  createLeaveApplication,
  updateLeaveApplication,
  cancelLeaveApplication,
  getAlternateStaffOptions,
  normalizeStatus,
  getLeaveRules,
  getLeaveById,
  getCombineLeaves,
  getRoutingInfoForLeave,
  insertDaywiseLeaves,
  deleteDaywiseLeaves,
  syncConsumedEntitlement,
  getActiveDepartmentIdsForStaff,
  getActiveEmployeeTypeForStaff,
  getActiveAdditionalDesignationIdsForStaff,
  resolveUserIdFromStaffId,
  insertNotificationWithClient,
};
