const staffService = require('../../services/staff.service');

async function listLics(req, res, next) {
  try {
    const staffId = parseInt(req.params.id, 10);
    if (!staffId) return res.status(400).json({ success: false, message: 'Invalid staff id' });
    const data = await staffService.listLicsByStaffId(staffId);
    return res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function createLic(req, res) {
  try {
    const staffId = parseInt(req.params.id, 10);
    if (!staffId) return res.status(400).json({ success: false, message: 'Invalid staff id' });
    const data = await staffService.createLicForStaff(staffId, req.body || {});
    return res.status(201).json({ success: true, data });
  } catch (err) {
    return res.status(err.statusCode || 500).json({ success: false, message: err.message || 'Failed to create LIC' });
  }
}

async function updateLic(req, res) {
  try {
    const staffId = parseInt(req.params.id, 10);
    const licId = parseInt(req.params.licId, 10);
    if (!staffId || !licId) return res.status(400).json({ success: false, message: 'Invalid id' });
    const data = await staffService.updateLicForStaff(staffId, licId, req.body || {});
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(err.statusCode || 500).json({ success: false, message: err.message || 'Failed to update LIC' });
  }
}

async function deleteLic(req, res, next) {
  try {
    const staffId = parseInt(req.params.id, 10);
    const licId = parseInt(req.params.licId, 10);
    if (!staffId || !licId) return res.status(400).json({ success: false, message: 'Invalid id' });
    const deleted = await staffService.deleteLicForStaff(staffId, licId);
    if (!deleted) return res.status(404).json({ success: false, message: 'LIC record not found' });
    return res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

async function listLicTransactions(req, res, next) {
  try {
    const staffId = parseInt(req.params.id, 10);
    const licId = parseInt(req.params.licId, 10);
    if (!staffId || !licId) return res.status(400).json({ success: false, message: 'Invalid id' });
    const data = await staffService.listLicTransactions(staffId, licId);
    return res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function createLicTransaction(req, res) {
  try {
    const staffId = parseInt(req.params.id, 10);
    const licId = parseInt(req.params.licId, 10);
    if (!staffId || !licId) return res.status(400).json({ success: false, message: 'Invalid id' });
    const data = await staffService.createLicTransaction(staffId, licId, req.body || {});
    return res.status(201).json({ success: true, data });
  } catch (err) {
    return res.status(err.statusCode || 500).json({ success: false, message: err.message || 'Failed to create transaction' });
  }
}

async function deleteLicTransaction(req, res, next) {
  try {
    const staffId = parseInt(req.params.id, 10);
    const licId = parseInt(req.params.licId, 10);
    const transId = parseInt(req.params.transId, 10);
    if (!staffId || !licId || !transId) return res.status(400).json({ success: false, message: 'Invalid id' });
    const deleted = await staffService.deleteLicTransaction(staffId, licId, transId);
    if (!deleted) return res.status(404).json({ success: false, message: 'Transaction not found' });
    return res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listLics,
  createLic,
  updateLic,
  deleteLic,
  listLicTransactions,
  createLicTransaction,
  deleteLicTransaction,
};
