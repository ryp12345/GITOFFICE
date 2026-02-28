const { pool } = require('../config/db');

const RemunerationHead = {
  async getAll() {
    const result = await pool.query('SELECT * FROM remunerationheads ORDER BY id DESC');
    return result.rows;
  },

  async getById(id) {
    const result = await pool.query('SELECT * FROM remunerationheads WHERE id = $1', [id]);
    return result.rows[0];
  },

  async create(data) {
    const q = `INSERT INTO remunerationheads (remuneration_head, created_at, updated_at)
      VALUES ($1, NOW(), NOW()) RETURNING *`;
    const values = [data.remuneration_head];
    try {
      const result = await pool.query(q, values);
      return result.rows[0];
    } catch (error) {
      if (error?.code === '23505' && error?.constraint === 'remunerationheads_pkey') {
        await pool.query(
          `SELECT setval(
            pg_get_serial_sequence('remunerationheads', 'id'),
            COALESCE((SELECT MAX(id) FROM remunerationheads), 0) + 1,
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
    const q = `UPDATE remunerationheads
      SET remuneration_head=$1, updated_at=NOW()
      WHERE id=$2 RETURNING *`;
    const values = [data.remuneration_head, id];
    const result = await pool.query(q, values);
    return result.rows[0];
  },

  async delete(id) {
    await pool.query('DELETE FROM remunerationheads WHERE id = $1', [id]);
    return { id };
  },
};

module.exports = RemunerationHead;