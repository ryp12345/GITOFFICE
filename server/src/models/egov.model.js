const { pool } = require('../config/db');

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

module.exports = {
  EGOV_DEPARTMENT_BY_EMAIL,
  findDepartmentForEgovUser,
};
