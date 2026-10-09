const { pool } = require('../../config/db');

// fastrack_courses.no_of_students is varchar; count only purely numeric values.
const STUDENTS_SQL = `CASE WHEN TRIM(COALESCE(fc.no_of_students, '')) ~ '^[0-9]+$' THEN TRIM(fc.no_of_students)::int ELSE 0 END`;

// Every query takes the academic year as $1 (NULL = all years). Courses and staff claims belong
// to a year through their fastrack instance; instances and expenses carry the year themselves.
const INSTANCE_YEAR = `($1::text IS NULL OR fi.academic_year = $1)`;
const COURSE_IN_YEAR = `($1::text IS NULL OR fc.ft_instance_id IN (SELECT id FROM fastrack_instances WHERE academic_year = $1))`;

async function getAcademicYears() {
  const { rows } = await pool.query(
    `
      SELECT academic_year FROM fastrack_instances WHERE COALESCE(academic_year, '') <> ''
      UNION
      SELECT academic_year FROM fastrack_expenses WHERE COALESCE(academic_year, '') <> ''
      ORDER BY academic_year DESC
    `
  );
  return rows.map((r) => r.academic_year);
}

async function getDashboardStats(year) {
  const { rows } = await pool.query(
    `
      SELECT
        (SELECT COUNT(*) FROM fastrack_instances fi WHERE ${INSTANCE_YEAR})::int AS ft_instance_count,
        (SELECT COUNT(*) FROM fastrack_courses fc WHERE ${COURSE_IN_YEAR})::int AS ft_courses_count,
        (SELECT COUNT(*) FROM schemes)::int AS ft_scheme_count,
        (SELECT COUNT(*) FROM schemes WHERE LOWER(COALESCE(status, '')) = 'active')::int AS ft_active_scheme_count,
        (SELECT COALESCE(SUM(expense_amount), 0) FROM fastrack_expenses WHERE ($1::text IS NULL OR academic_year = $1))::numeric AS fastrack_expense_total,
        (SELECT COALESCE(SUM(total_fees_collected), 0) FROM fastrack_instances fi WHERE ${INSTANCE_YEAR})::numeric AS fees_collected_total
    `,
    [year]
  );
  const row = rows[0] || {};
  return {
    ...row,
    fastrack_expense_total: Number(row.fastrack_expense_total) || 0,
    fees_collected_total: Number(row.fees_collected_total) || 0,
  };
}

// Staff claim workflow: staff submit (Pending) -> coordinator verifies (Verified) -> HOD approves (Approved).
async function getClaimStatus(year) {
  const { rows } = await pool.query(
    `
      SELECT
        COUNT(*) FILTER (WHERE fs.status = 'Pending')::int AS pending,
        COUNT(*) FILTER (WHERE fs.status = 'Verified')::int AS verified,
        COUNT(*) FILTER (WHERE fs.status = 'Approved')::int AS approved,
        (SELECT COUNT(*) FROM fastrack_courses fc
          WHERE ${COURSE_IN_YEAR}
            AND NOT EXISTS (SELECT 1 FROM fastrack_staffs s WHERE s.course_id = fc.id))::int AS courses_without_claim
      FROM fastrack_staffs fs
      JOIN fastrack_courses fc ON fc.id = fs.course_id
      WHERE ${COURSE_IN_YEAR}
    `,
    [year]
  );
  return rows[0] || { pending: 0, verified: 0, approved: 0, courses_without_claim: 0 };
}

