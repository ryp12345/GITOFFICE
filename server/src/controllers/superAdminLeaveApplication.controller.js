const { pool } = require('../config/db');
const LeaveRules = require('../services/leaveRules.service');
const hodLeaveApplicationModel = require('../models/hodLeaveApplication.model');

async function findItCellDepartmentId() {
  const deptResult = await pool.query(
    "SELECT id FROM departments WHERE LOWER(dept_name) = 'it cell' LIMIT 1"
  );
  return deptResult.rows[0]?.id || null;
}

// Fetch all leave applications for IT Cell department
async function listItCellLeaveApplications(req, res, next) {
  try {
    // Get IT Cell department id
    const itCellDeptId = await findItCellDepartmentId();
    if (!itCellDeptId) {
      return res.status(404).json({ success: false, message: 'IT Cell department not found' });
    }

    // Get all staff ids in IT Cell
    const staffResult = await pool.query(
      'SELECT staff_id FROM department_staff WHERE department_id = $1 AND LOWER(COALESCE(status,\'active\')) = \'active\'',
      [itCellDeptId]
    );
    const staffIds = staffResult.rows.map(r => r.staff_id);
    if (!staffIds.length) {
      return res.json({ success: true, data: { department: { id: itCellDeptId, dept_name: 'IT Cell' }, applications: [] } });
    }

    // Filter by year: use query param or default to current year
    const year = req.query.year ? String(req.query.year) : String(new Date().getFullYear());

    const leaveResult = await pool.query(
      `SELECT
        lsa.id,
        lsa.leave_id,
        lsa.staff_id,
        lsa.alternate,
        lsa.additional_alternate,
        lsa.reason,
        lsa.recommender,
        lsa.approver,
        TO_CHAR(lsa.start::date, 'YYYY-MM-DD') AS start_date,
        TO_CHAR(lsa.end::date, 'YYYY-MM-DD') AS end_date,
        lsa.no_of_days,
        lsa.appl_status,
        lsa.leave_status,
        lsa.year,
        TO_CHAR(lsa.created_at::date, 'YYYY-MM-DD') AS application_date,
        l.shortname AS leave_shortname,
        l.longname AS leave_longname,
        TRIM(CONCAT_WS(' ', s1.fname, s1.mname, s1.lname)) AS staff_name,
        TRIM(CONCAT_WS(' ', s2.fname, s2.mname, s2.lname)) AS alternate_staff,
        TRIM(CONCAT_WS(' ', s3.fname, s3.mname, s3.lname)) AS additional_alternate_staff,
        CASE
          WHEN lsa.cl_type = 'Morning' THEN CONCAT(l.shortname, ' -Morning')
          WHEN lsa.cl_type = 'Afternoon' THEN CONCAT(l.shortname, ' -Afternoon')
          ELSE l.shortname
        END AS title
      FROM leave_staff_applications lsa
      JOIN leaves l ON l.id = lsa.leave_id
      JOIN staff s1 ON s1.id = lsa.staff_id
      LEFT JOIN staff s2 ON s2.id = lsa.alternate
      LEFT JOIN staff s3 ON s3.id = lsa.additional_alternate
      WHERE lsa.staff_id = ANY($1::int[])
        AND lsa.year = $2
      ORDER BY
        CASE lsa.appl_status
          WHEN 'pending' THEN 1
          WHEN 'recommended' THEN 2
          WHEN 'approved' THEN 3
          WHEN 'rejected' THEN 4
          WHEN 'cancelled' THEN 5
          ELSE 6
        END,
        lsa.id DESC`,
      [staffIds, year]
    );

    const applications = await LeaveRules.annotateApplications(leaveResult.rows, 'superadmin');

    return res.json({
      success: true,
      data: {
        department: { id: itCellDeptId, dept_name: 'IT Cell' },
        applications,
      },
    });
  } catch (error) {
    next(error);
  }
}

// AdminController::recommend_leave / reject_leave — Super Admin recommends or rejects
// IT Cell leave applications with the same entitlement side effects as the HoD.
async function updateItCellStatus(status, applicationId) {
  const departmentId = await findItCellDepartmentId();
  if (!departmentId) {
    const err = new Error('IT Cell department not found');
    err.statusCode = 404;
    throw err;
  }
  return hodLeaveApplicationModel.updateApplicationStatusForDepartment({
    applicationId,
    departmentId,
    status,
    mode: 'superadmin',
  });
}

async function recommendItCellLeave(req, res, next) {
  try {
    const updated = await updateItCellStatus('recommended', req.params.id);
    res.json({ success: true, message: 'Leave recommended successfully', data: { updated } });
  } catch (error) {
    next(error);
  }
}

async function rejectItCellLeave(req, res, next) {
  try {
    const updated = await updateItCellStatus('rejected', req.params.id);
    res.json({ success: true, message: 'Leave rejected successfully', data: { updated } });
  } catch (error) {
    next(error);
  }
}

async function bulkUpdateItCellLeaves(req, res, next) {
  try {
    const action = String(req.body?.action || '').trim().toLowerCase();
    if (!['recommended', 'rejected'].includes(action)) {
      return res.status(400).json({ success: false, message: 'Invalid bulk action. Use recommended or rejected' });
    }
    const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];
    const uniqueIds = [...new Set(ids.map(Number).filter((v) => Number.isFinite(v) && v > 0))];
    if (uniqueIds.length === 0) {
      return res.status(400).json({ success: false, message: 'ids must be a non-empty array' });
    }

    const updated = [];
    const failed = [];
    for (const id of uniqueIds) {
      try {
        // eslint-disable-next-line no-await-in-loop
        const row = await updateItCellStatus(action, id);
        if (row) updated.push(row.id);
      } catch (error) {
        failed.push({ id, message: error?.message || 'Failed to update leave application' });
      }
    }
    res.json({ success: true, message: 'Bulk leave action completed', data: { action, updated, failed } });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listItCellLeaveApplications,
  recommendItCellLeave,
  rejectItCellLeave,
  bulkUpdateItCellLeaves,
};
