const { pool } = require('../config/db');

async function findAll() {
  const { rows } = await pool.query(
    'SELECT id, name, acronym, created_at, updated_at FROM institutions ORDER BY created_at DESC, id DESC'
  );
  return rows;
}

async function findById(id) {
  const { rows } = await pool.query(
    'SELECT id, name, acronym, created_at, updated_at FROM institutions WHERE id = $1 LIMIT 1',
    [id]
  );
  return rows[0] || null;
}

async function create({ name, acronym }) {
  const insertSql =
    'INSERT INTO institutions (name, acronym, created_at, updated_at) VALUES ($1, $2, NOW(), NOW()) RETURNING id, name, acronym, created_at, updated_at';

  try {
    const { rows } = await pool.query(insertSql, [name, acronym]);
    return rows[0];
  } catch (error) {
    if (error?.code === '23505' && error?.constraint === 'institutions_pkey') {
      await pool.query(
        `SELECT setval(
          pg_get_serial_sequence('institutions', 'id'),
          COALESCE((SELECT MAX(id) FROM institutions), 0) + 1,
          false
        )`
      );

      const { rows } = await pool.query(insertSql, [name, acronym]);
      return rows[0];
    }

    throw error;
  }
}

async function update(id, { name, acronym }) {
  const fields = [];
  const values = [];
  let idx = 1;

  if (name !== undefined) {
    fields.push(`name = $${idx++}`);
    values.push(name);
  }
  if (acronym !== undefined) {
    fields.push(`acronym = $${idx++}`);
    values.push(acronym);
  }

  if (fields.length === 0) {
    return findById(id);
  }

  fields.push('updated_at = NOW()');
  values.push(id);

  const { rows } = await pool.query(
    `UPDATE institutions SET ${fields.join(', ')} WHERE id = $${idx} RETURNING id, name, acronym, created_at, updated_at`,
    values
  );

  return rows[0] || null;
}

async function remove(id) {
  await pool.query('DELETE FROM institutions WHERE id = $1', [id]);
  return true;
}

module.exports = { findAll, findById, create, update, remove };
