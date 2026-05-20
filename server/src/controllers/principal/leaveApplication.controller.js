const principalLeaveApplicationService = require('../../services/principalLeaveApplication.service');

async function listLeaveApplications(req, res, next) {
  try {
    const data = await principalLeaveApplicationService.listLeaveApplicationsForPrincipal(req.query || {});
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

async function approveLeave(req, res, next) {
  try {
    const data = await principalLeaveApplicationService.approveLeaveForPrincipal(req.user.id, req.params.id);
    res.json({ success: true, message: 'Leave approved successfully', data });
  } catch (error) {
    next(error);
  }
}

async function rejectLeave(req, res, next) {
  try {
    const data = await principalLeaveApplicationService.rejectLeaveForPrincipal(req.user.id, req.params.id);
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
