const { pool } = require('../config/db');
const LeaveRules = require('../services/leaveRules.service');

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

// Full Laravel validation (validateleave + the staff form checks). Establishment
// applies on behalf of staff without validation, exactly like LeaveController::ESTB_Leave_store.
async function runValidation(db, staffId, payload, { applicationId = null, isEstablishment = false, isNew = true } = {}) {
  if (!payload.alternate) {
    return { valid: false, message: 'You have not selected the leave type or Alternate arrangement.' };
  }
  if (isEstablishment) return { valid: true };

  const requestCheck = await LeaveRules.validateStaffRequest(db, {
    staffId,
    leaveId: payload.leaveId,
    startDate: payload.startDate,
    endDate: payload.endDate,
    clType: payload.clType,
    alternate: payload.alternate,
    isNew,
  });
  if (!requestCheck.valid) return requestCheck;

  return LeaveRules.validateLeave(db, {
    staffId,
    leaveId: payload.leaveId,
    startDate: payload.startDate,
    endDate: payload.endDate,
    noOfDays: payload.noOfDays,
    clType: payload.clType,
    applicationId,
  });
}

function validationError(message) {
  const err = new Error(message);
  err.statusCode = 409;
  return err;
}

async function validateLeaveApplication(payload, { applicationId = null, isEstablishment = false } = {}) {
  const staffId = await resolveStaffIdFromUserId(payload.staffId);
  if (!staffId) {
    return { valid: false, message: 'Staff record not found for this user' };
  }
  return runValidation(pool, staffId, payload, {
    applicationId,
    isEstablishment,
    isNew: !applicationId,
  });
}

async function getEligibleLeaveTypesForUser(userId) {
  const staffId = await resolveStaffIdFromUserId(userId);
  if (!staffId) return { vacation_type: null, leave_types: [] };
  const { profile, leaveTypes } = await LeaveRules.getEligibleLeaveTypes(staffId);
  return {
    staff_id: staffId,
    employee_type: profile.employeeType,
    vacation_type: profile.vacationType,
    earliest_applicable_date: LeaveRules.earliestApplicableDate(),
    leave_types: leaveTypes,
  };
}

async function insertDaywiseLeaves(client, applicationId, startDate, endDate, leaveId) {
  const start = LeaveRules.toDateKey(startDate);
  const end = LeaveRules.toDateKey(endDate);
  for (let day = start; day <= end; day = LeaveRules.addDays(day, 1)) {
    await client.query(
      `INSERT INTO daywise__leaves (leave_staff_applications_id, leave_id, start, created_at, updated_at) VALUES ($1, $2, $3::date, NOW(), NOW())`,
      [applicationId, leaveId, day]
    );
  }
}

async function deleteDaywiseLeaves(client, applicationId) {
  await client.query(
    `DELETE FROM daywise__leaves WHERE leave_staff_applications_id = $1`,
    [applicationId]
  );
}

async function createLeaveApplication(payload, { isEstablishment = false } = {}) {
  const staffId = await resolveStaffIdFromUserId(payload.staffId);
  if (!staffId) {
    const err = new Error('Staff record not found for this user');
    err.statusCode = 404;
    throw err;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const validation = await runValidation(client, staffId, payload, { isEstablishment, isNew: true });
    if (!validation.valid) throw validationError(validation.message);

    const routing = await LeaveRules.resolveRouting(staffId, payload.noOfDays, client, { isEstablishment });

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
        payload.alternate,
        payload.additionalAlternate || null,
        Number(String(payload.endDate).slice(0, 4)),
        routing.recommenderUserId,
        routing.approverUserId,
      ]
    );

    const applicationId = rows[0]?.id;
    if (!applicationId) throw new Error('Failed to create leave application');

    await insertDaywiseLeaves(client, applicationId, payload.startDate, payload.endDate, payload.leaveId);
    await LeaveRules.adjustConsumed(client, {
      staffId,
      leaveId: payload.leaveId,
      startDate: payload.startDate,
      endDate: payload.endDate,
      noOfDays: payload.noOfDays,
      sign: 1,
    });

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

