const { pool } = require('../config/db');
const LeaveRules = require('../services/leaveRules.service');

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

    const app = await LeaveRules.getApplicationForAction(client, appId);
    if (!app) {
      const err = new Error('Leave application not found');
      err.statusCode = 404;
      throw err;
    }

    const additionalMap = await LeaveRules.getAdditionalDesignationMap([app.staff_id], client);
    if (!LeaveRules.canPrincipalAct(app, additionalMap.get(Number(app.staff_id)) || null)) {
      const err = new Error('Principal is not authorized to update this leave application');
      err.statusCode = 403;
      throw err;
    }

    const row = await LeaveRules.transitionApplicationStatus(client, app, nextStatus, {
      actorUserId: nextStatus === 'approved' ? approverUserId : null,
      notifyStaff: true,
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
  getAllLeaveApplications,
  updateApplicationStatusForPrincipal,
};
