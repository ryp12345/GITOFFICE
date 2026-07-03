const examSectionDashboardModel = require('../../models/exam-section/dashboard.model');

async function getExamSectionDashboard() {
  const data = await examSectionDashboardModel.getDashboardData();
  return data;
}

module.exports = {
  getExamSectionDashboard,
};
