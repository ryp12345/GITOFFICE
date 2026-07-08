const insightsModel = require('../../models/exam-section/fastrack_insights.model');

async function getInsights() {
  return insightsModel.getInsights();
}

async function exportInsights() {
  return insightsModel.exportInsights();
}

module.exports = {
  getInsights,
  exportInsights,
};