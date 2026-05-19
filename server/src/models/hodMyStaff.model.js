const { pool } = require('../config/db');
const { findDepartmentByHodUserId } = require('./hodDepartmentOverview.model');

async function resolveDepartmentForHod(userId) {
  return findDepartmentByHodUserId(userId);
}

async function findDepartmentStaffByDepartmentId(departmentId) {
  // Use DISTINCT ON to ensure we return at most one row per staff (pick latest department_staff record)
  const { rows } = await pool.query(
    `
      WITH latest AS (
        SELECT DISTINCT ON (s.id)
          s.id,
          s.user_id,
          s.fname,
          s.mname,
          s.lname,
          COALESCE(s.employeecode::text, '') AS employeecode,
          s.contactno
        FROM department_staff dpt
        JOIN staff s ON s.id = dpt.staff_id
        WHERE dpt.department_id = $1
          AND LOWER(COALESCE(dpt.status, 'active')) = 'active'
        ORDER BY s.id, dpt.id DESC
      )
      SELECT
        l.id AS staff_id,
        l.user_id,
        l.fname,
        l.mname,
        l.lname,
        l.employeecode,
        l.contactno,
        COALESCE(et.employee_type, '') AS employee_type,
        COALESCE(des.design_name, '') AS designation_name,
        COALESCE(ass.asso_name, '') AS association_name
      FROM latest l
      LEFT JOIN LATERAL (
        SELECT et1.employee_type
        FROM employee_types et1
        WHERE et1.staff_id = l.id
          AND LOWER(COALESCE(et1.status, 'active')) = 'active'
        ORDER BY et1.id DESC
        LIMIT 1
      ) et ON true
      LEFT JOIN LATERAL (
        SELECT d.design_name
        FROM designation_staff ds
        JOIN designations d ON d.id = ds.designation_id
        WHERE ds.staff_id = l.id
          AND LOWER(COALESCE(ds.status, 'active')) = 'active'
        ORDER BY ds.id DESC
        LIMIT 1
      ) des ON true
      LEFT JOIN LATERAL (
        SELECT a.asso_name
        FROM association_staff ast
        JOIN associations a ON a.id = ast.association_id
        WHERE ast.staff_id = l.id
          AND LOWER(COALESCE(ast.status, 'active')) = 'active'
        ORDER BY ast.id DESC
        LIMIT 1
      ) ass ON true
      ORDER BY l.fname ASC, l.mname ASC, l.lname ASC, l.id ASC
    `,
    [departmentId]
  );

  return rows;
}

module.exports = {
  resolveDepartmentForHod,
  findDepartmentStaffByDepartmentId
};
