const { pool } = require('../config/db');

const Religion = {
  async getAll() {
    const result = await pool.query('SELECT * FROM religions ORDER BY id DESC');
    return result.rows;
  },

  async getById(id) {
    const result = await pool.query('SELECT * FROM religions WHERE id = $1', [id]);
    return result.rows[0];
  },

  async create(data) {
    const q = `INSERT INTO religions (religion_name, status, created_at, updated_at)
      VALUES ($1, $2, NOW(), NOW()) RETURNING *`;
    const values = [
      data.religion_name,
      data.status,
    ];

    try {
      const result = await pool.query(q, values);
      return result.rows[0];
    } catch (error) {
      if (error?.code === '23505' && error?.constraint === 'religions_pkey') {
        await pool.query(
          `SELECT setval(
            pg_get_serial_sequence('religions', 'id'),
            COALESCE((SELECT MAX(id) FROM religions), 0) + 1,
            false
          )`
        );

        const result = await pool.query(q, values);
        return result.rows[0];
      }

      throw error;
    }
  },

  async update(id, data) {
    const q = `UPDATE religions
      SET religion_name=$1, status=$2, updated_at=NOW()
      WHERE id=$3 RETURNING *`;
    const values = [
      data.religion_name,
      data.status,
      id,
    ];
    const result = await pool.query(q, values);
    return result.rows[0];
  },

  async delete(id) {
    await pool.query('DELETE FROM religions WHERE id = $1', [id]);
    return { id };
  },
};

module.exports = Religion;
