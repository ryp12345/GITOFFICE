const { pool } = require('../config/db');

function parseOptionalInt(value) {
  if (value === undefined || value === null || value === '') return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

async function getAllLeaveApplications({ month = null, year = null }) {
  const numericMonth = parseOptionalInt(month);
  const numericYear = parseOptionalInt(year);

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
        ad.additional_designation_names AS additional,
        grouped_depts.dept_shortname AS shortname,
        CASE
          WHEN lsa.cl_type = 'Morning' THEN CONCAT(l.shortname, ' -Morning')
          WHEN lsa.cl_type = 'Afternoon' THEN CONCAT(l.shortname, ' -Afternoon')
          ELSE l.shortname
        END AS title
      FROM leave_staff_applications lsa
      JOIN leaves l ON l.id = lsa.leave_id
      JOIN staff s1 ON s1.id = lsa.staff_id
      LEFT JOIN staff s2 ON s2.id = lsa.alternate
      LEFT JOIN staff s3 ON s3.id = lsa.additional_alternate
      LEFT JOIN (
        SELECT
          ds.staff_id,
          STRING_AGG(d.dept_shortname, ', ' ORDER BY d.dept_shortname) AS dept_shortname
        FROM department_staff ds
        JOIN departments d ON d.id = ds.department_id
        WHERE LOWER(COALESCE(ds.status, 'active')) = 'active'
        GROUP BY ds.staff_id
      ) grouped_depts ON grouped_depts.staff_id = lsa.staff_id
      LEFT JOIN (
        SELECT
          ds.staff_id,
          STRING_AGG(d.design_name, ', ' ORDER BY d.design_name) AS additional_designation_names
        FROM designation_staff ds
        JOIN designations d ON d.id = ds.designation_id
        WHERE LOWER(COALESCE(ds.status, 'active')) = 'active'
          AND d.isadditional = 1
        GROUP BY ds.staff_id
      ) ad ON ad.staff_id = lsa.staff_id
      WHERE ($1::int IS NULL OR EXTRACT(MONTH FROM lsa.start::date) = $1)
        AND ($2::int IS NULL OR EXTRACT(YEAR FROM lsa.start::date) = $2)
      ORDER BY
        CASE LOWER(COALESCE(lsa.appl_status, 'pending'))
          WHEN 'pending' THEN 1
          WHEN 'recommended' THEN 2
          WHEN 'approved' THEN 3
          WHEN 'rejected' THEN 4
          WHEN 'cancelled' THEN 5
          ELSE 6
        END,
        lsa.id DESC
    `,
    [numericMonth, numericYear]
  );

  return rows;
}

async function getApplicationById(client, applicationId) {
  const appId = Number(applicationId);
  if (!appId) return null;

  const { rows } = await client.query(
    `
      SELECT
        id,
        staff_id,
        leave_id,
        appl_status,
        no_of_days,
        additional_alternate,
        EXTRACT(YEAR FROM start::date)::int AS year,
        -- whether the staff has any active additional designations
        EXISTS(
          SELECT 1 FROM designation_staff ds
          JOIN designations d ON d.id = ds.designation_id
          WHERE ds.staff_id = lsa.staff_id
            AND LOWER(COALESCE(ds.status, 'active')) = 'active'
            AND d.isadditional = 1
          LIMIT 1
        ) AS has_additional_designation
      FROM leave_staff_applications lsa
      WHERE lsa.id = $1
      LIMIT 1
    `,
    [appId]
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

async function updateApplicationStatusForPrincipal({ applicationId, status, approverUserId = null }) {
  const appId = Number(applicationId);
  const nextStatus = String(status || '').trim().toLowerCase();

  if (!appId || !['approved', 'rejected'].includes(nextStatus)) {
    const err = new Error('Invalid status update payload');
    err.statusCode = 400;
    throw err;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const existing = await getApplicationById(client, appId);
    if (!existing) {
      const err = new Error('Leave application not found');
      err.statusCode = 404;
      throw err;
    }

    if (String(existing.appl_status || '').toLowerCase() === 'cancelled') {
      const err = new Error('Cancelled leave application cannot be updated');
      err.statusCode = 409;
      throw err;
    }

    // Principal-specific permission: only allow approve/reject when application
    // status is 'recommended' AND (has additional alternate/designation OR no_of_days > 4)
    // This mirrors the Laravel UI rule that shows checkboxes only when additional exists
    // or when leave is >4 days and recommended.
    const currStatus = String(existing.appl_status || '').toLowerCase();
    const hasAdditionalAlt = existing.additional_alternate !== null && existing.additional_alternate !== undefined;
    const hasAdditionalDesignation = Boolean(existing.has_additional_designation);
    const noOfDays = Number(existing.no_of_days || 0);

    if (!(currStatus === 'recommended' && (hasAdditionalAlt || hasAdditionalDesignation || noOfDays > 4))) {
      const err = new Error('Principal is not authorized to update this application');
      err.statusCode = 403;
      throw err;
    }

    const approver = Number(approverUserId) || null;
    const { rows } = await client.query(
      `
        UPDATE leave_staff_applications
        SET appl_status = $1,
            approver = CASE WHEN $1 = 'approved' THEN $2 ELSE approver END,
            updated_at = NOW()
        WHERE id = $3
        RETURNING id, appl_status
      `,
      [nextStatus, approver, appId]
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
  getAllLeaveApplications,
  updateApplicationStatusForPrincipal,
};
