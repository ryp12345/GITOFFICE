const { pool } = require('../config/db');

const StaffQualification = {
  async getAllByStaffId(staffId) {
    const result = await pool.query(
      `SELECT qs.*, q.qual_name FROM qualification_staff qs
       JOIN qualifications q ON qs.qualification_id = q.id
       WHERE qs.staff_id = $1 ORDER BY qs.yop DESC`,
      [staffId]
    );
    return result.rows;
  },

  async create(staffId, data) {
    const q = `INSERT INTO qualification_staff
      (qualification_id, staff_id, board_university, grade, yop, status, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW()) RETURNING *`;
    const values = [
      data.qualification_id,
      staffId,
      data.board_university,
      data.grade,
      data.yop,
      data.status,
    ];
    const result = await pool.query(q, values);
    return result.rows[0];
  },

  async update(id, data) {
    const q = `UPDATE qualification_staff SET
      qualification_id=$1, board_university=$2, grade=$3, yop=$4, status=$5, updated_at=NOW()
      WHERE id=$6 RETURNING *`;
    const values = [
      data.qualification_id,
      data.board_university,
      data.grade,
      data.yop,
      data.status,
      id,
    ];
    const result = await pool.query(q, values);
    return result.rows[0];
  },

  async delete(id) {
    await pool.query('DELETE FROM qualification_staff WHERE id = $1', [id]);
    return { id };
  },
};

module.exports = StaffQualification;
