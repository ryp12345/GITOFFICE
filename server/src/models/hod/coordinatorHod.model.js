const { pool } = require('../../config/db');

async function resolveStaffId(userId) {
  const id = Number(userId);
  if (!id) return null;

  const byUser = await pool.query('SELECT id FROM staff WHERE user_id = $1 LIMIT 1', [id]);
  if (byUser.rows[0] && byUser.rows[0].id) return Number(byUser.rows[0].id);

  const byStaff = await pool.query('SELECT id FROM staff WHERE id = $1 LIMIT 1', [id]);
  if (byStaff.rows[0] && byStaff.rows[0].id) return Number(byStaff.rows[0].id);

  return null;
}

async function getHodDepartmentId(userId) {
  // Priority 1: Check departments table for hod_user_id (most reliable for HODs)
  const deptResult = await pool.query(
    `SELECT id FROM departments WHERE hod_user_id = $1`,
    [userId]
  );
  if (deptResult.rows[0]?.id) return deptResult.rows[0].id;

  // Priority 2: Check staff table by user_id
  const staffId = await resolveStaffId(userId);
  if (staffId) {
    const r = await pool.query(
      `SELECT department_id FROM department_staff WHERE staff_id = $1 AND status = 'active' LIMIT 1`,
      [staffId]
    );
    if (r.rows[0]?.department_id) return r.rows[0].department_id;
  }

  return null;
}

async function listCoordinators() {
  const result = await pool.query(
    `SELECT id, name, employee_type FROM coordinators ORDER BY id`
  );
  return result.rows;
}

async function getCoordinatorView(coordinatorId, departmentId) {
  const coordinatorResult = await pool.query(
    `SELECT id, name, employee_type FROM coordinators WHERE id = $1`,
    [coordinatorId]
  );
  if (!coordinatorResult.rows[0]) return null;

  const coordinator = coordinatorResult.rows[0];

  const staffTypes = [];
  if (coordinator.employee_type === 'Both') {
    staffTypes.push('Teaching', 'Non-Teaching');
  } else {
    staffTypes.push(coordinator.employee_type);
  }

  const coordinatorStaffResult = await pool.query(
    `SELECT cs.*, s.fname, s.mname, s.lname, et.employee_type
     FROM coordinator_staffs cs
     JOIN staff s ON s.id = cs.staff_id
     JOIN employee_types et ON et.staff_id = s.id AND et.status = 'active'
     WHERE cs.coordinator_id = $1
       AND s.id IN (
         SELECT staff_id FROM department_staff WHERE department_id = $2 AND status = 'active'
       )
       AND et.employee_type = ANY($3)
     ORDER BY cs.id`,
    [coordinatorId, departmentId, staffTypes]
  );

  const availableStaffResult = await pool.query(
    `SELECT s.id, s.fname, s.mname, s.lname, et.employee_type
     FROM staff s
     JOIN employee_types et ON et.staff_id = s.id AND et.status = 'active'
     WHERE s.id IN (
       SELECT staff_id FROM department_staff WHERE department_id = $1 AND status = 'active'
     )
     AND et.employee_type = ANY($2)
     ORDER BY s.fname`,
    [departmentId, staffTypes]
  );

  return {
    coordinator,
    coordinator_staff: coordinatorStaffResult.rows,
    staff: availableStaffResult.rows
  };
}

async function isActiveCoordinatorStaff(coordinatorId, staffId) {
  const result = await pool.query(
    `SELECT 1 FROM coordinator_staffs
     WHERE coordinator_id = $1 AND staff_id = $2 AND status = 'active'
     LIMIT 1`,
    [coordinatorId, staffId]
  );
  return result.rows.length > 0;
}

async function addCoordinatorStaff(data) {
  const { coordinator_id, staff_id, start_date, department_id } = data;
  const result = await pool.query(
    `INSERT INTO coordinator_staffs (coordinator_id, staff_id, start_date, department_id, status)
     VALUES ($1, $2, $3, $4, 'active')
     RETURNING *`,
    [coordinator_id, staff_id, start_date, department_id]
  );
  return result.rows[0];
}

async function updateCoordinatorStaff(data) {
  const { id, staff_id, start_date, end_date } = data;
  const updates = [];
  const values = [];
  let idx = 1;

  if (staff_id !== undefined) {
    updates.push(`staff_id = $${idx++}`);
    values.push(staff_id);
  }
  if (start_date !== undefined) {
    updates.push(`start_date = $${idx++}`);
    values.push(start_date);
  }
  if (end_date !== undefined) {
    updates.push(`end_date = $${idx++}`);
    values.push(end_date);
  }

  if (end_date && end_date.trim()) {
    updates.push(`status = 'inactive'`);
  } else {
    updates.push(`end_date = NULL`);
    updates.push(`status = 'active'`);
  }

  if (updates.length === 0) return { success: false, message: 'Nothing to update' };

  updates.push(`updated_at = NOW()`);
  values.push(id);

  const result = await pool.query(
    `UPDATE coordinator_staffs SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
    values
  );

  if (result.rows.length === 0) {
    return { success: false, message: 'Coordinator staff not found' };
  }

  return { success: true, message: 'Coordinator updated successfully', data: result.rows[0] };
}

module.exports = {
  resolveStaffId,
  getHodDepartmentId,
  listCoordinators,
  getCoordinatorView,
  isActiveCoordinatorStaff,
  addCoordinatorStaff,
  updateCoordinatorStaff
};