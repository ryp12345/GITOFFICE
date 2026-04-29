const { pool } = require('../config/db');

async function findByEmail(email) {
  const { rows } = await pool.query(
    `SELECT u.id, u.email, u.password, u.role, u.status, u.created_at,
       s.fname, s.mname, s.lname
     FROM users u
     LEFT JOIN staff s ON s.user_id = u.id
     WHERE u.email = $1
     LIMIT 1`,
    [email]
  );
  return rows[0] || null;
}

async function findById(id) {
  const { rows } = await pool.query('SELECT id, email, role, status, created_at FROM users WHERE id = $1 LIMIT 1', [id]);
  return rows[0] || null;
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
