const { pool } = require('../config/db');

async function getDepartmentLeaveApplications({ departmentId, month = null, year = null }) {
  const deptId = Number(departmentId);
  if (!deptId) return [];

  const numericMonth = month ? Number(month) : null;
  const numericYear = year ? Number(year) : null;

  const { rows } = await pool.query(
    `
      SELECT
        lsa.id,
        lsa.leave_id,
        lsa.staff_id,
        lsa.alternate,
        lsa.additional_alternate,
        lsa.reason,
        lsa.recommender,
        lsa.approver,
        TO_CHAR(lsa.start::date, 'YYYY-MM-DD') AS start_date,
        TO_CHAR(lsa.end::date, 'YYYY-MM-DD') AS end_date,
        lsa.no_of_days,
        lsa.appl_status,
        lsa.leave_status,
        lsa.year,
        TO_CHAR(lsa.created_at::date, 'YYYY-MM-DD') AS application_date,
        l.shortname AS leave_shortname,
        l.longname AS leave_longname,
        TRIM(CONCAT_WS(' ', s1.fname, s1.mname, s1.lname)) AS staff_name,
        TRIM(CONCAT_WS(' ', s2.fname, s2.mname, s2.lname)) AS alternate_staff,
        TRIM(CONCAT_WS(' ', s3.fname, s3.mname, s3.lname)) AS additional_alternate_staff,
        CASE
          WHEN lsa.cl_type = 'Morning' THEN CONCAT(l.shortname, ' -Morning')
          WHEN lsa.cl_type = 'Afternoon' THEN CONCAT(l.shortname, ' -Afternoon')
          ELSE l.shortname
        END AS title
      FROM leave_staff_applications lsa
      JOIN leaves l ON l.id = lsa.leave_id
      JOIN staff s1 ON s1.id = lsa.staff_id
      JOIN staff s2 ON s2.id = lsa.alternate
      LEFT JOIN staff s3 ON s3.id = lsa.additional_alternate
      WHERE lsa.staff_id IN (
        SELECT ds.staff_id
        FROM department_staff ds
        WHERE ds.department_id = $1
          AND LOWER(COALESCE(ds.status, 'active')) = 'active'
      )
        AND ($2::int IS NULL OR EXTRACT(MONTH FROM lsa.start::date) = $2)
        AND ($3::int IS NULL OR EXTRACT(YEAR FROM lsa.start::date) = $3)
      ORDER BY
        CASE lsa.appl_status
          WHEN 'pending' THEN 1
          WHEN 'recommended' THEN 2
          WHEN 'approved' THEN 3
          WHEN 'rejected' THEN 4
          WHEN 'cancelled' THEN 5
          ELSE 6
        END,
        lsa.id DESC
    `,
    [deptId, numericMonth, numericYear]
  );

  return rows;
}

async function getApplicationByIdForDepartment(client, applicationId, departmentId) {
  const appId = Number(applicationId);
  const deptId = Number(departmentId);
  if (!appId || !deptId) return null;

  const { rows } = await client.query(
    `
      SELECT
        lsa.id,
        lsa.staff_id,
        lsa.leave_id,
        lsa.appl_status,
        EXTRACT(YEAR FROM lsa.start::date)::int AS year
      FROM leave_staff_applications lsa
      WHERE lsa.id = $1
        AND lsa.staff_id IN (
          SELECT ds.staff_id
          FROM department_staff ds
          WHERE ds.department_id = $2
            AND LOWER(COALESCE(ds.status, 'active')) = 'active'
        )
      LIMIT 1
    `,
    [appId, deptId]
  );

  return rows[0] || null;
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

async function updateApplicationStatusForDepartment({ applicationId, departmentId, status, recommenderUserId = null }) {
  const appId = Number(applicationId);
  const deptId = Number(departmentId);
  const allowedStatus = String(status || '').trim().toLowerCase();
  if (!appId || !deptId || !['recommended', 'rejected'].includes(allowedStatus)) {
    const err = new Error('Invalid status update payload');
    err.statusCode = 400;
    throw err;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const existing = await getApplicationByIdForDepartment(client, appId, deptId);
    if (!existing) {
      await client.query('ROLLBACK');
      const err = new Error('Leave application not found for this department');
      err.statusCode = 404;
      throw err;
    }

    if (existing.appl_status === 'cancelled') {
      await client.query('ROLLBACK');
      const err = new Error('Cancelled leave application cannot be updated');
      err.statusCode = 409;
      throw err;
    }

    const nextStatus = allowedStatus;
    const recommender = Number(recommenderUserId) || null;

    const { rows } = await client.query(
      `
        UPDATE leave_staff_applications
        SET appl_status = $1,
            recommender = CASE WHEN $1 = 'recommended' THEN $2 ELSE recommender END,
            updated_at = NOW()
        WHERE id = $3
        RETURNING id, appl_status
      `,
      [nextStatus, recommender, appId]
    );

    await syncConsumedEntitlement(client, Number(existing.staff_id), Number(existing.leave_id), Number(existing.year));

    await client.query('COMMIT');
    return rows[0] || null;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  getDepartmentLeaveApplications,
  updateApplicationStatusForDepartment,
};
