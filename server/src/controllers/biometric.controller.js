const { getDailyBiometric, getMonthlyForEmployee } = require('../services/biometric.service');

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

async function monthly(req, res, next) {
  try {
    const emp = req.query.employee || req.query.emp || req.body.employee;
    const month = req.query.month || req.body.month;
    const year = req.query.year || req.body.year;
    if (!emp) return res.status(400).json({ error: 'employee query param required' });
    const data = await getMonthlyForEmployee(emp, month, year);
    res.json(data);
  } catch (err) {
    next(err);
  }
}

module.exports.monthly = monthly;
