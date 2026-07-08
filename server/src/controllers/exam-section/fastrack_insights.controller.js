const insightsService = require('../../services/exam-section/fastrack_insights.service');

async function getInsights(req, res, next) {
  try {
    const items = await insightsService.getInsights();
    res.json({ success: true, data: items });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getInsights,
};