const { findDepartmentByHodUserId } = require('../../models/hodDepartmentOverview.model');
const reportsModel = require('../../models/departmentActivityReports.model');
const announcementsModel = require('../../models/announcements.model');

// Department record totals shown on the HOD dashboard (same counting as the e-Gov dashboard).
const DASHBOARD_REPORTS = [
  'pa-attended-teaching',
  'pa-conducted-teaching',
  'pa-attended-nonteaching',
  'pa-conducted-nonteaching',
  'conference-attended',
  'conference-conducted',
  'publication',
  'funded-project',
  'book-chapter',
  'consultancy',
  'patent',
  'copyright',
  'achievement',
];

// GET /api/hod/dashboard
async function getDashboard(req, res, next) {
  try {
    const department = await findDepartmentByHodUserId(req.user.id);
    if (!department) {
      const error = new Error('No department is mapped to this HOD account');
      error.statusCode = 404;
      throw error;
    }

    const [totals, events, notices] = await Promise.all([
      reportsModel.countDepartmentRecords(DASHBOARD_REPORTS, department.id),
      announcementsModel.listEvents(),
      announcementsModel.listNotices(),
    ]);

    res.json({ success: true, data: { department, totals, events, notices } });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getDashboard,
};
