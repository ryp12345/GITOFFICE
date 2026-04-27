const staffService = require('../../services/staff.service');

async function listAnnualIncrements(req, res, next) {
  try {
    const staffId = parseInt(req.params.id, 10);
    if (!staffId) return res.status(400).json({ success: false, message: 'Invalid staff id' });
    const data = await staffService.listAnnualIncrementsByStaffId(staffId);
    return res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function createAnnualIncrement(req, res, next) {
  try {
    const staffId = parseInt(req.params.id, 10);
    if (!staffId) return res.status(400).json({ success: false, message: 'Invalid staff id' });
    const payload = req.body || {};
    const data = await staffService.createAnnualIncrementForStaff(staffId, payload);
    return res.status(201).json({ success: true, data });
  } catch (err) {
    const status = err.statusCode || 500;
    return res.status(status).json({ success: false, message: err.message || 'Failed to create annual increment' });
  }
}

async function updateAnnualIncrement(req, res, next) {
  try {
    const staffId = parseInt(req.params.id, 10);
    const incrementId = parseInt(req.params.incrementId, 10);
    if (!staffId || !incrementId) {
      return res.status(400).json({ success: false, message: 'Invalid id' });
    }
    const payload = req.body || {};
    const data = await staffService.updateAnnualIncrementForStaff(staffId, incrementId, payload);
    return res.json({ success: true, data });
  } catch (err) {
    const status = err.statusCode || 500;
    return res.status(status).json({ success: false, message: err.message || 'Failed to update annual increment' });
  }
}

async function deleteAnnualIncrement(req, res, next) {
  try {
    const staffId = parseInt(req.params.id, 10);
    const incrementId = parseInt(req.params.incrementId, 10);
    if (!staffId || !incrementId) {
      return res.status(400).json({ success: false, message: 'Invalid id' });
    }
    const deleted = await staffService.deleteAnnualIncrementForStaff(staffId, incrementId);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Annual increment not found' });
    }
    return res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listAnnualIncrements,
  createAnnualIncrement,
  updateAnnualIncrement,
  deleteAnnualIncrement,
};
