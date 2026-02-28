const CombineLeave = require('../models/combine_leave.model');
const { sendSuccess, sendError } = require('../utils/response');

exports.getByLeaveId = async (req, res) => {
  try {
    const leaveId = Number(req.query.leave_id);
    if (!Number.isFinite(leaveId)) {
      return sendError(res, 'leave_id is required', 400);
    }
    const rows = await CombineLeave.getByLeaveId(leaveId);
    return sendSuccess(res, rows);
  } catch (err) {
    return sendError(res, err.message || 'Error fetching combine leaves', 500);
  }
};

exports.sync = async (req, res) => {
  try {
    const leaveId = Number(req.body.leave_id);
    const wef = req.body.wef;
    const items = req.body.items || [];

    if (!Number.isFinite(leaveId)) {
      return sendError(res, 'leave_id is required', 400);
    }

    if (!wef) {
      return sendError(res, 'wef is required', 400);
    }

    const rows = await CombineLeave.sync(leaveId, items, wef);
    return sendSuccess(res, rows);
  } catch (err) {
    return sendError(res, err.message || 'Error syncing combine leaves', 500);
  }
};
