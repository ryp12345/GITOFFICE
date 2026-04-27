const staffService = require('../../services/staff.service');

async function listLaptopLoans(req, res, next) {
  try {
    const staffId = parseInt(req.params.id, 10);
    if (!staffId) return res.status(400).json({ success: false, message: 'Invalid staff id' });
    const data = await staffService.listLaptopLoansByStaffId(staffId);
    return res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function createLaptopLoan(req, res, next) {
  try {
    const staffId = parseInt(req.params.id, 10);
    if (!staffId) return res.status(400).json({ success: false, message: 'Invalid staff id' });
    const data = await staffService.createLaptopLoanForStaff(staffId, req.body || {});
    return res.status(201).json({ success: true, data });
  } catch (err) {
    const status = err.statusCode || 500;
    return res.status(status).json({ success: false, message: err.message || 'Failed to create laptop loan' });
  }
}

async function updateLaptopLoan(req, res, next) {
  try {
    const staffId = parseInt(req.params.id, 10);
    const loanId = parseInt(req.params.loanId, 10);
    if (!staffId || !loanId) {
      return res.status(400).json({ success: false, message: 'Invalid id' });
    }
    const data = await staffService.updateLaptopLoanForStaff(staffId, loanId, req.body || {});
    return res.json({ success: true, data });
  } catch (err) {
    const status = err.statusCode || 500;
    return res.status(status).json({ success: false, message: err.message || 'Failed to update laptop loan' });
  }
}

async function deleteLaptopLoan(req, res, next) {
  try {
    const staffId = parseInt(req.params.id, 10);
    const loanId = parseInt(req.params.loanId, 10);
    if (!staffId || !loanId) {
      return res.status(400).json({ success: false, message: 'Invalid id' });
    }
    const deleted = await staffService.deleteLaptopLoanForStaff(staffId, loanId);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Laptop loan not found' });
    }
    return res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listLaptopLoans,
  createLaptopLoan,
  updateLaptopLoan,
  deleteLaptopLoan,
};