async function getApplicationSnapshot(client, applicationId) {
  const { rows } = await client.query(
    `
    SELECT id, staff_id, leave_id, no_of_days, appl_status, alternate, additional_alternate,
           TO_CHAR(start::date, 'YYYY-MM-DD') AS start_date,
           TO_CHAR("end"::date, 'YYYY-MM-DD') AS end_date
    FROM leave_staff_applications
    WHERE id = $1
    LIMIT 1
    FOR UPDATE
    `,
    [applicationId]
  );
  return rows[0] || null;
}

function isCounted(status) {
  return !['rejected', 'cancelled'].includes(normalizeStatus(status));
}

async function updateLeaveApplication(applicationId, payload, { isEstablishment = false } = {}) {
  const id = Number(applicationId);
  if (!id) return null;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const before = await getApplicationSnapshot(client, id);
    if (!before) {
      await client.query('ROLLBACK');
      return null;
    }

    // Staff can edit only while the application is pending (Laravel shows edit for pending only).
    if (!isEstablishment && normalizeStatus(before.appl_status) !== 'pending') {
      throw validationError('Only pending leave applications can be edited.');
    }

    const staffId = Number(before.staff_id);
    const validation = await runValidation(client, staffId, payload, { applicationId: id, isEstablishment, isNew: false });
    if (!validation.valid) throw validationError(validation.message);

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
      RETURNING id, staff_id
      `,
      [
        payload.leaveId,
        payload.startDate,
        payload.endDate,
        payload.noOfDays,
        payload.reason,
        payload.clType || 'Full',
        payload.alternate,
        payload.additionalAlternate || null,
        Number(String(payload.endDate).slice(0, 4)),
        id,
      ]
    );

    if (isCounted(before.appl_status)) {
      await LeaveRules.adjustConsumed(client, {
        staffId,
        leaveId: before.leave_id,
        startDate: before.start_date,
        endDate: before.end_date,
        noOfDays: before.no_of_days,
        sign: -1,
      });
      await LeaveRules.adjustConsumed(client, {
        staffId,
        leaveId: payload.leaveId,
        startDate: payload.startDate,
        endDate: payload.endDate,
        noOfDays: payload.noOfDays,
        sign: 1,
      });
    }

    await deleteDaywiseLeaves(client, id);
    await insertDaywiseLeaves(client, id, payload.startDate, payload.endDate, payload.leaveId);

    await updateNotificationsForUpdate(client, id, staffId, payload.startDate, payload.endDate, payload.alternate, payload.additionalAlternate);

    await client.query('COMMIT');
    return { id: rows[0].id };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function cancelLeaveApplication(applicationId, { isEstablishment = false } = {}) {
  const id = Number(applicationId);
  if (!id) return null;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const before = await getApplicationSnapshot(client, id);
    if (!before) {
      await client.query('ROLLBACK');
      return null;
    }

    const status = normalizeStatus(before.appl_status);
    if (status === 'cancelled') throw validationError('Leave application is already cancelled.');
    // Staff can cancel only while the application is pending (Laravel shows cancel for pending only).
    if (!isEstablishment && status !== 'pending') {
      throw validationError('Only pending leave applications can be cancelled.');
    }

    const { rows } = await client.query(
      `UPDATE leave_staff_applications SET appl_status = 'cancelled', updated_at = NOW() WHERE id = $1 RETURNING id`,
      [id]
    );

    if (isCounted(status)) {
      await LeaveRules.adjustConsumed(client, {
        staffId: before.staff_id,
        leaveId: before.leave_id,
        startDate: before.start_date,
        endDate: before.end_date,
        noOfDays: before.no_of_days,
        sign: -1,
      });
    }

    const staffRes = await client.query('SELECT user_id, fname, mname, lname FROM staff WHERE id = $1 LIMIT 1', [before.staff_id]);
    const staffRow = staffRes.rows[0] || null;
    const fullName = staffRow ? [staffRow.fname, staffRow.mname, staffRow.lname].filter(Boolean).join(' ') : 'Staff';
    const period = `${before.start_date} to ${before.end_date}`;

    if (staffRow?.user_id) {
      await insertNotificationWithClient(client, staffRow.user_id, 'Leave Application', 'Leave', 'Leave application cancelled.');
    }
    for (const alternateId of [before.alternate, before.additional_alternate]) {
      if (!alternateId) continue;
      const altRes = await client.query('SELECT user_id FROM staff WHERE id = $1 LIMIT 1', [alternateId]);
      const altUserId = altRes.rows[0]?.user_id || null;
      if (altUserId) {
        await insertNotificationWithClient(client, altUserId, 'Leave Assignment', 'Leave', `Leave application for ${fullName} (${period}) has been cancelled.`);
      }
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

function groupByDepartment(rows) {
  const groups = new Map();
  for (const row of rows) {
    const key = Number(row.department_id);
    if (!groups.has(key)) {
      groups.set(key, { department_id: key, dept_name: row.dept_name, staff: [] });
    }
    groups.get(key).staff.push({
      id: Number(row.id),
      user_id: row.user_id ? Number(row.user_id) : null,
      name: [row.fname, row.mname, row.lname].filter(Boolean).join(' '),
    });
  }
  return Array.from(groups.values());
}

// Alternate lists exactly as LeaveStaffApplicationsController::index builds them:
//  - alternates: staff of the applicant's active departments with the same employee type
//    (falls back to every department colleague when the first department has none),
//  - additional_alternates: same employee type across the college,
//  - deans: all Deans, offered to applicants holding a Dean/Principal designation.
async function getLeaveAlternateOptions(userId) {
  const staffId = await resolveStaffIdFromUserId(userId);
  if (!staffId) return { alternates: [], additional_alternates: [], deans: [] };

  const [employeeType, departmentIds, profile] = await Promise.all([
    getActiveEmployeeTypeForStaff(staffId),
    getActiveDepartmentIdsForStaff(staffId),
    LeaveRules.getStaffLeaveProfile(staffId),
  ]);

  const staffQuery = (deptFilter, sameType) => pool.query(
    `
      SELECT DISTINCT s.id, s.user_id, s.fname, s.mname, s.lname, d.id AS department_id, d.dept_name
      FROM staff s
      JOIN department_staff ds ON ds.staff_id = s.id AND LOWER(COALESCE(ds.status, 'active')) = 'active'
      JOIN departments d ON d.id = ds.department_id
      WHERE s.id <> $1
        ${deptFilter ? 'AND ds.department_id = ANY($2::bigint[])' : ''}
        ${sameType ? `AND s.id IN (
          SELECT et.staff_id FROM employee_types et
          WHERE LOWER(COALESCE(et.status, 'active')) = 'active'
            AND LOWER(TRIM(et.employee_type)) = LOWER(TRIM($${deptFilter ? 3 : 2}))
        )` : ''}
      ORDER BY d.dept_name ASC, s.fname ASC, s.mname ASC, s.lname ASC
    `,
    [staffId, ...(deptFilter ? [departmentIds] : []), ...(sameType ? [employeeType || ''] : [])]
  );

  let alternates = departmentIds.length ? groupByDepartment((await staffQuery(true, true)).rows) : [];
  const firstDeptHasStaff = alternates.some((g) => g.department_id === departmentIds[0] && g.staff.length > 0);
  if (departmentIds.length && !firstDeptHasStaff) {
    alternates = groupByDepartment((await staffQuery(true, false)).rows);
  }

  const additionalAlternates = groupByDepartment((await staffQuery(false, true)).rows);

  let deans = [];
  if (profile.hasDeanOrPrincipalDesignation) {
    const { rows } = await pool.query(
      `
        SELECT DISTINCT s.id, s.user_id, TRIM(CONCAT_WS(' ', s.fname, s.mname, s.lname)) AS name
        FROM staff s
        JOIN designation_staff ds ON ds.staff_id = s.id AND LOWER(COALESCE(ds.status, 'active')) = 'active'
        JOIN designations d ON d.id = ds.designation_id
        WHERE d.design_name ILIKE '%Dean%'
        ORDER BY name ASC
      `
    );
    deans = rows.map((r) => ({ id: Number(r.id), user_id: r.user_id ? Number(r.user_id) : null, name: r.name }));
  }

  return {
    employee_type: employeeType,
    alternates,
    additional_alternates: additionalAlternates,
    deans,
  };
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
  getLeaveAlternateOptions,
  getEligibleLeaveTypesForUser,
  normalizeStatus,
  insertDaywiseLeaves,
  deleteDaywiseLeaves,
  getActiveDepartmentIdsForStaff,
  getActiveEmployeeTypeForStaff,
  getActiveAdditionalDesignationIdsForStaff,
  resolveUserIdFromStaffId,
  insertNotificationWithClient,
};
