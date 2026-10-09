const { pool } = require('../config/db');
const { expectedOnBiometricSql, notExitedSql } = require('./biometricEligibility');

// Staff with an active employee type, each placed in their latest active department and designation.
const ACTIVE_STAFF_CTE = `
  active_staff AS (
    SELECT
      s.id,
      s.employeecode::text AS employeecode,
      TRIM(CONCAT_WS(' ', s.fname, s.mname, s.lname)) AS staff_name,
      et.employee_type,
      dept.dept_shortname,
      des.design_name
    FROM staff s
    JOIN LATERAL (
      SELECT e.employee_type FROM employee_types e
       WHERE e.staff_id = s.id AND LOWER(COALESCE(e.status, 'active')) = 'active'
       ORDER BY e.id DESC LIMIT 1
    ) et ON true
    LEFT JOIN LATERAL (
      SELECT d.dept_shortname FROM department_staff ds JOIN departments d ON d.id = ds.department_id
       WHERE ds.staff_id = s.id AND LOWER(COALESCE(ds.status, 'active')) = 'active'
       ORDER BY ds.id DESC LIMIT 1
    ) dept ON true
    LEFT JOIN LATERAL (
      SELECT dg.design_name FROM designation_staff dst JOIN designations dg ON dg.id = dst.designation_id
       WHERE dst.staff_id = s.id AND LOWER(COALESCE(dst.status, 'active')) = 'active'
       ORDER BY dst.id DESC LIMIT 1
    ) des ON true
    WHERE ${notExitedSql('s')}
  )`;

async function getStaffSummary() {
  const [totals, byDepartment, byDesignation] = await Promise.all([
    pool.query(`
      WITH ${ACTIVE_STAFF_CTE}
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE LOWER(employee_type) = 'teaching')::int AS teaching,
        COUNT(*) FILTER (WHERE LOWER(employee_type) <> 'teaching')::int AS non_teaching
      FROM active_staff`),
    pool.query(`
      WITH ${ACTIVE_STAFF_CTE}
      SELECT
        COALESCE(dept_shortname, 'Not set') AS department,
        COUNT(*) FILTER (WHERE LOWER(employee_type) = 'teaching')::int AS teaching,
        COUNT(*) FILTER (WHERE LOWER(employee_type) <> 'teaching')::int AS non_teaching
      FROM active_staff
      GROUP BY 1
      ORDER BY COUNT(*) DESC, 1`),
    pool.query(`
      WITH ${ACTIVE_STAFF_CTE}
      SELECT COALESCE(design_name, 'Not set') AS designation, COUNT(*)::int AS count
      FROM active_staff
      WHERE LOWER(employee_type) = 'teaching'
      GROUP BY 1
      ORDER BY count DESC, 1`),
  ]);
  return {
    ...(totals.rows[0] || { total: 0, teaching: 0, non_teaching: 0 }),
    by_department: byDepartment.rows,
    teaching_by_designation: byDesignation.rows,
  };
}

// Applications still open (pending / recommended), with the applicant's department.
async function getOpenLeaveApplications() {
  const { rows } = await pool.query(`
    SELECT
      lsa.id, lsa.staff_id, lsa.leave_id, lsa.no_of_days, lsa.appl_status, lsa.cl_type,
      TO_CHAR(lsa.start::date, 'YYYY-MM-DD') AS start_date,
      TO_CHAR(lsa.end::date, 'YYYY-MM-DD') AS end_date,
      TO_CHAR(lsa.created_at::date, 'YYYY-MM-DD') AS application_date,
      l.shortname AS leave_shortname,
      TRIM(CONCAT_WS(' ', s.fname, s.mname, s.lname)) AS staff_name,
      (SELECT d.dept_shortname FROM department_staff ds JOIN departments d ON d.id = ds.department_id
        WHERE ds.staff_id = s.id AND LOWER(COALESCE(ds.status, 'active')) = 'active'
        ORDER BY ds.id DESC LIMIT 1) AS dept_shortname
    FROM leave_staff_applications lsa
    JOIN staff s ON s.id = lsa.staff_id
    LEFT JOIN leaves l ON l.id = lsa.leave_id
    WHERE LOWER(COALESCE(lsa.appl_status, '')) IN ('pending', 'recommended')
    ORDER BY lsa.start ASC, lsa.id ASC`);
  return rows;
}

