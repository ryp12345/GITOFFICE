const { pool } = require('../../config/db');

async function findAll() {
  const { rows } = await pool.query(
    `SELECT id, scheme_name, status, created_at, updated_at
     FROM schemes
     ORDER BY id ASC`
  );
  return rows;
}

async function findById(id) {
  const { rows } = await pool.query(
    `SELECT id, scheme_name, status, created_at, updated_at
     FROM schemes
     WHERE id = $1
     LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

async function create({ scheme_name, status = 'active' }) {
  const { rows } = await pool.query(
    `INSERT INTO schemes (scheme_name, status, created_at, updated_at)
     VALUES ($1, $2, NOW(), NOW())
     RETURNING id, scheme_name, status, created_at, updated_at`,
    [scheme_name, status]
  );
  return rows[0];
}

async function update(id, { scheme_name, status }) {
  const updates = [];
  const values = [];
  let idx = 1;

  if (scheme_name !== undefined) {
    updates.push(`scheme_name = $${idx++}`);
    values.push(scheme_name);
  }
  if (status !== undefined) {
    updates.push(`status = $${idx++}`);
    values.push(status);
  }

  if (updates.length === 0) {
    return findById(id);
  }

  values.push(id);
  const { rows } = await pool.query(
    `UPDATE schemes SET ${updates.join(', ')}, updated_at = NOW()
     WHERE id = $${idx}
     RETURNING id, scheme_name, status, created_at, updated_at`,
    values
  );
  return rows[0] || null;
}

async function remove(id) {
  const { rows } = await pool.query(
    `UPDATE schemes SET status = 'inactive', updated_at = NOW()
     WHERE id = $1
     RETURNING id, scheme_name, status`,
    [id]
  );
  return rows[0] || null;
}

module.exports = {
  findAll,
  findById,
  create,
  update,
  remove,
};
