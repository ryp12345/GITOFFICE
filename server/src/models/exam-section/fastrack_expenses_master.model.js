const { pool } = require('../../config/db');

async function findAll() {
  const { rows } = await pool.query(
    `SELECT id, title, created_at, updated_at FROM fastrack_expenses_master ORDER BY id ASC`
  );
  return rows;
}

async function findById(id) {
  const { rows } = await pool.query(
    `SELECT id, title, created_at, updated_at FROM fastrack_expenses_master WHERE id = $1 LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

async function create({ title }) {
  const { rows } = await pool.query(
    `INSERT INTO fastrack_expenses_master (title, created_at, updated_at) VALUES ($1, NOW(), NOW()) RETURNING id, title, created_at, updated_at`,
    [title]
  );
  return rows[0];
}

async function update(id, { title }) {
  const { rows } = await pool.query(
    `UPDATE fastrack_expenses_master SET title = $1, updated_at = NOW() WHERE id = $2 RETURNING id, title, created_at, updated_at`,
    [title, id]
  );
  return rows[0] || null;
}

async function remove(id) {
  const { rows } = await pool.query(
    `DELETE FROM fastrack_expenses_master WHERE id = $1 RETURNING id, title`,
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
