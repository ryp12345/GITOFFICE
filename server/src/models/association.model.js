const { pool } = require('../config/db');

async function findAll() {
  const { rows } = await pool.query('SELECT id, asso_name, category, status, created_at, updated_at FROM associations ORDER BY created_at DESC, id DESC');
  return rows;
}

async function findById(id) {
  const { rows } = await pool.query('SELECT id, asso_name, category, status, created_at, updated_at FROM associations WHERE id = $1 LIMIT 1', [id]);
  return rows[0] || null;
}

async function create({ asso_name, category = 'Associated', status = 'active' }) {
  const { rows } = await pool.query(
    'INSERT INTO associations (asso_name, category, status, created_at, updated_at) VALUES ($1, $2, $3, NOW(), NOW()) RETURNING id, asso_name, category, status, created_at, updated_at',
    [asso_name, category, status]
  );
  return rows[0];
}

async function update(id, { asso_name, category, status }) {
  const fields = [];
  const values = [];
  let idx = 1;
  if (asso_name !== undefined) {
    fields.push(`asso_name = $${idx++}`);
    values.push(asso_name);
  }
  if (category !== undefined) {
    fields.push(`category = $${idx++}`);
    values.push(category);
  }
  if (status !== undefined) {
    fields.push(`status = $${idx++}`);
    values.push(status);
  }
  if (fields.length === 0) return findById(id);
  // updated_at
  fields.push(`updated_at = NOW()`);

  const sql = `UPDATE associations SET ${fields.join(', ')} WHERE id = $${idx} RETURNING id, asso_name, category, status, created_at, updated_at`;
  values.push(id);
  const { rows } = await pool.query(sql, values);
  return rows[0] || null;
}

async function remove(id) {
  await pool.query('DELETE FROM associations WHERE id = $1', [id]);
  return true;
}

module.exports = { findAll, findById, create, update, remove };
