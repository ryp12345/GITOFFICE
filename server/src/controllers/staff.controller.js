const staffService = require('../services/staff.service');
const userModel = require('../models/user.model');
const Designation = require('../models/designation.model');
const CasteCategory = require('../models/castecategory.model');
const { pool } = require('../config/db');

async function checkEmail(req, res, next) {
  try {
    const current = String(req.query.current_email || '').trim();
    if (!current) return res.json([]);
    const email = current.includes('@') ? current : `${current}@git.edu`;
    const found = await userModel.findByEmail(email);
    if (!found) return res.json([]);
    return res.json([found]);
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const payload = req.body || {};
    // Basic server-side validation (fail fast)
    const required = [
      'fname', 'lname', 'employee_type', 'emailUser', 'biometric_code',
      'departments_id', 'associations_id', 'institution_id', 'designations_id',
      'religion_id', 'castecategory_id', 'gender', 'dob', 'doj', 'local_address', 'permanent_address', 'pay_type'
    ];
    const missing = required.filter((k) => !payload[k] && payload[k] !== 0);
    if (missing.length) {
      return res.status(400).json({ success: false, error: `Missing fields: ${missing.join(', ')}` });
    }
    // normalize email
    if (payload.emailUser && !payload.email) {
      payload.email = `${String(payload.emailUser).trim()}@git.edu`;
    }
    const data = await staffService.create(payload);
    res.status(201).json({ success: true, data });
  } catch (err) {
    // Friendly handling for Postgres unique/duplicate-key errors
    if (err && err.code === '23505') {
      return res.status(409).json({ success: false, message: 'Duplicate key error (unique constraint). Please reset the users sequence or check existing users.' });
    }
    next(err);
  }
}

async function getDesignationsByEmployeeType(req, res, next) {
  try {
    const empType = String(req.query.employee_type || '').trim();
    if (!empType) return res.json([]);
    const rows = await pool.query('SELECT * FROM designations WHERE emp_type = $1 AND status = $2 ORDER BY id', [empType, 'active']);
    return res.json(rows.rows);
  } catch (err) {
    next(err);
  }
}

async function getCasteCategoriesByReligion(req, res, next) {
  try {
    const rId = req.query.r_id || req.query.religion_id || null;
    const rows = await CasteCategory.getAll(rId);
    return res.json(rows);
  } catch (err) {
    next(err);
  }
}

async function getStaffPayList(req, res, next) {
  try {
    const pay_type = String(req.query.pay_type || '').trim();
    const emp_type = String(req.query.emp_type || '').trim();
    const designation_id = req.query.designation_id || null;

    // Teaching payscales
    if (pay_type === 'Payscale' && emp_type === 'Teaching') {
      const q = 'SELECT id, payscale_title, basepay, maxpay, wef FROM teaching_payscales WHERE status = $1' + (designation_id ? ' AND designations_id = $2' : '');
      const params = designation_id ? ['active', designation_id] : ['active'];
      const { rows } = await pool.query(q, params);
      return res.json(rows);
    }

    // Non-teaching payscales
    if (pay_type === 'Payscale' && emp_type === 'Non-Teaching') {
      const { rows } = await pool.query('SELECT id, title, payband, wef FROM ntpayscales WHERE status = $1', ['active']);
      return res.json(rows);
    }

    // Consolidated / other -> return ntc payscales
    if (pay_type === 'Consolidated') {
      const { rows } = await pool.query('SELECT id, basepay, allowance, year, wef, gcr FROM ntcpayscales WHERE status = $1', ['active']);
      return res.json(rows);
    }

    return res.json([]);
  } catch (err) {
    next(err);
  }
}

async function list(req, res, next) {
  try {
    const data = await staffService.listAll();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ success: false, message: 'Invalid id' });
    const data = await staffService.remove(id);
    if (!data) return res.status(404).json({ success: false, message: 'Staff not found' });
    return res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ success: false, message: 'Invalid id' });
    const data = await staffService.getById(id);
    if (!data) return res.status(404).json({ success: false, message: 'Staff not found' });
    return res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ success: false, message: 'Invalid id' });
    const payload = req.body || {};
    const data = await staffService.updateById(id, payload);
    if (!data) return res.status(404).json({ success: false, message: 'Staff not found' });
    return res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  checkEmail,
  create,
  list,
  remove,
  getDesignationsByEmployeeType,
  getCasteCategoriesByReligion,
  getStaffPayList,
  getById,
  update,
};
