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

async function createLeaveApplication(payload) {
  const staffId = await resolveStaffIdFromUserId(payload.staffId);
  if (!staffId) {
    const err = new Error('Staff record not found for this user');
    err.statusCode = 404;
    throw err;
  }

  const year = Number(String(payload.endDate || payload.startDate || '').slice(0, 4));

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      `
        INSERT INTO leave_staff_applications
          (staff_id, leave_id, start, "end", no_of_days, reason, cl_type,
           alternate, additional_alternate, appl_status, leave_status, year, created_at, updated_at)
        VALUES
          ($1, $2, $3::date, $4::date, $5, $6, $7, $8, $9, 'pending', 'awaiting', $10, NOW(), NOW())
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
      ]
    );

    await syncConsumedEntitlement(client, staffId, payload.leaveId, year);
    await client.query('COMMIT');

    return rows[0] || null;
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
        SELECT staff_id, leave_id, EXTRACT(YEAR FROM start::date)::int AS year
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
        SET leave_id = $1,
          start = $2::date,
          "end" = $3::date,
            no_of_days = $4,
            reason = $5,
            cl_type = $6,
            alternate = $7,
            additional_alternate = $8,
            updated_at = NOW()
        WHERE id = $9
        RETURNING id, staff_id, leave_id, EXTRACT(YEAR FROM start::date)::int AS year
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
        id,
      ]
    );

    const updated = rows[0] || null;
    if (!updated) {
      await client.query('ROLLBACK');
      return null;
    }

    await syncConsumedEntitlement(client, Number(before.staff_id), Number(before.leave_id), Number(before.year));

    const comboChanged =
      Number(before.staff_id) !== Number(updated.staff_id)
      || Number(before.leave_id) !== Number(updated.leave_id)
      || Number(before.year) !== Number(updated.year);

    if (comboChanged) {
      await syncConsumedEntitlement(client, Number(updated.staff_id), Number(updated.leave_id), Number(updated.year));
    }

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
        SELECT staff_id, leave_id, EXTRACT(YEAR FROM start::date)::int AS year
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

    await syncConsumedEntitlement(client, Number(before.staff_id), Number(before.leave_id), Number(before.year));
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
};
