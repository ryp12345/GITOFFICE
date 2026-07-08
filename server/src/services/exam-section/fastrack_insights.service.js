const insightsModel = require('../../models/exam-section/fastrack_insights.model');

async function getInsights() {
  return insightsModel.getInsights();
}

module.exports = {
  getInsights,
};