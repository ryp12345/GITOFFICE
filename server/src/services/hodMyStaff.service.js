const hodMyStaffModel = require('../models/hodMyStaff.model');

function normalizeType(value) {
  return String(value || '').trim().toLowerCase();
}

async function getMyStaffForHod(userId) {
  const department = await hodMyStaffModel.resolveDepartmentForHod(userId);

  if (!department) {
    const err = new Error('No department mapping found for this HOD user');
    err.statusCode = 404;
    throw err;
  }

  const staffRows = await hodMyStaffModel.findDepartmentStaffByDepartmentId(department.id);

  const teachingStaff = [];
  const nonTeachingStaff = [];

  for (const row of staffRows) {
    const type = normalizeType(row.employee_type);

    if (type === 'teaching') {
      teachingStaff.push(row);
      continue;
    }

    if (type === 'non-teaching' || type === 'non teaching' || type === 'nonteaching') {
      nonTeachingStaff.push(row);
    }
  }

  return {
    department,
    teachingStaff,
    nonTeachingStaff
  };
}

module.exports = {
  getMyStaffForHod
};
