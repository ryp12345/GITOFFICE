const LeaveCalendar = require('../../models/leave_calendar.model');
const { sendSuccess, sendError } = require('../../utils/response');

function computeNoOfDays(startDate, endDate, clType = 'Full') {
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    return null;
  }

  const dayDiff = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const clTypeNormalized = String(clType || 'Full').trim().toLowerCase();
  const isFullDay = clTypeNormalized === 'full' || clTypeNormalized === 'full day';
  if (dayDiff === 1 && !isFullDay) {
    return 0.5;
  }

  return dayDiff;
}

function normalizeClType(value) {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) return 'Full';
  if (raw === 'morning' || raw === 'first half' || raw === 'firsthalf') return 'Morning';
  if (raw === 'afternoon' || raw === 'second half' || raw === 'secondhalf') return 'Afternoon';
  if (raw === 'full' || raw === 'full day' || raw === 'fullday') return 'Full';
  return 'Full';
}

function normalizePayload(body) {
  return {
    staffId: Number(body.staff_id),
    leaveId: Number(body.leave_id),
    startDate: body.start_date,
    endDate: body.end_date,
    reason: String(body.reason || '').trim(),
    clType: normalizeClType(body.cl_type),
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

    const requester = req.user || {};
    const isEstablishment = String(requester.role || '').trim() === 'Establishment';
    const requesterStaffId = await LeaveCalendar.resolveStaffIdFromUserId(requester.id);
    const payloadStaffId = await LeaveCalendar.resolveStaffIdFromUserId(payload.staffId);

    if (!isEstablishment && (!requesterStaffId || !payloadStaffId || Number(requesterStaffId) !== Number(payloadStaffId))) {
      return sendError(res, 'Forbidden', 403);
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

    const existingApplication = await LeaveCalendar.getLeaveApplicationById(applicationId);
    if (!existingApplication) return sendError(res, 'Leave application not found', 404);

    const requester = req.user || {};
    const isEstablishment = String(requester.role || '').trim() === 'Establishment';
    const requesterStaffId = await LeaveCalendar.resolveStaffIdFromUserId(requester.id);

    if (!isEstablishment && (!requesterStaffId || Number(requesterStaffId) !== Number(existingApplication.staff_id))) {
      return sendError(res, 'Forbidden', 403);
    }

    const payload = normalizePayload(req.body || {});
    validateRequiredPayload(payload);

    const payloadStaffId = await LeaveCalendar.resolveStaffIdFromUserId(payload.staffId);
    if (!isEstablishment && (!payloadStaffId || Number(payloadStaffId) !== Number(existingApplication.staff_id))) {
      return sendError(res, 'Forbidden', 403);
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

    // fetch application to check ownership
    const application = await LeaveCalendar.getLeaveApplicationById(applicationId);
    if (!application) return sendError(res, 'Leave application not found', 404);

    // allow cancellation if requester is Establishment role or the application owner
    const requester = req.user || {};
    const isEstablishment = String(requester.role || '').trim() === 'Establishment';

    // resolve staff id of requester (user -> staff)
    const requesterStaffId = await LeaveCalendar.resolveStaffIdFromUserId(requester.id);

    if (!isEstablishment && (!requesterStaffId || Number(requesterStaffId) !== Number(application.staff_id))) {
      return sendError(res, 'Forbidden', 403);
    }

    const row = await LeaveCalendar.cancelLeaveApplication(applicationId);
    if (!row) return sendError(res, 'Failed to cancel leave application', 500);

    sendSuccess(res, row);
  } catch (err) {
    sendError(res, err.message || 'Failed to cancel leave application', err.statusCode || 500);
  }
};

exports.getApplicationsByStaff = async (req, res) => {
  try {
    const userId = Number(req.query.staff_id);
    if (!userId) return sendError(res, 'staff_id is required', 400);

    const data = await LeaveCalendar.getApplicationsByStaffUserId(userId);
    sendSuccess(res, data);
  } catch (err) {
    sendError(res, err.message || 'Failed to load leave applications', err.statusCode || 500);
  }
};

exports.getAlternateStaff = async (req, res) => {
  try {
    const staffId = Number(req.query.staff_id);
    if (!staffId) return sendError(res, 'staff_id is required', 400);

    const employeeTypeHint = req.query.employee_type
      ? String(req.query.employee_type).trim().toLowerCase()
      : null;

    const data = await LeaveCalendar.getAlternateStaffOptions(staffId, employeeTypeHint);
    sendSuccess(res, data);
  } catch (err) {
    sendError(res, err.message || 'Failed to load alternate staff options', err.statusCode || 500);
  }
};

exports.getYearwiseLeaveData = async (req, res) => {
  try {
    const userId = Number(req.query.user_id);
    if (!userId) return sendError(res, 'user_id is required', 400);

    const year = Number(req.query.year);
    if (!year) return sendError(res, 'year is required', 400);

    const staffId = await LeaveCalendar.resolveStaffIdFromUserId(userId);
    if (!staffId) return sendError(res, 'Staff record not found', 404);

    const [leaveEntitlements, leaveTypes, leaveTypesTaken, sumDays] = await Promise.all([
      pool.query(
        `SELECT lse.id, lse.year, lse.staff_id, lse.leave_id, lse.entitled_curr_year, lse.accumulated, lse.consumed_curr_year, lse.encashed_curr_year, lse.total_encashed, l.shortname
         FROM leave_staff_entitlements lse
         JOIN leaves l ON l.id = lse.leave_id
         WHERE lse.staff_id = $1 AND lse.year = $2 AND LOWER(TRIM(COALESCE(lse.status, ''))) = 'active' AND LOWER(TRIM(COALESCE(l.status, ''))) = 'active'
         ORDER BY l.shortname ASC`,
        [staffId, year]
      ),
      pool.query(
        `SELECT UPPER(TRIM(shortname)) AS shortname, MIN(id) AS id FROM leaves WHERE COALESCE(max_entitlement, 0) > 0 AND UPPER(TRIM(shortname)) NOT LIKE 'SML%' AND UPPER(TRIM(shortname)) <> 'ML' AND LOWER(TRIM(COALESCE(status, ''))) = 'active' GROUP BY UPPER(TRIM(shortname)) ORDER BY shortname ASC`
      ),
      pool.query(
        `SELECT UPPER(TRIM(shortname)) AS shortname, MIN(id) AS id FROM leaves WHERE UPPER(TRIM(shortname)) NOT LIKE 'SML%' AND UPPER(TRIM(shortname)) <> 'ML' AND LOWER(TRIM(COALESCE(status, ''))) = 'active' GROUP BY UPPER(TRIM(shortname)) ORDER BY shortname ASC`
      ),
      pool.query(
        `SELECT lsa.staff_id, l.shortname, COALESCE(SUM(lsa.no_of_days), 0) AS total_days
         FROM leave_staff_applications lsa
         JOIN leaves l ON l.id = lsa.leave_id
         WHERE LOWER(COALESCE(lsa.appl_status, 'pending')) NOT IN ('rejected', 'cancelled')
           AND EXTRACT(YEAR FROM lsa.start::date) = $1
         GROUP BY lsa.staff_id, l.shortname`,
        [year]
      ),
    ]);

    const data = {};
    for (const ent of leaveEntitlements.rows) {
      data[ent.staff_id] = data[ent.staff_id] || {};
      data[ent.staff_id]['id'] = ent.staff_id;
      const shortname = String(ent.shortname || '').toUpperCase();
      data[ent.staff_id][shortname] = {
        entitled_curr_year: Number(ent.entitled_curr_year) || 0,
        accumulated: Number(ent.accumulated) || 0,
        availed: Number(ent.consumed_curr_year) || 0,
        balance: (Number(ent.entitled_curr_year) || 0) + (Number(ent.accumulated) || 0) - (Number(ent.consumed_curr_year) || 0),
      };
    }

    for (const sd of sumDays.rows) {
      if (!data[sd.staff_id]) continue;
      const shortname = String(sd.shortname || '').toUpperCase();
      if (!data[sd.staff_id][shortname]) {
        data[sd.staff_id][shortname] = { entitled_curr_year: 0, accumulated: 0, availed: 0, balance: 0 };
      }
      data[sd.staff_id][shortname].availed = Number(sd.total_days);
      data[sd.staff_id][shortname].balance = (data[sd.staff_id][shortname].entitled_curr_year || 0) + (data[sd.staff_id][shortname].accumulated || 0) - Number(sd.total_days);
    }

    sendSuccess(res, {
      leave_entitlements: leaveEntitlements.rows,
      data: Object.values(data),
      leave_types: leaveTypes.rows,
      leave_types_taken: leaveTypesTaken.rows,
      year,
    });
  } catch (err) {
    sendError(res, err.message || 'Failed to load yearwise leave data', err.statusCode || 500);
  }
};

exports.getLeavePDF = async (req, res) => {
  try {
    const applicationId = Number(req.params.id);
    if (!applicationId) return sendError(res, 'Invalid application id', 400);

    const appResult = await pool.query(
      `SELECT lsa.id, lsa.leave_id, lsa.staff_id, lsa.start, lsa."end", lsa.no_of_days, lsa.reason, lsa.alternate, lsa.additional_alternate, lsa.recommender, l.shortname AS leave_shortname
       FROM leave_staff_applications lsa
       JOIN leaves l ON l.id = lsa.leave_id
       WHERE lsa.id = $1 LIMIT 1`,
      [applicationId]
    );
    const app = appResult.rows[0];
    if (!app) return sendError(res, 'Leave application not found', 404);

    const staffResult = await pool.query(
      `SELECT s.fname, s.mname, s.lname, s.user_id,
        STRING_AGG(DISTINCT d.dept_shortname, ', ' ORDER BY d.dept_shortname) AS department_name
       FROM staff s
       LEFT JOIN department_staff ds ON ds.staff_id = s.id AND LOWER(COALESCE(ds.status, 'active')) = 'active'
       LEFT JOIN departments d ON d.id = ds.department_id
       WHERE s.id = $1
       GROUP BY s.id, s.fname, s.mname, s.lname, s.user_id`,
      [app.staff_id]
    );
    const staff = staffResult.rows[0] || {};

    const altResult = await pool.query(
      `SELECT TRIM(CONCAT_WS(' ', s.fname, s.mname, s.lname)) AS alternate_name FROM staff s WHERE s.id = $1 LIMIT 1`,
      [app.alternate]
    );
    const addAltResult = await pool.query(
      `SELECT TRIM(CONCAT_WS(' ', s.fname, s.mname, s.lname)) AS additional_alternate_name FROM staff s WHERE s.id = $1 LIMIT 1`,
      [app.additional_alternate]
    );
    const recResult = await pool.query(
      `SELECT TRIM(CONCAT_WS(' ', s.fname, s.mname, s.lname)) AS recommender_name FROM staff s WHERE s.id = $1 LIMIT 1`,
      [app.recommender]
    );

    const entitlementResult = await pool.query(
      `SELECT entitled_curr_year, accumulated, consumed_curr_year, total_encashed
       FROM leave_staff_entitlements
       WHERE staff_id = $1 AND leave_id = $2 AND year = $3
       ORDER BY id DESC LIMIT 1`,
      [app.staff_id, app.leave_id, new Date(app.start).getFullYear()]
    );
    const ent = entitlementResult.rows[0] || {};
    const leavesCredit = (Number(ent.entitled_curr_year) || 0) + (Number(ent.accumulated) || 0) - (Number(ent.consumed_curr_year) || 0) - (Number(ent.total_encashed) || 0);

    const pdfData = {
      leave_id: app.id,
      leave_type: app.leave_shortname,
      from_date: app.start ? new Date(app.start).toLocaleDateString('en-GB') : '___',
      to_date: app.end ? new Date(app.end).toLocaleDateString('en-GB') : '___',
      current_date: new Date().toLocaleDateString('en-GB'),
      no_of_days: app.no_of_days || '___',
      reason: app.reason || '___',
      alternate: altResult.rows[0]?.alternate_name || '___',
      department: staff.department_name || '___',
      staff_name: `${staff.fname || ''} ${staff.mname || ''} ${staff.lname || ''}`.trim() || '___',
      alternate_arrangement: altResult.rows[0]?.alternate_name || '___',
      additional_alternate_arrangement: addAltResult.rows[0]?.additional_alternate_name || '___',
      recommender: recResult.rows[0]?.recommender_name || '___',
      leavesCredit,
    };

    sendSuccess(res, pdfData);
  } catch (err) {
    sendError(res, err.message || 'Failed to generate leave PDF data', err.statusCode || 500);
  }
};
