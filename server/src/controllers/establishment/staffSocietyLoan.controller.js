const staffService = require('../../services/staff.service');

async function listSocietyLoans(req, res, next) {
  try {
    const staffId = parseInt(req.params.id, 10);
    if (!staffId) return res.status(400).json({ success: false, message: 'Invalid staff id' });
    const data = await staffService.listSocietyLoansByStaffId(staffId);
    return res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function createSocietyLoan(req, res, next) {
  try {
    const staffId = parseInt(req.params.id, 10);
    if (!staffId) return res.status(400).json({ success: false, message: 'Invalid staff id' });
    const data = await staffService.createSocietyLoanForStaff(staffId, req.body || {});
    return res.status(201).json({ success: true, data });
  } catch (err) {
    const status = err.statusCode || 500;
    return res.status(status).json({ success: false, message: err.message || 'Failed to create society loan' });
  }
}

async function updateSocietyLoan(req, res, next) {
  try {
    const staffId = parseInt(req.params.id, 10);
    const loanRowId = parseInt(req.params.loanId, 10);
    if (!staffId || !loanRowId) {
      return res.status(400).json({ success: false, message: 'Invalid id' });
    }
    const data = await staffService.updateSocietyLoanForStaff(staffId, loanRowId, req.body || {});
    return res.json({ success: true, data });
  } catch (err) {
    const status = err.statusCode || 500;
    return res.status(status).json({ success: false, message: err.message || 'Failed to update society loan' });
  }
}

async function deleteSocietyLoan(req, res, next) {
  try {
    const staffId = parseInt(req.params.id, 10);
    const loanRowId = parseInt(req.params.loanId, 10);
    if (!staffId || !loanRowId) {
      return res.status(400).json({ success: false, message: 'Invalid id' });
    }
    const deleted = await staffService.deleteSocietyLoanForStaff(staffId, loanRowId);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Society loan not found' });
    }
    return res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listSocietyLoans,
  createSocietyLoan,
  updateSocietyLoan,
  deleteSocietyLoan,
};
