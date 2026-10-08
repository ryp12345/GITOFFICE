const LeaveRules = require('./leaveRules.service');
const deanLeaveApplicationModel = require('../models/deanLeaveApplication.model');

function parseOptionalInt(value) {
  if (value === undefined || value === null || value === '') return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

async function listLeaveApplicationsForDean(query = {}) {
  const month = parseOptionalInt(query.month);
  const year = parseOptionalInt(query.year);

  const rows = await deanLeaveApplicationModel.getAllLeaveApplications({ month, year });
  const applications = await LeaveRules.annotateApplications(rows, 'dean');
  return { applications };
}

async function approveLeaveForDean(userId, applicationId) {
  const updated = await deanLeaveApplicationModel.updateApplicationStatusForDean({
    applicationId,
    status: 'approved',
    approverUserId: userId,
  });

  return { updated };
}

async function rejectLeaveForDean(_userId, applicationId) {
  const updated = await deanLeaveApplicationModel.updateApplicationStatusForDean({
    applicationId,
    status: 'rejected',
  });

  return { updated };
}

module.exports = {
  listLeaveApplicationsForDean,
  approveLeaveForDean,
  rejectLeaveForDean,
};
