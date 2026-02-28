const { pool } = require('../config/db');

const HolidayRH = {
  async getAll() {
    const result = await pool.query('SELECT * FROM holidayrhs ORDER BY year DESC, "start" ASC, id DESC');
    return result.rows;
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
