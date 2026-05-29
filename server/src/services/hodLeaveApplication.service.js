const { findDepartmentByHodUserId } = require('../models/hodDepartmentOverview.model');
const { findByName } = require('../models/department.model');
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

async function listLeaveApplicationsForHod(userId, query = {}) {
  const department = await resolveDepartmentOrThrow(userId);
  const month = parseOptionalInt(query.month);
  const year = parseOptionalInt(query.year);

  const applications = await hodLeaveApplicationModel.getDepartmentLeaveApplications({
    departmentId: department.id,
    month,
    year,
  });

  return {
    department,
    applications,
  };
}

async function recommendLeaveForHod(userId, applicationId) {
  const department = await resolveDepartmentOrThrow(userId);
  const actorUserId = typeof userId === 'object' && userId !== null ? Number(userId.id) : Number(userId);
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

async function rejectLeaveForHod(userId, applicationId) {
  const department = await resolveDepartmentOrThrow(userId);
  const actorUserId = typeof userId === 'object' && userId !== null ? Number(userId.id) : Number(userId);
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

async function bulkUpdateLeaveStatusForHod(userId, { action, ids }) {
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

  const department = await resolveDepartmentOrThrow(userId);
  const actorUserId = typeof userId === 'object' && userId !== null ? Number(userId.id) : Number(userId);
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
