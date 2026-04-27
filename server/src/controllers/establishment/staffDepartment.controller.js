const staffService = require('../../services/staff.service');

async function listDepartments(req, res, next) {
  try {
    const staffId = parseInt(req.params.id, 10);
    if (!staffId) return res.status(400).json({ success: false, message: 'Invalid staff id' });
    const data = await staffService.listDepartmentsByStaffId(staffId);
    return res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function createDepartment(req, res, next) {
  try {
    const staffId = parseInt(req.params.id, 10);
    if (!staffId) return res.status(400).json({ success: false, message: 'Invalid staff id' });
    const payload = req.body || {};
    const data = await staffService.createDepartmentForStaff(staffId, payload);
    return res.status(201).json({ success: true, data });
  } catch (err) {
    const status = err.statusCode || 500;
    return res.status(status).json({ success: false, message: err.message || 'Failed to create department' });
  }
}

async function updateDepartment(req, res, next) {
  try {
    const staffId = parseInt(req.params.id, 10);
    const departmentStaffId = parseInt(req.params.departmentStaffId, 10);
    if (!staffId || !departmentStaffId) {
      return res.status(400).json({ success: false, message: 'Invalid id' });
    }
    const payload = req.body || {};
    const data = await staffService.updateDepartmentForStaff(staffId, departmentStaffId, payload);
    return res.json({ success: true, data });
  } catch (err) {
    const status = err.statusCode || 500;
    return res.status(status).json({ success: false, message: err.message || 'Failed to update department' });
  }
}

async function deleteDepartment(req, res, next) {
  try {
    const staffId = parseInt(req.params.id, 10);
    const departmentStaffId = parseInt(req.params.departmentStaffId, 10);
    if (!staffId || !departmentStaffId) {
      return res.status(400).json({ success: false, message: 'Invalid id' });
    }
    const deleted = await staffService.deleteDepartmentForStaff(staffId, departmentStaffId);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Department row not found' });
    }
    return res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
};
