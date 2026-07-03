const examSectionDashboardService = require('../../services/exam-section/dashboard.service');

async function getDashboard(req, res, next) {
  try {
    const data = await examSectionDashboardService.getExamSectionDashboard();
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getDashboard,
};
