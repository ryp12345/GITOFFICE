const { pool } = require('../config/db');

async function findAll() {
  const { rows } = await pool.query('SELECT id, dept_name, dept_shortname, yoe, status, created_at, updated_at FROM departments ORDER BY created_at DESC, id DESC');
  return rows;
}

async function findById(id) {
  const { rows } = await pool.query('SELECT id, dept_name, dept_shortname, yoe, status, created_at, updated_at FROM departments WHERE id = $1 LIMIT 1', [id]);
  return rows[0] || null;
}

async function create({ dept_name, dept_shortname, yoe, status = 'active' }) {
  const { rows } = await pool.query(
    'INSERT INTO departments (dept_name, dept_shortname, yoe, status, created_at, updated_at) VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING id, dept_name, dept_shortname, yoe, status, created_at, updated_at',
    [dept_name, dept_shortname, yoe, status]
  );
  return rows[0];
}

async function update(id, { dept_name, dept_shortname, yoe, status }) {
  const fields = [];
  const values = [];
  let idx = 1;
  if (dept_name !== undefined) {
    fields.push(`dept_name = $${idx++}`);
    values.push(dept_name);
  }
  if (dept_shortname !== undefined) {
    fields.push(`dept_shortname = $${idx++}`);
    values.push(dept_shortname);
  }
  if (yoe !== undefined) {
    fields.push(`yoe = $${idx++}`);
    values.push(yoe);
  }
  if (status !== undefined) {
    fields.push(`status = $${idx++}`);
    values.push(status);
  }
  if (fields.length === 0) return findById(id);
  fields.push(`updated_at = NOW()`);
  const sql = `UPDATE departments SET ${fields.join(', ')} WHERE id = $${idx} RETURNING id, dept_name, dept_shortname, yoe, status, created_at, updated_at`;
  values.push(id);
  const { rows } = await pool.query(sql, values);
  return rows[0] || null;
}

async function remove(id) {
  await pool.query('DELETE FROM departments WHERE id = $1', [id]);
  return true;
}

module.exports = { findAll, findById, create, update, remove };
