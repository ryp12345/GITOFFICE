const { pool } = require('../config/db');

const Designation = {
  async getAll() {
    const { rows } = await pool.query('SELECT * FROM designations ORDER BY id DESC');
    return rows;
  },
  async getById(id) {
    const { rows } = await pool.query('SELECT * FROM designations WHERE id = $1', [id]);
    return rows[0];
  },
  async create(data) {
    const q = `INSERT INTO designations (design_name, isadditional, isvacational, leave_authorizer, emp_type, status, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW()) RETURNING *`;
    const values = [
      data.design_name,
      data.isadditional,
      data.isvacational,
      data.leave_authorizer,
      data.emp_type,
      data.status,
    ];

    try {
      const { rows } = await pool.query(q, values);
      return rows[0];
    } catch (error) {
      if (error?.code === '23505' && error?.constraint === 'designations_pkey') {
        await pool.query(
          `SELECT setval(
            pg_get_serial_sequence('designations', 'id'),
            COALESCE((SELECT MAX(id) FROM designations), 0) + 1,
            false
          )`
        );

        const { rows } = await pool.query(q, values);
        return rows[0];
      }

      throw error;
    }
  },
  async update(id, data) {
    const q = `UPDATE designations SET design_name=$1, isadditional=$2, isvacational=$3, leave_authorizer=$4, emp_type=$5, status=$6, updated_at=NOW() WHERE id=$7 RETURNING *`;
    const values = [
      data.design_name,
      data.isadditional,
      data.isvacational,
      data.leave_authorizer,
      data.emp_type,
      data.status,
      id,
    ];
    const { rows } = await pool.query(q, values);
    return rows[0];
  },
  async delete(id) {
    await pool.query('DELETE FROM designations WHERE id = $1', [id]);
    return true;
  },
};

module.exports = Designation;
