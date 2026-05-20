const deanLeaveApplicationService = require('../../services/deanLeaveApplication.service');

async function listLeaveApplications(req, res, next) {
  try {
    const data = await deanLeaveApplicationService.listLeaveApplicationsForDean(req.query || {});
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

async function approveLeave(req, res, next) {
  try {
    const data = await deanLeaveApplicationService.approveLeaveForDean(req.user.id, req.params.id);
    res.json({ success: true, message: 'Leave approved successfully', data });
  } catch (error) {
    next(error);
  }
}

async function rejectLeave(req, res, next) {
  try {
    const data = await deanLeaveApplicationService.rejectLeaveForDean(req.user.id, req.params.id);
    res.json({ success: true, message: 'Leave rejected successfully', data });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listLeaveApplications,
  approveLeave,
  rejectLeave,
};