// Leave covering a date range (excluding rejected / cancelled), with department.
async function getLeaveBetween(fromYmd, toYmd) {
  const { rows } = await pool.query(`
    SELECT
      lsa.id, lsa.no_of_days, lsa.appl_status,
      TO_CHAR(lsa.start::date, 'YYYY-MM-DD') AS start_date,
      TO_CHAR(lsa.end::date, 'YYYY-MM-DD') AS end_date,
      l.shortname AS leave_shortname,
      TRIM(CONCAT_WS(' ', s.fname, s.mname, s.lname)) AS staff_name,
      (SELECT d.dept_shortname FROM department_staff ds JOIN departments d ON d.id = ds.department_id
        WHERE ds.staff_id = s.id AND LOWER(COALESCE(ds.status, 'active')) = 'active'
        ORDER BY ds.id DESC LIMIT 1) AS dept_shortname
    FROM leave_staff_applications lsa
    JOIN staff s ON s.id = lsa.staff_id
    LEFT JOIN leaves l ON l.id = lsa.leave_id
    WHERE lsa.start::date <= $2::date AND lsa.end::date >= $1::date
      AND LOWER(COALESCE(lsa.appl_status, '')) NOT IN ('rejected', 'cancelled')
    ORDER BY lsa.start ASC, staff_name ASC`, [fromYmd, toYmd]);
  return rows;
}

// Staff expected on the biometric (same association rule as the daily biometric report),
// with latest active department and whether they have leave on the date.
async function getAttendanceRoster(dateYmd) {
  const { rows } = await pool.query(`
    SELECT
      s.employeecode::text AS employeecode,
      COALESCE((SELECT d.dept_shortname FROM department_staff ds JOIN departments d ON d.id = ds.department_id
        WHERE ds.staff_id = s.id AND LOWER(COALESCE(ds.status, 'active')) = 'active'
        ORDER BY ds.id DESC LIMIT 1), 'Not set') AS department,
      EXISTS (
        SELECT 1 FROM leave_staff_applications lsa
         WHERE lsa.staff_id = s.id AND lsa.start <= $1 AND lsa.end >= $1
           AND LOWER(COALESCE(lsa.appl_status, '')) NOT IN ('rejected', 'cancelled')
      ) AS on_leave
    FROM staff s
    WHERE ${expectedOnBiometricSql('s')}
    AND TRIM(COALESCE(s.employeecode::text, '')) NOT IN ('', '0')`, [dateYmd]);
  return rows;
}

async function isHoliday(dateYmd) {
  const { rows } = await pool.query(
    `SELECT title FROM holidayrhs WHERE start::date = $1::date AND type = 'Holiday' LIMIT 1`,
    [dateYmd]
  );
  return rows[0]?.title || null;
}

async function getRecruitmentSummary() {
  const { rows } = await pool.query(`
    SELECT 'associate_professor' AS kind,
           COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE LOWER(COALESCE(eligibility_status, '')) = 'eligible')::int AS eligible
      FROM associate_professor_applications
    UNION ALL
    SELECT 'professor', COUNT(*)::int,
           COUNT(*) FILTER (WHERE LOWER(COALESCE(eligibility_status, '')) = 'eligible')::int
      FROM professor_applications`);
  const out = {};
  rows.forEach((r) => { out[r.kind] = { total: r.total, eligible: r.eligible }; });
  return out;
}

module.exports = {
  ACTIVE_STAFF_CTE,
  getStaffSummary,
  getOpenLeaveApplications,
  getLeaveBetween,
  getAttendanceRoster,
  isHoliday,
  getRecruitmentSummary,
};
