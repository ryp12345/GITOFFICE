const designationPayscaleService = require('../../services/staffDesignationPayscale.service');

function parsePositiveInt(value) {
  const n = parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

async function getDesignationPayscale(req, res, next) {
  try {
    const staffId = parsePositiveInt(req.params.id);
    if (!staffId) return res.status(400).json({ success: false, message: 'Invalid staff id' });
    const data = await designationPayscaleService.listDesignationPayscaleByStaffId(staffId);
    return res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function changeDesignationPayscale(req, res) {
  try {
    const staffId = parsePositiveInt(req.params.id);
    if (!staffId) return res.status(400).json({ success: false, message: 'Invalid staff id' });
    const data = await designationPayscaleService.changeDesignationPayscaleForStaff(staffId, req.body || {});
    return res.status(201).json({ success: true, data });
  } catch (err) {
    return res.status(err.statusCode || 500).json({ success: false, message: err.message || 'Failed to change designation and payscale' });
  }
}

async function updateDesignationRow(req, res) {
  try {
    const staffId = parsePositiveInt(req.params.id);
    const rowId = parsePositiveInt(req.params.designationRowId);
    if (!staffId || !rowId) return res.status(400).json({ success: false, message: 'Invalid id' });
    const data = await designationPayscaleService.updateStaffDesignationRow(staffId, rowId, req.body || {});
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(err.statusCode || 500).json({ success: false, message: err.message || 'Failed to update designation row' });
  }
}

async function deleteDesignationRow(req, res, next) {
  try {
    const staffId = parsePositiveInt(req.params.id);
    const rowId = parsePositiveInt(req.params.designationRowId);
    if (!staffId || !rowId) return res.status(400).json({ success: false, message: 'Invalid id' });
    const deleted = await designationPayscaleService.deleteStaffDesignationRow(staffId, rowId);
    if (!deleted) return res.status(404).json({ success: false, message: 'Designation row not found' });
    return res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

async function updatePayscaleRow(req, res) {
  try {
    const staffId = parsePositiveInt(req.params.id);
    const rowId = parsePositiveInt(req.params.payRowId);
    const payRecordType = String(req.params.payRecordType || '').trim();
    if (!staffId || !rowId || !payRecordType) {
      return res.status(400).json({ success: false, message: 'Invalid id or pay record type' });
    }
    const data = await designationPayscaleService.updateStaffPayscaleRow(staffId, payRecordType, rowId, req.body || {});
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(err.statusCode || 500).json({ success: false, message: err.message || 'Failed to update payscale row' });
  }
}

async function deletePayscaleRow(req, res, next) {
  try {
    const staffId = parsePositiveInt(req.params.id);
    const rowId = parsePositiveInt(req.params.payRowId);
    const payRecordType = String(req.params.payRecordType || '').trim();
    if (!staffId || !rowId || !payRecordType) {
      return res.status(400).json({ success: false, message: 'Invalid id or pay record type' });
    }
    const deleted = await designationPayscaleService.deleteStaffPayscaleRow(staffId, payRecordType, rowId);
    if (!deleted) return res.status(404).json({ success: false, message: 'Payscale row not found' });
    return res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

async function listAdditionalDesignations(req, res, next) {
  try {
    const staffId = parsePositiveInt(req.params.id);
    if (!staffId) return res.status(400).json({ success: false, message: 'Invalid staff id' });
    const data = await designationPayscaleService.listAdditionalDesignationsByStaffId(staffId);
    return res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function createAdditionalDesignation(req, res) {
  try {
    const staffId = parsePositiveInt(req.params.id);
    if (!staffId) return res.status(400).json({ success: false, message: 'Invalid staff id' });
    const data = await designationPayscaleService.createAdditionalDesignationForStaff(staffId, req.body || {});
    return res.status(201).json({ success: true, data });
  } catch (err) {
    return res.status(err.statusCode || 500).json({ success: false, message: err.message || 'Failed to create additional designation' });
  }
}

async function updateAdditionalDesignation(req, res) {
  try {
    const staffId = parsePositiveInt(req.params.id);
    const rowId = parsePositiveInt(req.params.rowId);
    if (!staffId || !rowId) return res.status(400).json({ success: false, message: 'Invalid id' });
    const data = await designationPayscaleService.updateAdditionalDesignationForStaff(staffId, rowId, req.body || {});
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(err.statusCode || 500).json({ success: false, message: err.message || 'Failed to update additional designation' });
  }
}

async function deleteAdditionalDesignation(req, res, next) {
  try {
    const staffId = parsePositiveInt(req.params.id);
    const rowId = parsePositiveInt(req.params.rowId);
    if (!staffId || !rowId) return res.status(400).json({ success: false, message: 'Invalid id' });
    const deleted = await designationPayscaleService.deleteAdditionalDesignationForStaff(staffId, rowId);
    if (!deleted) return res.status(404).json({ success: false, message: 'Additional designation row not found' });
    return res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getDesignationPayscale,
  changeDesignationPayscale,
  updateDesignationRow,
  deleteDesignationRow,
  updatePayscaleRow,
  deletePayscaleRow,
  listAdditionalDesignations,
  createAdditionalDesignation,
  updateAdditionalDesignation,
  deleteAdditionalDesignation,
};
