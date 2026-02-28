const { pool } = require('../config/db');

const Qualification = {
  async getAll() {
    const result = await pool.query('SELECT * FROM qualifications ORDER BY id DESC');
    return result.rows;
  },

  async getById(id) {
    const result = await pool.query('SELECT * FROM qualifications WHERE id = $1', [id]);
    return result.rows[0];
  },

  async create(data) {
    const q = `INSERT INTO qualifications (qual_name, qual_shortname, status, created_at, updated_at)
      VALUES ($1, $2, $3, NOW(), NOW()) RETURNING *`;
    const values = [
      data.qual_name,
      data.qual_shortname,
      data.status,
    ];

    try {
      const result = await pool.query(q, values);
      return result.rows[0];
    } catch (error) {
      if (error?.code === '23505' && error?.constraint === 'qualifications_pkey') {
        await pool.query(
          `SELECT setval(
            pg_get_serial_sequence('qualifications', 'id'),
            COALESCE((SELECT MAX(id) FROM qualifications), 0) + 1,
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
    const q = `UPDATE qualifications
      SET qual_name=$1, qual_shortname=$2, status=$3, updated_at=NOW()
      WHERE id=$4 RETURNING *`;
    const values = [
      data.qual_name,
      data.qual_shortname,
      data.status,
      id,
    ];
    const result = await pool.query(q, values);
    return result.rows[0];
  },

  async delete(id) {
    await pool.query('DELETE FROM qualifications WHERE id = $1', [id]);
    return { id };
  },
};

module.exports = Qualification;
