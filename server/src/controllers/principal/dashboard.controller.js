const principalDashboardService = require('../../services/principalDashboard.service');

// GET /api/principal/dashboard — shared by the Principal and Dean Admin portals.
// "Awaiting approval" follows the caller's role (Dean Admin: < 5 days, Principal: longer leave).
async function getDashboard(req, res, next) {
  try {
    const data = await principalDashboardService.getDashboard(req.user);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getDashboard,
};
