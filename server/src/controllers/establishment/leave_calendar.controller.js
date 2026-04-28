const LeaveCalendar = require('../../models/leave_calendar.model');
const { sendSuccess, sendError } = require('../../utils/response');

function computeNoOfDays(startDate, endDate, clType = 'Full') {
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    return null;
  }

  const dayDiff = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  if (dayDiff === 1 && String(clType || 'Full') !== 'Full') {
    return 0.5;
  }

  return dayDiff;
}

function normalizePayload(body) {
  return {
    staffId: Number(body.staff_id),
    leaveId: Number(body.leave_id),
    startDate: body.start_date,
    endDate: body.end_date,
    reason: String(body.reason || '').trim(),
    clType: body.cl_type || 'Full',
    alternate: body.alternate ? Number(body.alternate) : null,
    additionalAlternate: body.additional_alternate ? Number(body.additional_alternate) : null
  };
}

function validateRequiredPayload(payload) {
  if (!payload.staffId || !payload.leaveId || !payload.startDate || !payload.endDate || !payload.reason) {
    const err = new Error('staff_id, leave_id, start_date, end_date and reason are required');
    err.statusCode = 400;
    throw err;
  }

  const noOfDays = computeNoOfDays(payload.startDate, payload.endDate, payload.clType);
  if (noOfDays === null) {
    const err = new Error('Invalid date range');
    err.statusCode = 400;
    throw err;
  }

  payload.noOfDays = noOfDays;
}

exports.getMeta = async (_req, res) => {
  try {
    const data = await LeaveCalendar.getMeta();
    sendSuccess(res, data);
  } catch (err) {
    sendError(res, err.message || 'Failed to load leave calendar metadata', err.statusCode || 500);
  }
};

exports.getEvents = async (req, res) => {
  try {
    const year = Number(req.query.year);
    const month = Number(req.query.month);
    const data = await LeaveCalendar.getCalendarEvents({ year, month });
    sendSuccess(res, data);
  } catch (err) {
    sendError(res, err.message || 'Failed to load leave calendar events', err.statusCode || 500);
  }
};

exports.getApplicationById = async (req, res) => {
  try {
    const applicationId = Number(req.params.id);
    if (!applicationId) return sendError(res, 'Invalid application id', 400);

    const row = await LeaveCalendar.getLeaveApplicationById(applicationId);
    if (!row) return sendError(res, 'Leave application not found', 404);

    sendSuccess(res, row);
  } catch (err) {
    sendError(res, err.message || 'Failed to load leave application', err.statusCode || 500);
  }
};

exports.validateApplication = async (req, res) => {
  try {
    const payload = normalizePayload(req.body || {});
    validateRequiredPayload(payload);

    const applicationId = req.body.application_id ? Number(req.body.application_id) : null;
    const result = await LeaveCalendar.validateLeaveApplication({
      staffId: payload.staffId,
      startDate: payload.startDate,
      endDate: payload.endDate,
      applicationId
    });

    sendSuccess(res, result);
  } catch (err) {
    sendError(res, err.message || 'Leave validation failed', err.statusCode || 500);
  }
};

exports.createApplication = async (req, res) => {
  try {
    const payload = normalizePayload(req.body || {});
    validateRequiredPayload(payload);

    const validation = await LeaveCalendar.validateLeaveApplication({
      staffId: payload.staffId,
      startDate: payload.startDate,
      endDate: payload.endDate,
      applicationId: null
    });

    if (!validation.valid) {
      return sendError(res, validation.message, 409);
    }

    const row = await LeaveCalendar.createLeaveApplication(payload);
    sendSuccess(res, row, 201);
  } catch (err) {
    sendError(res, err.message || 'Failed to create leave application', err.statusCode || 500);
  }
};

exports.updateApplication = async (req, res) => {
  try {
    const applicationId = Number(req.params.id);
    if (!applicationId) return sendError(res, 'Invalid application id', 400);

    const payload = normalizePayload(req.body || {});
    validateRequiredPayload(payload);

    const validation = await LeaveCalendar.validateLeaveApplication({
      staffId: payload.staffId,
      startDate: payload.startDate,
      endDate: payload.endDate,
      applicationId
    });

    if (!validation.valid) {
      return sendError(res, validation.message, 409);
    }

    const row = await LeaveCalendar.updateLeaveApplication(applicationId, payload);
    if (!row) return sendError(res, 'Leave application not found', 404);

    sendSuccess(res, row);
  } catch (err) {
    sendError(res, err.message || 'Failed to update leave application', err.statusCode || 500);
  }
};

exports.cancelApplication = async (req, res) => {
  try {
    const applicationId = Number(req.params.id);
    if (!applicationId) return sendError(res, 'Invalid application id', 400);

    const row = await LeaveCalendar.cancelLeaveApplication(applicationId);
    if (!row) return sendError(res, 'Leave application not found', 404);

    sendSuccess(res, row);
  } catch (err) {
    sendError(res, err.message || 'Failed to cancel leave application', err.statusCode || 500);
  }
};

exports.getAlternateStaff = async (req, res) => {
  try {
    const staffId = Number(req.query.staff_id);
    if (!staffId) return sendError(res, 'staff_id is required', 400);

    const data = await LeaveCalendar.getAlternateStaffOptions(staffId);
    sendSuccess(res, data);
  } catch (err) {
    sendError(res, err.message || 'Failed to load alternate staff options', err.statusCode || 500);
  }
};
