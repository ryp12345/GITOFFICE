const hodLeaveApplicationService = require('../../services/hodLeaveApplication.service');

async function listLeaveApplications(req, res, next) {
  try {
    const data = await hodLeaveApplicationService.listLeaveApplicationsForHod(req.user, req.query || {});
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

async function recommendLeave(req, res, next) {
  try {
    const data = await hodLeaveApplicationService.recommendLeaveForHod(req.user, req.params.id);
    res.json({ success: true, message: 'Leave recommended successfully', data });
  } catch (error) {
    next(error);
  }
}

async function rejectLeave(req, res, next) {
  try {
    const data = await hodLeaveApplicationService.rejectLeaveForHod(req.user, req.params.id);
    res.json({ success: true, message: 'Leave rejected successfully', data });
  } catch (error) {
    next(error);
  }
}

async function bulkUpdate(req, res, next) {
  try {
    const data = await hodLeaveApplicationService.bulkUpdateLeaveStatusForHod(req.user, req.body || {});
    res.json({ success: true, message: 'Bulk leave action completed', data });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listLeaveApplications,
  recommendLeave,
  rejectLeave,
  bulkUpdate,
};
