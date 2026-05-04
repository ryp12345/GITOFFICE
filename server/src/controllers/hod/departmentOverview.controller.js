const hodDepartmentOverviewService = require('../../services/hodDepartmentOverview.service');

async function getDepartmentOverview(req, res, next) {
  try {
    const data = await hodDepartmentOverviewService.getDepartmentOverviewForHod(req.user.id);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getDepartmentOverview
};
