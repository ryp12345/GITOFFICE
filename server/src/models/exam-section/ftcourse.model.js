const { pool } = require('../../config/db');

async function findAll() {
  const { rows } = await pool.query(
    `SELECT id, course_type, is_remunerated, created_at, updated_at
     FROM ftcourses
     ORDER BY id ASC`
  );
  return rows;
}

async function findById(id) {
  const { rows } = await pool.query(
    `SELECT id, course_type, is_remunerated, created_at, updated_at
     FROM ftcourses
     WHERE id = $1
     LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

async function create({ course_type, is_remunerated = 'Yes' }) {
  const { rows } = await pool.query(
    `INSERT INTO ftcourses (course_type, is_remunerated, created_at, updated_at)
     VALUES ($1, $2, NOW(), NOW())
     RETURNING id, course_type, is_remunerated, created_at, updated_at`,
    [course_type, is_remunerated]
  );
  return rows[0];
}

async function update(id, { course_type, is_remunerated }) {
  const updates = [];
  const values = [];
  let idx = 1;

  if (course_type !== undefined) {
    updates.push(`course_type = $${idx++}`);
    values.push(course_type);
  }
  if (is_remunerated !== undefined) {
    updates.push(`is_remunerated = $${idx++}`);
    values.push(is_remunerated);
  }

  if (updates.length === 0) {
    return findById(id);
  }

  values.push(id);
  const { rows } = await pool.query(
    `UPDATE ftcourses SET ${updates.join(', ')}, updated_at = NOW()
     WHERE id = $${idx}
     RETURNING id, course_type, is_remunerated, created_at, updated_at`,
    values
  );
  return rows[0] || null;
}

async function remove(id) {
  const { rows } = await pool.query(
    `DELETE FROM ftcourses
     WHERE id = $1
     RETURNING id, course_type, is_remunerated`,
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
