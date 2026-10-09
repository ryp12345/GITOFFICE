const { pool } = require('../config/db');
const { notExitedSql } = require('./biometricEligibility');

// Staff still in service (active employee type, no active exit association), with the fields Establishment maintains: latest active
// department / designation / association, key service dates and current-year leave entitlement.
const STAFF_CTE = `
  active_staff AS (
    SELECT
      s.id,
      TRIM(CONCAT_WS(' ', s.fname, s.mname, s.lname)) AS staff_name,
      TRIM(COALESCE(s.employeecode::text, '')) AS employeecode,
      LOWER(COALESCE(s.gender, '')) AS gender,
      s.doj,
      s.date_of_increment,
      s.date_of_superanuation,
      et.employee_type,
      dept.dept_shortname,
      des.design_name,
      asso.asso_name,
      EXISTS (SELECT 1 FROM leave_staff_entitlements le WHERE le.staff_id = s.id AND le.year = $1) AS has_entitlement,
      EXISTS (SELECT 1 FROM qualification_staff qs WHERE qs.staff_id = s.id) AS has_qualification
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
    LEFT JOIN LATERAL (
      SELECT a.asso_name FROM association_staff ast JOIN associations a ON a.id = ast.association_id
       WHERE ast.staff_id = s.id AND LOWER(COALESCE(ast.status, 'active')) = 'active'
       ORDER BY ast.id DESC LIMIT 1
    ) asso ON true
    WHERE ${notExitedSql('s')}
  )`;

async function getComposition(year) {
  const [byAssociation, byGender] = await Promise.all([
    pool.query(`
      WITH ${STAFF_CTE}
      SELECT COALESCE(UPPER(LEFT(asso_name, 1)) || SUBSTRING(asso_name FROM 2), 'Not set') AS label, COUNT(*)::int AS count
      FROM active_staff GROUP BY 1 ORDER BY count DESC, 1`, [year]),
    pool.query(`
      WITH ${STAFF_CTE}
      SELECT CASE WHEN gender = '' THEN 'Not set' ELSE INITCAP(gender) END AS label, COUNT(*)::int AS count
      FROM active_staff GROUP BY 1 ORDER BY count DESC`, [year]),
  ]);
  return { by_association: byAssociation.rows, by_gender: byGender.rows };
}

// Upcoming service events: superannuation, annual increments and recent joiners.
async function getServiceEvents(year, todayYmd) {
  const listCols = `id, staff_name, dept_shortname, design_name`;
  const [retirements, incrementsThisMonth, incrementsNextMonth, joiners] = await Promise.all([
    pool.query(`
      WITH ${STAFF_CTE}
      SELECT ${listCols}, TO_CHAR(date_of_superanuation, 'YYYY-MM-DD') AS date
      FROM active_staff
      WHERE date_of_superanuation >= $2::date AND date_of_superanuation < $2::date + INTERVAL '12 months'
      ORDER BY date_of_superanuation ASC`, [year, todayYmd]),
    pool.query(`
      WITH ${STAFF_CTE}
      SELECT ${listCols}, TO_CHAR(date_of_increment, 'YYYY-MM-DD') AS date
      FROM active_staff
      WHERE EXTRACT(MONTH FROM date_of_increment) = EXTRACT(MONTH FROM $2::date)
      ORDER BY EXTRACT(DAY FROM date_of_increment), staff_name`, [year, todayYmd]),
    pool.query(`
      WITH ${STAFF_CTE}
      SELECT COUNT(*)::int AS count
      FROM active_staff
      WHERE EXTRACT(MONTH FROM date_of_increment) = EXTRACT(MONTH FROM ($2::date + INTERVAL '1 month'))`, [year, todayYmd]),
    pool.query(`
      WITH ${STAFF_CTE}
      SELECT ${listCols}, TO_CHAR(doj, 'YYYY-MM-DD') AS date
      FROM active_staff
      WHERE EXTRACT(YEAR FROM doj) = $1
      ORDER BY doj DESC`, [year]),
  ]);
  return {
    retirements_12_months: retirements.rows,
    increments_this_month: incrementsThisMonth.rows,
    increments_next_month: incrementsNextMonth.rows[0]?.count || 0,
    joiners_this_year: joiners.rows,
  };
}

