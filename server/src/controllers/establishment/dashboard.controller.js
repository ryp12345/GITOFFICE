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
