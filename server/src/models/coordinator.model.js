const { pool } = require('../config/db');

async function findAll() {
  const { rows } = await pool.query(
    'SELECT id, name, employee_type FROM coordinators ORDER BY id DESC'
  );
  return rows;
}

async function findById(id) {
  const { rows } = await pool.query(
    'SELECT id, name, employee_type FROM coordinators WHERE id = $1 LIMIT 1',
    [id]
  );
  return rows[0] || null;
}

async function create({ name, employee_type }) {
  const { rows } = await pool.query(
    'INSERT INTO coordinators (name, employee_type) VALUES ($1, $2) RETURNING id, name, employee_type',
    [name, employee_type]
  );
  return rows[0];
}

async function update(id, { name, employee_type }) {
  const fields = [];
  const values = [];
  let idx = 1;

  if (name !== undefined) {
    fields.push(`name = $${idx++}`);
    values.push(name);
  }
  if (employee_type !== undefined) {
    fields.push(`employee_type = $${idx++}`);
    values.push(employee_type);
  }

  if (fields.length === 0) return findById(id);

  const sql = `UPDATE coordinators SET ${fields.join(', ')} WHERE id = $${idx} RETURNING id, name, employee_type`;
  values.push(id);

  const { rows } = await pool.query(sql, values);
  return rows[0] || null;
}

async function remove(id) {
  await pool.query('DELETE FROM coordinators WHERE id = $1', [id]);
  return true;
}

module.exports = { findAll, findById, create, update, remove };
