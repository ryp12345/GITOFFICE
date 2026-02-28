// Model for leaves table
const { pool } = require('../config/db');

const Leave = {
  async getAll() {
    const result = await pool.query('SELECT * FROM leaves ORDER BY id DESC');
    return result.rows;
  },
  async getById(id) {
    const result = await pool.query('SELECT * FROM leaves WHERE id = $1', [id]);
    return result.rows[0];
  },
  async create(data) {
    const q = `INSERT INTO leaves (longname, shortname, max_entitlement, min_days, max_days, vacation_type, applicable_to, leave_wef, leave_end_date, status, created_at, updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW(),NOW()) RETURNING *`;
    const values = [
      data.longname,
      data.shortname,
      data.max_entitlement,
      data.min_days,
      data.max_days,
      data.vacation_type,
      data.applicable_to,
      data.leave_wef,
      data.leave_end_date,
      data.status
    ];
    const result = await pool.query(q, values);
    return result.rows[0];
  },
  async update(id, data) {
    const q = `UPDATE leaves SET longname=$1, shortname=$2, max_entitlement=$3, min_days=$4, max_days=$5, vacation_type=$6, applicable_to=$7, leave_wef=$8, leave_end_date=$9, status=$10, updated_at=NOW() WHERE id=$11 RETURNING *`;
    const values = [
      data.longname,
      data.shortname,
      data.max_entitlement,
      data.min_days,
      data.max_days,
      data.vacation_type,
      data.applicable_to,
      data.leave_wef,
      data.leave_end_date,
      data.status,
      id
    ];
    const result = await pool.query(q, values);
    return result.rows[0];
  },
  async delete(id) {
    await pool.query('DELETE FROM leaves WHERE id = $1', [id]);
    return { id };
  }
};

module.exports = Leave;
