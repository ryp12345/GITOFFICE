const LeaveRules = require('./leaveRules.service');
const principalLeaveApplicationModel = require('../models/principalLeaveApplication.model');

function parseOptionalInt(value) {
  if (value === undefined || value === null || value === '') return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

async function listLeaveApplicationsForPrincipal(query = {}) {
  const month = parseOptionalInt(query.month);
  const year = parseOptionalInt(query.year);

  const rows = await principalLeaveApplicationModel.getAllLeaveApplications({ month, year });
  const applications = await LeaveRules.annotateApplications(rows, 'principal');
  return { applications };
}

async function approveLeaveForPrincipal(userId, applicationId) {
  const updated = await principalLeaveApplicationModel.updateApplicationStatusForPrincipal({
    applicationId,
    status: 'approved',
    approverUserId: userId,
  });

  return { updated };
}

async function rejectLeaveForPrincipal(_userId, applicationId) {
  const updated = await principalLeaveApplicationModel.updateApplicationStatusForPrincipal({
    applicationId,
    status: 'rejected',
  });

  return { updated };
}

module.exports = {
  listLeaveApplicationsForPrincipal,
  approveLeaveForPrincipal,
  rejectLeaveForPrincipal,
};
