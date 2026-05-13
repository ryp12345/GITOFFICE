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
        la.leave_id,
        l.shortname AS leave_shortname,
        l.longname AS leave_longname,
        la.start AS start_date,
        la.end AS end_date,
        la.no_of_days,
        la.cl_type,
        la.reason,
        la.appl_status AS status,
        la.created_at
      FROM leave_staff_applications la
      LEFT JOIN leaves l ON l.id = la.leave_id
      WHERE LOWER(COALESCE(la.appl_status, 'pending')) <> 'rejected'
        AND la.start <= $2
        AND la.end >= $1
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
        la.start AS start_date,
        la.end AS end_date,
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
        la.start AS start_date,
        la.end AS end_date,
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
      AND start <= $2
      AND "end" >= $3
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

  const year = new Date(payload.endDate || payload.startDate).getFullYear();

  const { rows } = await pool.query(
    `
      INSERT INTO leave_staff_applications
        (staff_id, leave_id, start, "end", no_of_days, reason, cl_type,
         alternate, additional_alternate, appl_status, leave_status, year, created_at, updated_at)
      VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending', 'awaiting', $10, NOW(), NOW())
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

  return rows[0] || null;
}

async function updateLeaveApplication(applicationId, payload) {
  const id = Number(applicationId);
  if (!id) return null;

  const { rows } = await pool.query(
    `
      UPDATE leave_staff_applications
      SET leave_id = $1,
          start = $2,
          "end" = $3,
          no_of_days = $4,
          reason = $5,
          cl_type = $6,
          alternate = $7,
          additional_alternate = $8,
          updated_at = NOW()
      WHERE id = $9
      RETURNING id
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

  return rows[0] || null;
}

async function cancelLeaveApplication(applicationId) {
  const id = Number(applicationId);
  if (!id) return null;

  const { rows } = await pool.query(
    `
      UPDATE leave_staff_applications
      SET appl_status = 'cancelled', updated_at = NOW()
      WHERE id = $1
      RETURNING id
    `,
    [id]
  );

  return rows[0] || null;
}

async function getAlternateStaffOptions(userId) {
  const requesterStaffId = await resolveStaffIdFromUserId(userId);
  if (!requesterStaffId) return [];

  const requesterDepartmentIds = await getActiveDepartmentIdsForStaff(requesterStaffId);
  if (!requesterDepartmentIds.length) return [];

  const requesterEmployeeType = await getActiveEmployeeTypeForStaff(requesterStaffId);

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

  const { rows } = await pool.query(
    `
      SELECT
        s.id,
        s.user_id,
        s.fname,
        s.mname,
        s.lname,
        COALESCE(et.employee_type, '') AS employee_type,
        ARRAY_AGG(DISTINCT ds.department_id) FILTER (WHERE ds.department_id IS NOT NULL) AS department_ids
      FROM staff s
      JOIN department_staff ds ON ds.staff_id = s.id
      LEFT JOIN LATERAL (
        SELECT et1.employee_type
        FROM employee_types et1
        WHERE et1.staff_id = s.id
          AND LOWER(COALESCE(et1.status, 'active')) = 'active'
        ORDER BY et1.id DESC
        LIMIT 1
      ) et ON true
      WHERE ${conditions.join(' AND ')}
      GROUP BY s.id, s.user_id, s.fname, s.mname, s.lname, et.employee_type
      ORDER BY s.fname ASC, s.mname ASC, s.lname ASC, s.id ASC
    `,
    values
  );

  return rows || [];
}

module.exports = {
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
