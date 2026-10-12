const principalDashboardModel = require('../../models/principalDashboard.model');
const announcementsModel = require('../../models/announcements.model');

// GET /api/principal-office/dashboard
// Laravel's Principal Office dashboard showed the employee totals and every event. Its notice
// board comes from /api/notices/feed like the other portals.
async function getDashboard(_req, res, next) {
  try {
    const [staff, events] = await Promise.all([
      principalDashboardModel.getStaffSummary(),
      announcementsModel.listEvents(),
    ]);

    res.json({ success: true, data: { staff, events } });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getDashboard,
};
