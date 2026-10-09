const examSectionDashboardModel = require('../../models/exam-section/dashboard.model');

// academicYear: 'YYYY-YYYY' to filter, anything else means all years.
async function getExamSectionDashboard({ academicYear } = {}) {
  const year = /^\d{4}-\d{4}$/.test(String(academicYear || '').trim()) ? String(academicYear).trim() : null;
  return examSectionDashboardModel.getDashboardData({ academicYear: year });
}

module.exports = {
  getExamSectionDashboard,
};
