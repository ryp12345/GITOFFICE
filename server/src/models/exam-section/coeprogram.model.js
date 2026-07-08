const { pool } = require('../../config/db');

async function findAll() {
  const { rows } = await pool.query(
    `SELECT p.id, p.program_name, p.program_code, p.start_date, p.close_date,
            p.department_id, p.type, p.program_intake, d.dept_name
     FROM programs p
     LEFT JOIN departments d ON d.id = p.department_id
     ORDER BY p.id DESC`
  );
  return rows;
}

async function findById(id) {
  const { rows } = await pool.query(
    `SELECT id, program_name, program_code, start_date, close_date, department_id, type, program_intake
     FROM programs WHERE id = $1 LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

async function findDepartments() {
  const { rows } = await pool.query(
    `SELECT id, dept_name, dept_shortname FROM departments WHERE status = 'active' ORDER BY dept_name ASC`
  );
  return rows;
}

async function create({ program_name, program_code, start_date, close_date, department_id, type, program_intake }) {
  const { rows } = await pool.query(
    `INSERT INTO programs (program_name, program_code, start_date, close_date, department_id, type, program_intake, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
     RETURNING id, program_name, program_code, start_date, close_date, department_id, type, program_intake`,
    [program_name, program_code, start_date || null, close_date || null, department_id || null, type, program_intake]
  );
  return rows[0];
}

async function update(id, payload) {
  const fields = ['program_name', 'program_code', 'start_date', 'close_date', 'department_id', 'type', 'program_intake'];
  const updates = [];
  const values = [];
  let idx = 1;
  for (const f of fields) {
    if (payload[f] !== undefined && payload[f] !== null) {
      updates.push(`${f} = $${idx++}`);
      values.push(payload[f]);
    }
  }
  if (updates.length === 0) {
    return findById(id);
  }
  values.push(id);
  const { rows } = await pool.query(
    `UPDATE programs SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${idx}
     RETURNING id, program_name, program_code, start_date, close_date, department_id, type, program_intake`,
    values
  );
  return rows[0] || null;
}

async function remove(id) {
  const { rows } = await pool.query(`DELETE FROM programs WHERE id = $1 RETURNING id`, [id]);
  return rows[0] || null;
}

module.exports = {
  findAll,
  findById,
  findDepartments,
  create,
  update,
  remove,
};