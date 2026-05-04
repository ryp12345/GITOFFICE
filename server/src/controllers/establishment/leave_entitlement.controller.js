const LeaveEntitlement = require('../../models/leave_entitlement.model');
const { sendSuccess, sendError } = require('../../utils/response');
const { findDepartmentByHodUserId } = require('../../models/hodDepartmentOverview.model');

exports.getMeta = async (_req, res) => {
  try {
    const year = new Date().getFullYear();
    const data = await LeaveEntitlement.getEntitlementScreenData({ year, departmentId: null });
    sendSuccess(res, {
      departments: data.departments,
      leave_types: data.leave_types,
      leave_types_taken: data.leave_types_taken,
      default_year: year
    });
  } catch (err) {
    sendError(res, err.message || 'Error fetching entitlement metadata', 500);
  }
};

exports.getAll = async (req, res) => {
  try {
    const year = Number(req.query.year || new Date().getFullYear());
    const departmentId = req.query.department_id ? Number(req.query.department_id) : null;

    const data = await LeaveEntitlement.getEntitlementScreenData({ year, departmentId });
    sendSuccess(res, data);
  } catch (err) {
    sendError(res, err.message || 'Error fetching leave entitlements', err.statusCode || 500);
  }
};

exports.update = async (req, res) => {
  try {
    const payload = {
      year: req.body.year,
      staffId: req.body.staff_id,
      entitled: req.body.entitled,
      availed: req.body.availed,
      thisYearEncashedEl: req.body.this_year_encashed_el,
      accumulatedEl: req.body.accumulated_el
    };

    await LeaveEntitlement.updateEntitlements(payload);
    sendSuccess(res, { message: 'Leave staff entitlements updated successfully.' });
  } catch (err) {
    sendError(res, err.message || 'Error updating leave entitlements', err.statusCode || 500);
  }
};

exports.getForHod = async (req, res) => {
  try {
    const year = Number(req.query.year || new Date().getFullYear());
    const userId = req.user && req.user.id ? Number(req.user.id) : null;

    if (!userId) {
      return sendError(res, 'User not authenticated', 401);
    }

    const department = await findDepartmentByHodUserId(userId);
    if (!department || !department.id) {
      return sendError(res, 'No department mapping found for this HOD user', 404);
    }

    const data = await LeaveEntitlement.getEntitlementScreenData({ year, departmentId: department.id });
    // Attach resolved department so clients can display HOD's department name
    data.current_department = department;
    sendSuccess(res, data);
  } catch (err) {
    sendError(res, err.message || 'Error fetching HOD leave entitlements', err.statusCode || 500);
  }
};
