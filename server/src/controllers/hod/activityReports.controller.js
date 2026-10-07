const { findDepartmentByHodUserId } = require('../../models/hodDepartmentOverview.model');
const hodActivityReportsModel = require('../../models/hod/hodActivityReports.model');

// GET /api/hod/activity-reports/:report
// The department always comes from the signed-in HOD (Laravel read it from session('deptid')),
// never from the request, so one HOD cannot read another department's records.
async function getReport(req, res, next) {
  try {
    hodActivityReportsModel.getReport(req.params.report);

    const department = await findDepartmentByHodUserId(req.user.id);
    if (!department) {
      const error = new Error('No department is mapped to this HOD account');
      error.statusCode = 404;
      throw error;
    }

    const { rows, counts } = await hodActivityReportsModel.listDepartmentReport(req.params.report, department.id);

    res.json({ success: true, data: { department, rows, counts } });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getReport,
};
