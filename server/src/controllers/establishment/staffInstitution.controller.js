const staffService = require('../../services/staff.service');

async function listInstitutions(req, res, next) {
  try {
    const staffId = parseInt(req.params.id, 10);
    if (!staffId) return res.status(400).json({ success: false, message: 'Invalid staff id' });
    const data = await staffService.listInstitutionsByStaffId(staffId);
    return res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function createInstitution(req, res, next) {
  try {
    const staffId = parseInt(req.params.id, 10);
    if (!staffId) return res.status(400).json({ success: false, message: 'Invalid staff id' });
    const payload = req.body || {};
    const data = await staffService.createInstitutionForStaff(staffId, payload);
    return res.status(201).json({ success: true, data });
  } catch (err) {
    const status = err.statusCode || 500;
    return res.status(status).json({ success: false, message: err.message || 'Failed to create institution' });
  }
}

async function updateInstitution(req, res, next) {
  try {
    const staffId = parseInt(req.params.id, 10);
    const institutionStaffId = parseInt(req.params.institutionStaffId, 10);
    if (!staffId || !institutionStaffId) {
      return res.status(400).json({ success: false, message: 'Invalid id' });
    }
    const payload = req.body || {};
    const data = await staffService.updateInstitutionForStaff(staffId, institutionStaffId, payload);
    return res.json({ success: true, data });
  } catch (err) {
    const status = err.statusCode || 500;
    return res.status(status).json({ success: false, message: err.message || 'Failed to update institution' });
  }
}

async function deleteInstitution(req, res, next) {
  try {
    const staffId = parseInt(req.params.id, 10);
    const institutionStaffId = parseInt(req.params.institutionStaffId, 10);
    if (!staffId || !institutionStaffId) {
      return res.status(400).json({ success: false, message: 'Invalid id' });
    }
    const deleted = await staffService.deleteInstitutionForStaff(staffId, institutionStaffId);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Institution row not found' });
    }
    return res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listInstitutions,
  createInstitution,
  updateInstitution,
  deleteInstitution,
};
