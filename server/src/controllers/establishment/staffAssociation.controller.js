const staffService = require('../../services/staff.service');

async function listAssociations(req, res, next) {
  try {
    const staffId = parseInt(req.params.id, 10);
    if (!staffId) return res.status(400).json({ success: false, message: 'Invalid staff id' });
    const data = await staffService.listAssociationsByStaffId(staffId);
    return res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function createAssociation(req, res, next) {
  try {
    const staffId = parseInt(req.params.id, 10);
    if (!staffId) return res.status(400).json({ success: false, message: 'Invalid staff id' });
    const payload = req.body || {};
    const data = await staffService.createAssociationForStaff(staffId, payload);
    return res.status(201).json({ success: true, data });
  } catch (err) {
    const status = err.statusCode || 500;
    return res.status(status).json({ success: false, message: err.message || 'Failed to create association' });
  }
}

async function updateAssociation(req, res, next) {
  try {
    const staffId = parseInt(req.params.id, 10);
    const associationStaffId = parseInt(req.params.associationStaffId, 10);
    if (!staffId || !associationStaffId) {
      return res.status(400).json({ success: false, message: 'Invalid id' });
    }
    const payload = req.body || {};
    const data = await staffService.updateAssociationForStaff(staffId, associationStaffId, payload);
    return res.json({ success: true, data });
  } catch (err) {
    const status = err.statusCode || 500;
    return res.status(status).json({ success: false, message: err.message || 'Failed to update association' });
  }
}

async function deleteAssociation(req, res, next) {
  try {
    const staffId = parseInt(req.params.id, 10);
    const associationStaffId = parseInt(req.params.associationStaffId, 10);
    if (!staffId || !associationStaffId) {
      return res.status(400).json({ success: false, message: 'Invalid id' });
    }
    const deleted = await staffService.deleteAssociationForStaff(staffId, associationStaffId);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Association row not found' });
    }
    return res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listAssociations,
  createAssociation,
  updateAssociation,
  deleteAssociation,
};
