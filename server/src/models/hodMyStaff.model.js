const { pool } = require('../config/db');
const { findDepartmentByHodUserId } = require('./hodDepartmentOverview.model');

async function resolveDepartmentForHod(userId) {
  return findDepartmentByHodUserId(userId);
}

async function findDepartmentStaffByDepartmentId(departmentId) {
  const { rows } = await pool.query(
    `
      SELECT
        s.id AS staff_id,
        s.user_id,
        s.fname,
        s.mname,
        s.lname,
        s.contactno,
        COALESCE(et.employee_type, '') AS employee_type,
        COALESCE(des.design_name, '') AS designation_name,
        COALESCE(ass.asso_name, '') AS association_name
      FROM department_staff dpt
      JOIN staff s ON s.id = dpt.staff_id
      LEFT JOIN LATERAL (
        SELECT et1.employee_type
        FROM employee_types et1
        WHERE et1.staff_id = s.id
          AND LOWER(COALESCE(et1.status, 'active')) = 'active'
        ORDER BY et1.id DESC
        LIMIT 1
      ) et ON true
      LEFT JOIN LATERAL (
        SELECT d.design_name
        FROM designation_staff ds
        JOIN designations d ON d.id = ds.designation_id
        WHERE ds.staff_id = s.id
          AND LOWER(COALESCE(ds.status, 'active')) = 'active'
        ORDER BY ds.id DESC
        LIMIT 1
      ) des ON true
      LEFT JOIN LATERAL (
        SELECT a.asso_name
        FROM association_staff ast
        JOIN associations a ON a.id = ast.association_id
        WHERE ast.staff_id = s.id
          AND LOWER(COALESCE(ast.status, 'active')) = 'active'
        ORDER BY ast.id DESC
        LIMIT 1
      ) ass ON true
      WHERE dpt.department_id = $1
        AND LOWER(COALESCE(dpt.status, 'active')) = 'active'
      ORDER BY s.fname ASC, s.mname ASC, s.lname ASC, s.id ASC
    `,
    [departmentId]
  );

  return rows;
}

module.exports = {
  resolveDepartmentForHod,
  findDepartmentStaffByDepartmentId
};
