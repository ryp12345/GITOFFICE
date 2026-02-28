const { pool } = require('../config/db');

const LeaveRules = {
  async getAll(leave_id) {
    const result = await pool.query('SELECT * FROM leave_rules WHERE leave_id = $1 ORDER BY id DESC', [leave_id]);
    return result.rows;
  },
  async getById(id) {
    const result = await pool.query('SELECT * FROM leave_rules WHERE id = $1', [id]);
    return result.rows[0];
  },
  async create(data) {
    const q = `INSERT INTO leave_rules (leave_id, carry_forwardable, cf_gcr, cf_wef, cf_closing_date, cf_closing_gcr, max_cf, entitlement_post_max_cf, encashable, enc_gcr, enc_wef, enc_closing_date, enc_closing_gcr, max_enc, gap, gap_gcr, gap_wef, gap_closing_date, gap_closing_gcr, min_gap, max_time_allowed, period, prior_intimation_days, status, created_at, updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,NOW(),NOW()) RETURNING *`;
    const values = [
      data.leave_id,
      data.carry_forwardable,
      data.cf_gcr,
      data.cf_wef,
      data.cf_closing_date,
      data.cf_closing_gcr,
      data.max_cf,
      data.entitlement_post_max_cf,
      data.encashable,
      data.enc_gcr,
      data.enc_wef,
      data.enc_closing_date,
      data.enc_closing_gcr,
      data.max_enc,
      data.gap,
      data.gap_gcr,
      data.gap_wef,
      data.gap_closing_date,
      data.gap_closing_gcr,
      data.min_gap,
      data.max_time_allowed,
      data.period,
      data.prior_intimation_days,
      data.status
    ];
    const result = await pool.query(q, values);
    return result.rows[0];
  },
  async update(id, data) {
    const q = `UPDATE leave_rules SET leave_id=$1, carry_forwardable=$2, cf_gcr=$3, cf_wef=$4, cf_closing_date=$5, cf_closing_gcr=$6, max_cf=$7, entitlement_post_max_cf=$8, encashable=$9, enc_gcr=$10, enc_wef=$11, enc_closing_date=$12, enc_closing_gcr=$13, max_enc=$14, gap=$15, gap_gcr=$16, gap_wef=$17, gap_closing_date=$18, gap_closing_gcr=$19, min_gap=$20, max_time_allowed=$21, period=$22, prior_intimation_days=$23, status=$24, updated_at=NOW() WHERE id=$25 RETURNING *`;
    const values = [
      data.leave_id,
      data.carry_forwardable,
      data.cf_gcr,
      data.cf_wef,
      data.cf_closing_date,
      data.cf_closing_gcr,
      data.max_cf,
      data.entitlement_post_max_cf,
      data.encashable,
      data.enc_gcr,
      data.enc_wef,
      data.enc_closing_date,
      data.enc_closing_gcr,
      data.max_enc,
      data.gap,
      data.gap_gcr,
      data.gap_wef,
      data.gap_closing_date,
      data.gap_closing_gcr,
      data.min_gap,
      data.max_time_allowed,
      data.period,
      data.prior_intimation_days,
      data.status,
      id
    ];
    const result = await pool.query(q, values);
    return result.rows[0];
  },
  async delete(id) {
    await pool.query('DELETE FROM leave_rules WHERE id = $1', [id]);
    return { id };
  }
};

module.exports = LeaveRules;
