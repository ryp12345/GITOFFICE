const { pool } = require('../config/db');

async function findDepartmentByHodUserId(userId) {
  // Strategy 1: departments.hod_user_id (direct mapping, same as Laravel RedirectServiceProvider)
  const direct = await pool.query(
    `SELECT id, dept_name, dept_shortname, status FROM departments WHERE hod_user_id = $1 LIMIT 1`,
    [userId]
  );
  if (direct.rows[0]) return direct.rows[0];

  // Strategy 2: users -> staff -> department_staff (active) -> departments
  const { rows } = await pool.query(
    `
      SELECT d.id, d.dept_name, d.dept_shortname, d.status
      FROM users u
      JOIN staff s ON s.user_id = u.id
      JOIN department_staff ds ON ds.staff_id = s.id AND LOWER(ds.status) = 'active'
      JOIN departments d ON d.id = ds.department_id
      WHERE u.id = $1
      ORDER BY ds.id DESC
      LIMIT 1
    `,
    [userId]
  );

  return rows[0] || null;
}

async function findHodHistoryByDepartmentId(departmentId) {
  // Use department_staff to link HODs to department (avoids relying on designation_staff.dept_id
  // which may not exist in all PostgreSQL mirrors)
  const primary = `
    SELECT
      s.id AS staff_id,
      s.user_id,
      s.fname,
      s.mname,
      s.lname,
      ds.start_date,
      ds.end_date,
      ds.status
    FROM staff s
    INNER JOIN designation_staff ds ON ds.staff_id = s.id
    WHERE ds.designation_id = 1
      AND ds.dept_id = $1
    ORDER BY ds.start_date ASC NULLS LAST, ds.id ASC
  `;

  const fallback = `
    SELECT
      s.id AS staff_id,
      s.user_id,
      s.fname,
      s.mname,
      s.lname,
      ds.start_date,
      ds.end_date,
      ds.status
    FROM staff s
    INNER JOIN designation_staff ds ON ds.staff_id = s.id
    WHERE ds.designation_id = 1
      AND s.id IN (
        SELECT staff_id FROM department_staff WHERE department_id = $1
      )
    ORDER BY ds.start_date ASC NULLS LAST, ds.id ASC
  `;

  try {
    const { rows } = await pool.query(primary, [departmentId]);
    return rows;
  } catch (err) {
    if (!/dept_id/i.test(String(err?.message || ''))) {
      throw err;
    }
    const { rows } = await pool.query(fallback, [departmentId]);
    return rows;
  }
}

module.exports = {
  findDepartmentByHodUserId,
  findHodHistoryByDepartmentId
};
