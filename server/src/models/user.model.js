const { pool } = require('../config/db');

async function getCoordinatorNames(staffId) {
  if (!staffId) return [];
  const { rows } = await pool.query(
    `SELECT c.name as coordinator_name
     FROM coordinator_staffs cs
     JOIN coordinators c ON c.id = cs.coordinator_id
     WHERE cs.staff_id = $1 AND cs.status = 'active'`,
    [staffId]
  );
  return rows.map(r => r.coordinator_name);
}

async function findByEmail(email) {
  const { rows } = await pool.query(
    `SELECT u.id, u.email, u.password, u.role, u.status, u.created_at,
       s.fname, s.mname, s.lname, s.id as staff_id
     FROM users u
     LEFT JOIN staff s ON s.user_id = u.id
     WHERE u.email = $1
     LIMIT 1`,
    [email]
  );
  const user = rows[0] || null;
  if (user) {
    user.coordinator_names = await getCoordinatorNames(user.staff_id);
  }
  return user;
}

async function findById(id) {
  const { rows } = await pool.query('SELECT id, email, role, status, created_at FROM users WHERE id = $1 LIMIT 1', [id]);
  const user = rows[0] || null;
  if (user) {
    // Get staff_id for this user
    const staffResult = await pool.query('SELECT id FROM staff WHERE user_id = $1 LIMIT 1', [id]);
    if (staffResult.rows[0]) {
      user.staff_id = staffResult.rows[0].id;
      user.coordinator_names = await getCoordinatorNames(user.staff_id);
    } else {
      user.coordinator_names = [];
    }
  }
  return user;
}

async function updatePasswordById(id, passwordHash) {
  const { rows } = await pool.query(
    `
      UPDATE users
      SET password = $2, updated_at = NOW()
      WHERE id = $1
      RETURNING id, email, role, status, created_at
    `,
    [id, passwordHash]
  );
  return rows[0] || null;
}

async function findAll() {
  const { rows } = await pool.query(`
    SELECT u.id, u.email, u.role, u.status, u.created_at,
      s.fname, s.mname, s.lname,
      (
        SELECT d.dept_name
        FROM department_staff ds
        JOIN departments d ON d.id = ds.department_id
        WHERE ds.staff_id = s.id AND ds.status = 'active'
        ORDER BY ds.id DESC
        LIMIT 1
      ) AS department_name
    FROM users u
    LEFT JOIN staff s ON s.user_id = u.id
    ORDER BY u.created_at DESC NULLS LAST, u.id DESC
  `);
  return rows;
}

async function create({ email, passwordHash, role }) {
  const { rows } = await pool.query(
    "INSERT INTO users (email, password, role, status, created_at, updated_at) VALUES ($1, $2, $3, 'Active', NOW(), NOW()) RETURNING id, email, role, status, created_at",
    [email, passwordHash, role]
  );
  return rows[0];
}

module.exports = { findByEmail, findById, updatePasswordById, findAll, create };