// Records Establishment should complete. Each check counts active staff missing that item.
async function getDataQuality(year) {
  const { rows } = await pool.query(`
    WITH ${STAFF_CTE},
    dup_codes AS (
      SELECT employeecode FROM active_staff
       WHERE employeecode NOT IN ('', '0')
       GROUP BY employeecode HAVING COUNT(*) > 1
    )
    SELECT
      COUNT(*) FILTER (WHERE dept_shortname IS NULL)::int AS no_department,
      COUNT(*) FILTER (WHERE design_name IS NULL)::int AS no_designation,
      COUNT(*) FILTER (WHERE asso_name IS NULL)::int AS no_association,
      COUNT(*) FILTER (WHERE employeecode IN ('', '0'))::int AS no_employee_code,
      COUNT(*) FILTER (WHERE employeecode IN (SELECT employeecode FROM dup_codes))::int AS duplicate_employee_code,
      COUNT(*) FILTER (WHERE date_of_superanuation IS NULL)::int AS no_superannuation_date,
      COUNT(*) FILTER (WHERE date_of_increment IS NULL)::int AS no_increment_date,
      COUNT(*) FILTER (WHERE NOT has_entitlement)::int AS no_leave_entitlement,
      COUNT(*) FILTER (WHERE NOT has_qualification)::int AS no_qualification
    FROM active_staff`, [year]);
  return rows[0] || {};
}

// Conditions behind each data-quality count, so the dashboard can list the staff concerned.
// Keys are whitelisted; only these fixed SQL fragments are ever used.
const DATA_QUALITY_CONDITIONS = {
  no_department: 'dept_shortname IS NULL',
  no_designation: 'design_name IS NULL',
  no_association: 'asso_name IS NULL',
  no_employee_code: "employeecode IN ('', '0')",
  duplicate_employee_code: 'employeecode IN (SELECT employeecode FROM dup_codes)',
  no_superannuation_date: 'date_of_superanuation IS NULL',
  no_increment_date: 'date_of_increment IS NULL',
  no_leave_entitlement: 'NOT has_entitlement',
  no_qualification: 'NOT has_qualification',
};

// Staff in service matching one data-quality check, or null for an unknown check.
async function getDataQualityStaff(check, year) {
  const condition = DATA_QUALITY_CONDITIONS[check];
  if (!condition) return null;
  const { rows } = await pool.query(`
    WITH ${STAFF_CTE},
    dup_codes AS (
      SELECT employeecode FROM active_staff
       WHERE employeecode NOT IN ('', '0')
       GROUP BY employeecode HAVING COUNT(*) > 1
    )
    SELECT id, staff_name, employeecode, employee_type, dept_shortname, design_name, asso_name
    FROM active_staff
    WHERE ${condition}
    ORDER BY dept_shortname NULLS FIRST, staff_name`, [year]);
  return rows;
}

// College-wide leave pipeline: waiting at HOD (pending) and at Dean/Principal (recommended),
// split into leave not yet over vs. leave already in the past.
async function getLeavePipeline(todayYmd) {
  const { rows } = await pool.query(`
    SELECT
      COUNT(*) FILTER (WHERE LOWER(appl_status) = 'pending' AND "end"::date >= $1::date)::int AS pending_current,
      COUNT(*) FILTER (WHERE LOWER(appl_status) = 'pending' AND "end"::date < $1::date)::int AS pending_past,
      COUNT(*) FILTER (WHERE LOWER(appl_status) = 'recommended' AND "end"::date >= $1::date)::int AS recommended_current,
      COUNT(*) FILTER (WHERE LOWER(appl_status) = 'recommended' AND "end"::date < $1::date)::int AS recommended_past,
      COALESCE(SUM(no_of_days) FILTER (
        WHERE LOWER(appl_status) = 'approved'
          AND date_trunc('month', start::date) = date_trunc('month', $1::date)
      ), 0)::numeric AS approved_days_this_month
    FROM leave_staff_applications`, [todayYmd]);
  const r = rows[0] || {};
  return { ...r, approved_days_this_month: Number(r.approved_days_this_month) || 0 };
}

async function getUpcomingHolidays(todayYmd, limit = 5) {
  const { rows } = await pool.query(`
    SELECT title, type, TO_CHAR(start::date, 'YYYY-MM-DD') AS date
    FROM holidayrhs
    WHERE start::date >= $1::date
    ORDER BY start ASC
    LIMIT $2`, [todayYmd, limit]);
  return rows;
}

module.exports = {
  getComposition,
  getServiceEvents,
  getDataQuality,
  getDataQualityStaff,
  DATA_QUALITY_CONDITIONS,
  getLeavePipeline,
  getUpcomingHolidays,
};
