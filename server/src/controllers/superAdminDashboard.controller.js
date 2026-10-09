const superAdminDashboardService = require('../services/superAdminDashboard.service');

// GET /api/super-admin/dashboard
async function getDashboard(req, res, next) {
  try {
    const data = await superAdminDashboardService.getDashboard();
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getDashboard,
};
