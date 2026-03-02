const { pool } = require('../config/db');

async function findAll() {
  const { rows } = await pool.query(
    'SELECT id, user_id, fname, mname, lname, local_address, permanent_address, dob, doj, religion_id, castecategory_id, gender, date_of_increment, date_of_superanuation, created_at, updated_at FROM staff ORDER BY created_at DESC, id DESC'
  );
  return rows;
}

async function findById(id) {
  const { rows } = await pool.query(
    'SELECT id, user_id, fname, mname, lname, local_address, permanent_address, dob, doj, religion_id, castecategory_id, gender, date_of_increment, date_of_superanuation, created_at, updated_at FROM staff WHERE id = $1 LIMIT 1',
    [id]
  );
  return rows[0] || null;
}

async function create(payload) {
  const fields = [
    'user_id',
    'fname',
    'mname',
    'lname',
    'local_address',
    'permanent_address',
    'dob',
    'doj',
    'religion_id',
    'castecategory_id',
    'gender',
    'date_of_superanuation',
    'bloodgroup',
    'pan_card',
    'adhar_card',
    'contactno',
    'emergency_no',
    'emergency_name'
  ];

  const values = [];
  const placeholders = [];
  let idx = 1;
  for (const f of fields) {
    if (payload[f] !== undefined) {
      values.push(payload[f]);
      placeholders.push(`$${idx++}`);
    } else {
      values.push(null);
      placeholders.push(`$${idx++}`);
    }
  }

  const sql = `INSERT INTO staff (${fields.join(', ')}, created_at, updated_at) VALUES (${placeholders.join(', ')}, NOW(), NOW()) RETURNING id, user_id, fname, mname, lname, created_at`;
  const { rows } = await pool.query(sql, values);
  return rows[0];
}

module.exports = { findAll, findById, create };
