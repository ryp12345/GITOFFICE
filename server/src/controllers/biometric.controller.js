const { getDailyBiometric } = require('../services/biometric.service');

async function daily(req, res, next) {
  try {
    const date = req.query.date || new Date().toISOString().slice(0, 10);
    const data = await getDailyBiometric(date);
    res.json(data);
  } catch (err) {
    next(err);
  }
}

module.exports = { daily };
