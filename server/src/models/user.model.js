const { pool } = require('../config/db');

async function findByEmail(email) {
  const { rows } = await pool.query('SELECT id, email, password, role, status, created_at FROM users WHERE email = $1 LIMIT 1', [email]);
  return rows[0] || null;
}

async function findById(id) {
  const { rows } = await pool.query('SELECT id, email, role, status, created_at FROM users WHERE id = $1 LIMIT 1', [id]);
  return rows[0] || null;
}

async function create({ email, passwordHash, role }) {
  const { rows } = await pool.query(
    "INSERT INTO users (email, password, role, status, created_at, updated_at) VALUES ($1, $2, $3, 'Active', NOW(), NOW()) RETURNING id, email, role, status, created_at",
    [email, passwordHash, role]
  );
  return rows[0];
}

module.exports = { findByEmail, findById, create };
