const staffService = require('../../services/staff.service');

async function listTaxRegimes(req, res, next) {
  try {
    const staffId = parseInt(req.params.id, 10);
    if (!staffId) return res.status(400).json({ success: false, message: 'Invalid staff id' });
    const data = await staffService.listTaxRegimesByStaffId(staffId);
    return res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function listTaxRegimeHeads(_req, res, next) {
  try {
    const data = await staffService.listTaxRegimeHeads();
    return res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function createTaxRegime(req, res) {
  try {
    const staffId = parseInt(req.params.id, 10);
    if (!staffId) return res.status(400).json({ success: false, message: 'Invalid staff id' });
    const payload = req.body || {};
    const data = await staffService.createTaxRegimeForStaff(staffId, payload);
    return res.status(201).json({ success: true, data });
  } catch (err) {
    const status = err.statusCode || 500;
    return res.status(status).json({ success: false, message: err.message || 'Failed to create tax regime' });
  }
}

async function updateTaxRegime(req, res) {
  try {
    const staffId = parseInt(req.params.id, 10);
    const regimeRowId = parseInt(req.params.regimeRowId, 10);
    if (!staffId || !regimeRowId) {
      return res.status(400).json({ success: false, message: 'Invalid id' });
    }
    const payload = req.body || {};
    const data = await staffService.updateTaxRegimeForStaff(staffId, regimeRowId, payload);
    return res.json({ success: true, data });
  } catch (err) {
    const status = err.statusCode || 500;
    return res.status(status).json({ success: false, message: err.message || 'Failed to update tax regime' });
  }
}

async function deleteTaxRegime(req, res, next) {
  try {
    const staffId = parseInt(req.params.id, 10);
    const regimeRowId = parseInt(req.params.regimeRowId, 10);
    if (!staffId || !regimeRowId) {
      return res.status(400).json({ success: false, message: 'Invalid id' });
    }

    const deleted = await staffService.deleteTaxRegimeForStaff(staffId, regimeRowId);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Tax regime record not found' });
    }
    return res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listTaxRegimes,
  listTaxRegimeHeads,
  createTaxRegime,
  updateTaxRegime,
  deleteTaxRegime,
};
