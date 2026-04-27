const staffService = require('../../services/staff.service');

async function listSocietyShares(req, res, next) {
  try {
    const staffId = parseInt(req.params.id, 10);
    if (!staffId) return res.status(400).json({ success: false, message: 'Invalid staff id' });
    const data = await staffService.listSocietySharesByStaffId(staffId);
    return res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function createSocietyShare(req, res, next) {
  try {
    const staffId = parseInt(req.params.id, 10);
    if (!staffId) return res.status(400).json({ success: false, message: 'Invalid staff id' });
    const data = await staffService.createSocietyShareForStaff(staffId, req.body || {});
    return res.status(201).json({ success: true, data });
  } catch (err) {
    const status = err.statusCode || 500;
    return res.status(status).json({ success: false, message: err.message || 'Failed to create society share' });
  }
}

async function updateSocietyShare(req, res, next) {
  try {
    const staffId = parseInt(req.params.id, 10);
    const shareId = parseInt(req.params.shareId, 10);
    if (!staffId || !shareId) {
      return res.status(400).json({ success: false, message: 'Invalid id' });
    }
    const data = await staffService.updateSocietyShareForStaff(staffId, shareId, req.body || {});
    return res.json({ success: true, data });
  } catch (err) {
    const status = err.statusCode || 500;
    return res.status(status).json({ success: false, message: err.message || 'Failed to update society share' });
  }
}

async function deleteSocietyShare(req, res, next) {
  try {
    const staffId = parseInt(req.params.id, 10);
    const shareId = parseInt(req.params.shareId, 10);
    if (!staffId || !shareId) {
      return res.status(400).json({ success: false, message: 'Invalid id' });
    }
    const deleted = await staffService.deleteSocietyShareForStaff(staffId, shareId);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Society share not found' });
    }
    return res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listSocietyShares,
  createSocietyShare,
  updateSocietyShare,
  deleteSocietyShare,
};
