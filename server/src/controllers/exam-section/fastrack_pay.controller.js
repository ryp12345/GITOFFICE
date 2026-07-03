const payService = require('../../services/exam-section/fastrack_pay.service');

async function getPayConfig(req, res, next) {
  try {
    const data = await payService.getPayConfig();
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

async function getPayConfigData(req, res, next) {
  try {
    const academicYear = req.query.academic_year;
    const data = await payService.getPayConfigData(academicYear);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

async function createPayConfig(req, res, next) {
  try {
    const payConfig = await payService.createPayConfig(req.body);
    res.status(201).json({ success: true, data: payConfig });
  } catch (error) {
    next(error);
  }
}

async function updatePayConfig(req, res, next) {
  try {
    const payConfig = await payService.updatePayConfig(req.params.id, req.body);
    if (!payConfig) {
      const err = new Error('Pay configuration not found');
      err.statusCode = 404;
      return next(err);
    }
    res.json({ success: true, data: payConfig });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getPayConfig,
  getPayConfigData,
  createPayConfig,
  updatePayConfig,
};
