const { pool } = require('../config/db');

const HolidayRH = {
  async getAll() {
    const result = await pool.query('SELECT * FROM holidayrhs ORDER BY year DESC, "start" ASC, id DESC');
    return result.rows;
  },

  // Return holiday/rh rows that are either global (department_id IS NULL)
  // or explicitly assigned to the given department. If the column
  // `department_id` does not exist in the schema, fall back to global list.
  async getAllForDepartment(departmentId) {
    if (!departmentId) return this.getAll();
    try {
      const q = 'SELECT * FROM holidayrhs WHERE department_id IS NULL OR department_id = $1 ORDER BY year DESC, "start" ASC, id DESC';
      const result = await pool.query(q, [departmentId]);
      return result.rows;
    } catch (err) {
      if (/column "department_id"|department_id/i.test(String(err.message || ''))) {
        return this.getAll();
      }
      throw err;
    }
  },

  async getById(id) {
    const result = await pool.query('SELECT * FROM holidayrhs WHERE id = $1', [id]);
    return result.rows[0];
  },

  async create(data) {
    const q = `INSERT INTO holidayrhs (id, year, title, "start", day, type, created_at, updated_at)
      VALUES ((SELECT COALESCE(MAX(id), 0) + 1 FROM holidayrhs), $1, $2, $3, $4, $5, NOW(), NOW()) RETURNING *`;
    const values = [
      data.year,
      data.title,
      data.start,
      data.day,
      data.type,
    ];
    const result = await pool.query(q, values);
    return result.rows[0];
  },

  async update(id, data) {
    const q = `UPDATE holidayrhs
      SET year = $1,
          title = $2,
          "start" = $3,
          day = $4,
          type = $5,
          updated_at = NOW()
      WHERE id = $6
      RETURNING *`;
    const values = [
      data.year,
      data.title,
      data.start,
      data.day,
      data.type,
      id,
    ];
    const result = await pool.query(q, values);
    return result.rows[0];
  },

  async delete(id) {
    await pool.query('DELETE FROM holidayrhs WHERE id = $1', [id]);
    return { id };
  },
};

module.exports = HolidayRH;
