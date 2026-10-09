const establishmentDashboardService = require('../../services/establishmentDashboard.service');

// GET /api/establishment/dashboard
async function getDashboard(req, res, next) {
  try {
    const data = await establishmentDashboardService.getDashboard();
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getDashboard,
};

// GET /api/establishment/dashboard/data-quality/:check
async function getDataQualityStaff(req, res, next) {
  try {
    const data = await establishmentDashboardService.getDataQualityStaff(req.params.check);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

module.exports.getDataQualityStaff = getDataQualityStaff;
