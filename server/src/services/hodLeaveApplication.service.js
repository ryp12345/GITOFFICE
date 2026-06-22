const { findDepartmentByHodUserId } = require('../models/hodDepartmentOverview.model');
const { findByName } = require('../models/department.model');
const { pool } = require('../config/db');
const hodLeaveApplicationModel = require('../models/hodLeaveApplication.model');

async function resolveDepartmentOrThrow(userOrId) {
  const isObject = typeof userOrId === 'object' && userOrId !== null;
  const userId = isObject ? Number(userOrId.id) : Number(userOrId);
  const role = isObject && userOrId.role ? String(userOrId.role).trim().toLowerCase() : '';
  const userDept = isObject && userOrId.department && userOrId.department.dept_name
    ? String(userOrId.department.dept_name).trim().toLowerCase()
    : '';

  if (role === 'registrar' || userDept === 'office') {
    const officeDepartment = await findByName('Office');
    if (!officeDepartment) {
      const err = new Error('Office department not found');
      err.statusCode = 404;
      throw err;
    }
    return officeDepartment;
  }

  const department = await findDepartmentByHodUserId(userId);
  if (!department) {
    const err = new Error('No department mapping found for this HOD user');
    err.statusCode = 404;
    throw err;
  }
  return department;
}

function parseOptionalInt(value) {
  if (value === undefined || value === null || value === '') return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

async function enrichApplicationRows(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return rows;

  const appIds = rows.map((r) => Number(r.id)).filter(Boolean);
  if (appIds.length === 0) return rows;

  const staffIds = [...new Set(rows.map((r) => Number(r.staff_id)).filter(Boolean))];
  const leaveIds = [...new Set(rows.map((r) => Number(r.leave_id)).filter(Boolean))];

  const [staffNamesResult, leaveNamesResult, alternateNamesResult, additionalAlternateResult] = await Promise.all([
    pool.query(
      `SELECT s.id, TRIM(CONCAT_WS(' ', s.fname, s.mname, s.lname)) AS staff_name, STRING_AGG(DISTINCT d.dept_shortname, ', ' ORDER BY d.dept_shortname) AS dept_shortname
       FROM staff s
       LEFT JOIN department_staff ds ON ds.staff_id = s.id AND LOWER(COALESCE(ds.status, 'active')) = 'active'
       LEFT JOIN departments d ON d.id = ds.department_id
       WHERE s.id = ANY($1::bigint[])
       GROUP BY s.id, s.fname, s.mname, s.lname`,
      [staffIds]
    ),
    pool.query(
      `SELECT id, shortname, longname FROM leaves WHERE id = ANY($1::bigint[])`,
      [leaveIds]
    ),
    pool.query(
      `SELECT la.id, TRIM(CONCAT_WS(' ', s.fname, s.mname, s.lname)) AS alternate_staff_name
       FROM leave_staff_applications la
       JOIN staff s ON s.id = la.alternate
       WHERE la.id = ANY($1::bigint[]) AND la.alternate IS NOT NULL`,
      [appIds]
    ),
    pool.query(
      `SELECT la.id, TRIM(CONCAT_WS(' ', s.fname, s.mname, s.lname)) AS additional_alternate_staff_name
       FROM leave_staff_applications la
       JOIN staff s ON s.id = la.additional_alternate
       WHERE la.id = ANY($1::bigint[]) AND la.additional_alternate IS NOT NULL`,
      [appIds]
    ),
  ]);

  const staffMap = new Map(staffNamesResult.rows.map((r) => [r.id, r]));
  const leaveMap = new Map(leaveNamesResult.rows.map((r) => [r.id, r]));
  const alternateMap = new Map(alternateNamesResult.rows.map((r) => [r.id, r.alternate_staff_name]));
  const additionalAlternateMap = new Map(additionalAlternateResult.rows.map((r) => [r.id, r.additional_alternate_staff_name]));

  return rows.map((row) => {
    const staffInfo = staffMap.get(Number(row.staff_id));
    const leaveInfo = leaveMap.get(Number(row.leave_id));

    return {
      ...row,
      staff_name: staffInfo?.staff_name || row.staff_name || 'N/A',
      dept_shortname: staffInfo?.dept_shortname || row.dept_shortname || 'N/A',
      leave_shortname: leaveInfo?.shortname || row.leave_shortname || 'N/A',
      leave_longname: leaveInfo?.longname || row.leave_longname || 'N/A',
      alternate_staff: alternateMap.get(Number(row.id)) || row.alternate_staff || null,
      additional_alternate_staff: additionalAlternateMap.get(Number(row.id)) || row.additional_alternate_staff || null,
    };
  });
}

async function listLeaveApplicationsForHod(userOrId, query = {}) {
  const department = await resolveDepartmentOrThrow(userOrId);
  const month = parseOptionalInt(query.month);
  const year = parseOptionalInt(query.year);

  let applications;
  if (month && year) {
    applications = await hodLeaveApplicationModel.getDepartmentLeaveApplicationsByMonthYear({
      departmentId: department.id,
      month,
      year,
    });
  } else {
    applications = await hodLeaveApplicationModel.getDepartmentLeaveApplications({
      departmentId: department.id,
      month,
      year,
    });
  }

  applications = await enrichApplicationRows(applications);

  return {
    department,
    applications,
  };
}

async function recommendLeaveForHod(userOrId, applicationId) {
  const department = await resolveDepartmentOrThrow(userOrId);
  const actorUserId = typeof userOrId === 'object' && userOrId !== null ? Number(userOrId.id) : Number(userOrId);
  const updated = await hodLeaveApplicationModel.updateApplicationStatusForDepartment({
    applicationId,
    departmentId: department.id,
    status: 'recommended',
    recommenderUserId: actorUserId,
  });

  return {
    department,
    updated,
  };
}

async function rejectLeaveForHod(userOrId, applicationId) {
  const department = await resolveDepartmentOrThrow(userOrId);
  const actorUserId = typeof userOrId === 'object' && userOrId !== null ? Number(userOrId.id) : Number(userOrId);
  const updated = await hodLeaveApplicationModel.updateApplicationStatusForDepartment({
    applicationId,
    departmentId: department.id,
    status: 'rejected',
    recommenderUserId: actorUserId,
  });

  return {
    department,
    updated,
  };
}

async function bulkUpdateLeaveStatusForHod(userOrId, { action, ids }) {
  const normalizedAction = String(action || '').trim().toLowerCase();
  if (!['recommended', 'rejected'].includes(normalizedAction)) {
    const err = new Error('Invalid bulk action. Use recommended or rejected');
    err.statusCode = 400;
    throw err;
  }

  if (!Array.isArray(ids) || ids.length === 0) {
    const err = new Error('ids must be a non-empty array');
    err.statusCode = 400;
    throw err;
  }

  const department = await resolveDepartmentOrThrow(userOrId);
  const actorUserId = typeof userOrId === 'object' && userOrId !== null ? Number(userOrId.id) : Number(userOrId);
  const uniqueIds = [...new Set(ids.map((value) => Number(value)).filter((value) => Number.isFinite(value) && value > 0))];

  const updated = [];
  const failed = [];

  for (const applicationId of uniqueIds) {
    try {
      const row = await hodLeaveApplicationModel.updateApplicationStatusForDepartment({
        applicationId,
        departmentId: department.id,
        status: normalizedAction,
        recommenderUserId: actorUserId,
      });
      if (row) updated.push(row.id);
    } catch (error) {
      failed.push({
        id: applicationId,
        message: error?.message || 'Failed to update leave application',
      });
    }
  }

  return {
    department,
    action: normalizedAction,
    updated,
    failed,
  };
}

module.exports = {
  listLeaveApplicationsForHod,
  recommendLeaveForHod,
  rejectLeaveForHod,
  bulkUpdateLeaveStatusForHod,
};
