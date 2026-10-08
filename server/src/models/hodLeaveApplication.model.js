const { pool } = require('../config/db');
const LeaveRules = require('../services/leaveRules.service');

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
      LEFT JOIN staff s2 ON s2.id = lsa.alternate
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

async function getDepartmentLeaveApplicationsByMonthYear({ departmentId, month, year }) {
  return getDepartmentLeaveApplications({ departmentId, month, year });
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
      const err = new Error('Leave application not found for this department');
      err.statusCode = 404;
      throw err;
    }

    const app = await LeaveRules.getApplicationForAction(client, appId);
    const additionalMap = await LeaveRules.getAdditionalDesignationMap([app.staff_id], client);
    const additional = additionalMap.get(Number(app.staff_id)) || null;
    const allowed = allowedStatus === 'recommended'
      ? LeaveRules.canHodRecommend(app, additional)
      : LeaveRules.canHodReject(app, additional);
    if (!allowed) {
      const err = new Error(`This leave application cannot be ${allowedStatus} by the HoD in its current state`);
      err.statusCode = 403;
      throw err;
    }

    const row = await LeaveRules.transitionApplicationStatus(client, app, allowedStatus, {
      actorUserId: allowedStatus === 'recommended' ? recommenderUserId : null,
    });

    await client.query('COMMIT');
    return row;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  getDepartmentLeaveApplications,
  getDepartmentLeaveApplicationsByMonthYear,
  updateApplicationStatusForDepartment,
};
