const { pool } = require('../config/db');

const CasteCategory = {
  async getAll(religionId) {
    let query = 'SELECT * FROM castecategories';
    let params = [];
    if (religionId) {
      query += ' WHERE religion_id = $1';
      params = [religionId];
    }
    const result = await pool.query(query, params);
    return result.rows;
  },

  async getById(id) {
    const result = await pool.query('SELECT * FROM castecategories WHERE id = $1', [id]);
    return result.rows[0];
  },

  async create(data) {
    const q = `INSERT INTO castecategories (caste_name, religion_id, subcastes_name, category, category_no, status, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW()) RETURNING *`;
    const values = [
      data.caste_name,
      data.religion_id,
      data.subcastes_name,
      data.category,
      data.category_no,
      data.status,
    ];
    try {
      const result = await pool.query(q, values);
      return result.rows[0];
    } catch (error) {
      if (error?.code === '23505' && error?.constraint === 'castecategories_pkey') {
        await pool.query(
          `SELECT setval(
            pg_get_serial_sequence('castecategories', 'id'),
            COALESCE((SELECT MAX(id) FROM castecategories), 0) + 1,
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
    const q = `UPDATE castecategories
      SET caste_name=$1, religion_id=$2, subcastes_name=$3, category=$4, category_no=$5, status=$6, updated_at=NOW()
      WHERE id=$7 RETURNING *`;
    const values = [
      data.caste_name,
      data.religion_id,
      data.subcastes_name,
      data.category,
      data.category_no,
      data.status,
      id,
    ];
    const result = await pool.query(q, values);
    return result.rows[0];
  },

  async delete(id) {
    await pool.query('DELETE FROM castecategories WHERE id = $1', [id]);
    return { id };
  },
};

module.exports = CasteCategory;