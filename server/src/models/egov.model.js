const { pool } = require('../config/db');
const { toIsoDate } = require('../utils/pgDate');

// RedirectServiceProvider::getDeptMapping(): an e-Governance admin account is bound to its
// department by email, not by any column in the database. Laravel stored the result in
// session('deptid'); the API resolves it from the signed-in user on every request instead.
const EGOV_DEPARTMENT_BY_EMAIL = {
  'egov_cv@git.edu': 8,
  'egov_cs@git.edu': 5,
  'egov_at@git.edu': 17,
  'egov_ae@git.edu': 9,
  'egov_ec@git.edu': 2,
  'egov_ee@git.edu': 7,
  'egov_is@git.edu': 6,
  'egov_me@git.edu': 1,
  'egov_mba@git.edu': 24,
  'egov_mca@git.edu': 3,
  'egov_phy@git.edu': 13,
  'egov_math@git.edu': 12,
  'egov_chem@git.edu': 14,
};

async function findDepartmentForEgovUser(userId) {
  const user = await pool.query('SELECT email FROM users WHERE id = $1 LIMIT 1', [userId]);
  const email = String(user.rows[0]?.email || '').trim().toLowerCase();
  const departmentId = EGOV_DEPARTMENT_BY_EMAIL[email];
  if (!departmentId) return null;

  const { rows } = await pool.query(
    'SELECT id, dept_name, dept_shortname FROM departments WHERE id = $1 LIMIT 1',
    [departmentId]
  );
  return rows[0] || null;
}

// The Laravel dashboard listed every event and notice (event::with('department')->get()),
// not just the admin's department, together with the departments each one was posted to.
async function listEvents() {
  const { rows } = await pool.query(
    `SELECT e.id, e.event_name, e.start_date, e.to_date, e.location, e.organizers,
            e.event_website, e.staff_type, e.attachment,
            COALESCE(
              ARRAY_AGG(DISTINCT d.dept_shortname) FILTER (WHERE d.id IS NOT NULL),
              '{}'
            ) AS departments
       FROM events e
       LEFT JOIN department_event de ON de.event_id = e.id
       LEFT JOIN departments d ON d.id = de.department_id
      GROUP BY e.id
      ORDER BY e.start_date DESC, e.id DESC`
  );
  return rows;
}

async function listNotices() {
  const { rows } = await pool.query(
    `SELECT n.id, n.title, n.date, n.description, n.staff_type,
            COALESCE(
              ARRAY_AGG(DISTINCT d.dept_shortname) FILTER (WHERE d.id IS NOT NULL),
              '{}'
            ) AS departments
       FROM notices n
       LEFT JOIN department_notice dn ON dn.notice_id = n.id
       LEFT JOIN departments d ON d.id = dn.department_id
      GROUP BY n.id
      ORDER BY n.date DESC, n.id DESC`
  );
  return rows.map((row) => ({ ...row, date: toIsoDate(row.date) }));
}

module.exports = {
  EGOV_DEPARTMENT_BY_EMAIL,
  findDepartmentForEgovUser,
  listEvents,
  listNotices,
};
