const { getDailyBiometric, getMonthlyForEmployee } = require('../services/biometric.service');
const { getMuster } = require('../services/biometric.service');

async function daily(req, res, next) {
  try {
    const date = req.query.date || new Date().toISOString().slice(0, 10);
    const departmentId = req.query.department_id ? Number(req.query.department_id) : null;
    const data = await getDailyBiometric(date, departmentId);
    res.json(data);
  } catch (err) {
    next(err);
  }
}

module.exports = { daily };

async function muster(req, res, next) {
  try {
    const month = req.query.month || req.body.month || (() => { const d = new Date(); return d.getMonth() + 1; })();
    const year = req.query.year || req.body.year || (() => { const d = new Date(); return d.getFullYear(); })();
    const data = await getMuster(Number(month), Number(year));
    res.json(data);
  } catch (err) {
    next(err);
  }
}

module.exports.muster = muster;

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