async function getInstances(year) {
  const { rows } = await pool.query(
    `
      SELECT
        fi.id,
        fi.ft_instance_name,
        TO_CHAR(fi.start_date, 'YYYY-MM-DD') AS start_date,
        TO_CHAR(fi.end_date, 'YYYY-MM-DD') AS end_date,
        fi.academic_year,
        COALESCE(fi.total_fees_collected, 0)::numeric AS total_fees_collected,
        s.scheme_name,
        COALESCE(c.courses, 0)::int AS courses,
        COALESCE(c.students, 0)::int AS students,
        COALESCE(st.claims, 0)::int AS claims,
        COALESCE(st.approved, 0)::int AS approved
      FROM fastrack_instances fi
      LEFT JOIN schemes s ON s.id = fi.scheme_id
      LEFT JOIN LATERAL (
        SELECT COUNT(*) AS courses, SUM(${STUDENTS_SQL}) AS students
        FROM fastrack_courses fc
        WHERE fc.ft_instance_id = fi.id
      ) c ON true
      LEFT JOIN LATERAL (
        SELECT COUNT(*) AS claims, COUNT(*) FILTER (WHERE fs.status = 'Approved') AS approved
        FROM fastrack_staffs fs
        JOIN fastrack_courses fc ON fc.id = fs.course_id
        WHERE fc.ft_instance_id = fi.id
      ) st ON true
      WHERE ${INSTANCE_YEAR}
      ORDER BY fi.start_date DESC NULLS LAST, fi.id DESC
    `,
    [year]
  );
  return rows.map((r) => ({ ...r, total_fees_collected: Number(r.total_fees_collected) || 0 }));
}

// Expense totals per head (fastrack_expenses is recorded per academic year, not per instance).
async function getExpensesGrouped(year) {
  const { rows } = await pool.query(
    `
      SELECT
        fem.title,
        fe.ft_expense_master_id,
        SUM(fe.expense_amount)::numeric AS total_amount
      FROM fastrack_expenses fe
      JOIN fastrack_expenses_master fem ON fem.id = fe.ft_expense_master_id
      WHERE ($1::text IS NULL OR fe.academic_year = $1)
      GROUP BY fe.ft_expense_master_id, fem.title
      ORDER BY total_amount DESC, fem.title ASC
    `,
    [year]
  );
  return rows.map((r) => ({ ...r, total_amount: Number(r.total_amount) || 0 }));
}

async function getCourseTypes(year) {
  const { rows } = await pool.query(
    `
      SELECT ft.id, ft.course_type, ft.is_remunerated, COUNT(fc.id)::int AS courses
      FROM ftcourses ft
      LEFT JOIN fastrack_courses fc ON fc.ft_course_type_id = ft.id AND ${COURSE_IN_YEAR}
      GROUP BY ft.id, ft.course_type, ft.is_remunerated
      ORDER BY ft.id ASC
    `,
    [year]
  );
  const untyped = await pool.query(
    `SELECT COUNT(*)::int AS courses FROM fastrack_courses fc
      WHERE ${COURSE_IN_YEAR}
        AND (fc.ft_course_type_id IS NULL OR fc.ft_course_type_id NOT IN (SELECT id FROM ftcourses))`,
    [year]
  );
  return { courseTypes: rows, untypedCourses: untyped.rows[0]?.courses || 0 };
}

async function getCoursesByDepartment(year) {
  const { rows } = await pool.query(
    `
      SELECT COALESCE(d.dept_shortname, 'Not set') AS department, COUNT(*)::int AS courses
      FROM fastrack_courses fc
      LEFT JOIN departments d ON d.id = fc.department_id
      WHERE ${COURSE_IN_YEAR}
      GROUP BY 1
      ORDER BY courses DESC, department ASC
    `,
    [year]
  );
  return rows;
}

// academicYear: e.g. '2024-2025', or null/empty for all years.
async function getDashboardData({ academicYear = null } = {}) {
  const year = academicYear ? String(academicYear) : null;
  const [academicYears, stats, claimStatus, instances, expenses, courseTypeData, coursesByDepartment] = await Promise.all([
    getAcademicYears(),
    getDashboardStats(year),
    getClaimStatus(year),
    getInstances(year),
    getExpensesGrouped(year),
    getCourseTypes(year),
    getCoursesByDepartment(year),
  ]);

  return {
    academic_year: year,
    academic_years: academicYears,
    ...stats,
    claim_status: claimStatus,
    instances,
    expenses,
    ft_course_statistic: courseTypeData.courseTypes,
    untyped_courses: courseTypeData.untypedCourses,
    courses_by_department: coursesByDepartment,
  };
}

module.exports = {
  getAcademicYears,
  getDashboardStats,
  getClaimStatus,
  getInstances,
  getExpensesGrouped,
  getCourseTypes,
  getCoursesByDepartment,
  getDashboardData,
};
