const LeaveEntitlement = require('../../models/leave_entitlement.model');
const { sendSuccess, sendError } = require('../../utils/response');
const { findDepartmentByHodUserId } = require('../../models/hodDepartmentOverview.model');

const toMapFromPrefixedFields = (body, prefix) => {
  const mapped = {};
  Object.entries(body || {}).forEach(([key, value]) => {
    if (!key.startsWith(prefix)) return;
    const shortname = key.slice(prefix.length).trim().toUpperCase();
    if (!shortname) return;
    mapped[shortname] = value;
  });
  return mapped;
};

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
    const currentYear = new Date().getFullYear();
    const parsedYear = Number(req.query.year || currentYear);
    const year = Number.isFinite(parsedYear) && parsedYear > 0 ? parsedYear : currentYear;
    const departmentId = req.query.department_id ? Number(req.query.department_id) : null;
    const requestedMode = String(req.query.mode || 'auto').toLowerCase();

    let mode = 'yearwise';
    if (requestedMode === 'default' || requestedMode === 'yearwise') {
      mode = requestedMode;
    } else {
      const hasDepartmentFilter = Number.isFinite(departmentId) && departmentId > 0;
      const hasExplicitYearFilter = req.query.year !== undefined && req.query.year !== null && String(req.query.year).trim() !== '';

      mode = !hasDepartmentFilter && !hasExplicitYearFilter && year === currentYear ? 'default' : 'yearwise';
    }

    const data = await LeaveEntitlement.getEntitlementScreenData({ year, departmentId, mode });
    sendSuccess(res, data);
  } catch (err) {
    sendError(res, err.message || 'Error fetching leave entitlements', err.statusCode || 500);
  }
};

exports.update = async (req, res) => {
  try {
    const entitledMap =
      req.body && typeof req.body.entitled === 'object' && !Array.isArray(req.body.entitled)
        ? req.body.entitled
        : toMapFromPrefixedFields(req.body, 'entitled_');

    const availedMap =
      req.body && typeof req.body.availed === 'object' && !Array.isArray(req.body.availed)
        ? req.body.availed
        : toMapFromPrefixedFields(req.body, 'availed_');

    const payload = {
      year: req.body.year,
      staffId: req.body.staff_id,
      entitled: entitledMap,
      availed: availedMap,
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

    const data = await LeaveEntitlement.getEntitlementScreenData({ year, departmentId: department.id, mode: 'yearwise' });
    // Attach resolved department so clients can display HOD's department name
    data.current_department = department;
    sendSuccess(res, data);
  } catch (err) {
    sendError(res, err.message || 'Error fetching HOD leave entitlements', err.statusCode || 500);
  }
};
