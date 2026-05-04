const hodDepartmentOverviewModel = require('../models/hodDepartmentOverview.model');

async function getDepartmentOverviewForHod(userId) {
  const department = await hodDepartmentOverviewModel.findDepartmentByHodUserId(userId);

  if (!department) {
    const err = new Error('No department mapping found for this HOD user');
    err.statusCode = 404;
    throw err;
  }

  const hodHistory = await hodDepartmentOverviewModel.findHodHistoryByDepartmentId(department.id);

  return {
    department,
    hodHistory
  };
}

module.exports = {
  getDepartmentOverviewForHod
};
