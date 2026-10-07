const egovModel = require('../../models/egov.model');
const reportsModel = require('../../models/departmentActivityReports.model');

// The reports summarised on the Laravel egov dashboard (EgovAdminController::dashboard).
const DASHBOARD_REPORTS = [
  'pa-attended-teaching',
  'pa-conducted-teaching',
  'pa-attended-nonteaching',
  'pa-conducted-nonteaching',
  'conference-attended',
  'conference-conducted',
  'publication',
  'funded-project',
  'patent',
  'copyright',
  'achievement',
];

// reason is varchar(225) on the narrowest research table.
const MAX_REASON_LENGTH = 225;

async function resolveDepartment(req) {
  const department = await egovModel.findDepartmentForEgovUser(req.user.id);
  if (!department) {
    const error = new Error('No department is mapped to this e-Governance account');
    error.statusCode = 403;
    throw error;
  }
  return department;
}

// GET /api/egov/dashboard
async function getDashboard(req, res, next) {
  try {
    const department = await resolveDepartment(req);
    const [totals, events, notices] = await Promise.all([
      reportsModel.countDepartmentRecords(DASHBOARD_REPORTS, department.id),
      egovModel.listEvents(),
      egovModel.listNotices(),
    ]);

    res.json({ success: true, data: { department, totals, events, notices } });
  } catch (error) {
    next(error);
  }
}

// GET /api/egov/reports/:report
async function getReport(req, res, next) {
  try {
    reportsModel.getReport(req.params.report);
    const department = await resolveDepartment(req);

    // Every EgovAdminController / EgovResearchController listing joined
    // department_staff.status = 'active', unlike the HOD research pages.
    const { rows, counts } = await reportsModel.listDepartmentReport(req.params.report, department.id, {
      activeMembersOnly: true,
    });

    res.json({ success: true, data: { department, rows, counts } });
  } catch (error) {
    next(error);
  }
}

// PATCH /api/egov/reports/:report/:id/validation  { validation_status, reason }
async function validateRecord(req, res, next) {
  try {
    reportsModel.getReport(req.params.report);

    const recordId = Number(req.params.id);
    const status = typeof req.body?.validation_status === 'string' ? req.body.validation_status.trim() : '';
    const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim() : '';

    const errors = {};
    if (!Number.isInteger(recordId) || recordId <= 0) errors.id = 'Invalid record id';
    if (!reportsModel.VALIDATION_STATUSES.includes(status)) {
      errors.validation_status = 'Please choose Valid or In-Valid';
    }
    if (reason.length > MAX_REASON_LENGTH) {
      errors.reason = `Reason may not be longer than ${MAX_REASON_LENGTH} characters`;
    }
    if (Object.keys(errors).length > 0) {
      const error = new Error('Validation failed');
      error.statusCode = 422;
      error.errors = errors;
      throw error;
    }

    const department = await resolveDepartment(req);
    const record = await reportsModel.setValidationStatus(
      req.params.report,
      department.id,
      recordId,
      status,
      reason || null
    );

    res.json({ success: true, message: 'Validation status updated successfully', data: record });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getDashboard,
  getReport,
  validateRecord,
};
