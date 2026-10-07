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
  const staffId = await resolveStaffId(userId);
  if (!staffId) return null;

  const r = await pool.query(
    `SELECT department_id FROM department_staff WHERE staff_id = $1 AND status = 'active' LIMIT 1`,
    [staffId]
  );
  return r.rows[0]?.department_id || null;
}

// HOD: list fastrack courses for department
async function listHodCourses(departmentId) {
  const result = await pool.query(
    `SELECT 
       fc.id,
       fc.course_code,
       fc.course_name,
       fc.ft_course_type_id,
       fc.ft_instance_id,
       fc.department_id,
       fc.no_of_students,
       fct.course_type,
       fi.academic_year,
       fi.ft_instance_name,
       fi.max_theory_class,
       fi.max_lab_class,
       fi.start_date,
       fi.end_date,
       json_agg(json_build_object(
         'id', fs.id,
         'staff_id', fs.staff_id,
         'instructor_foreman_id', fs.instructor_foreman_id,
         'peon_attender_id', fs.peon_attender_id,
         'classes_conducted', fs.classes_conducted,
         'labs_conducted', fs.labs_conducted,
         'document', fs.document,
         'status', fs.status,
         'ft_justification', fs.ft_justification,
         'staff', json_build_object('id', s.id, 'fname', s.fname, 'mname', s.mname, 'lname', s.lname),
         'instructorForeman', json_build_object('id', inf.id, 'fname', inf.fname, 'mname', inf.mname, 'lname', inf.lname),
         'peonAttender', json_build_object('id', pa.id, 'fname', pa.fname, 'mname', pa.mname, 'lname', pa.lname)
       ) ORDER BY fs.id) AS fastrack_staffs
     FROM fastrack_courses fc
     LEFT JOIN ftcourses fct ON fct.id = fc.ft_course_type_id
     JOIN fastrack_instances fi ON fi.id = fc.ft_instance_id
     JOIN fastrack_staffs fs ON fs.course_id = fc.id AND fs.staff_id IS NOT NULL
     LEFT JOIN staff s ON s.id = fs.staff_id
     LEFT JOIN staff inf ON inf.id = fs.instructor_foreman_id
     LEFT JOIN staff pa ON pa.id = fs.peon_attender_id
     WHERE fc.department_id = $1
     GROUP BY fc.id, fct.course_type, fi.id
     ORDER BY fc.id DESC`,
    [departmentId]
  );
  return result.rows;
}

// HOD: filter courses by academic year and instance
async function filterHodCourses(departmentId, academicYear, instanceId) {
  const result = await pool.query(
    `SELECT 
       fc.id,
       fc.course_code,
       fc.course_name,
       fc.ft_course_type_id,
       fc.ft_instance_id,
       fc.no_of_students,
       fct.course_type,
       fi.academic_year,
       fi.ft_instance_name,
       fi.max_theory_class,
       fi.max_lab_class,
       fi.start_date,
       fi.end_date,
       json_agg(json_build_object(
         'id', fs.id,
         'staff_id', fs.staff_id,
         'instructor_foreman_id', fs.instructor_foreman_id,
         'peon_attender_id', fs.peon_attender_id,
         'classes_conducted', fs.classes_conducted,
         'labs_conducted', fs.labs_conducted,
         'document', fs.document,
         'status', fs.status,
         'ft_justification', fs.ft_justification,
         'staff', json_build_object('id', s.id, 'fname', s.fname, 'mname', s.mname, 'lname', s.lname),
         'instructorForeman', json_build_object('id', inf.id, 'fname', inf.fname, 'mname', inf.mname, 'lname', inf.lname),
         'peonAttender', json_build_object('id', pa.id, 'fname', pa.fname, 'mname', pa.mname, 'lname', pa.lname)
       ) ORDER BY fs.id) AS fastrack_staffs
     FROM fastrack_courses fc
     LEFT JOIN ftcourses fct ON fct.id = fc.ft_course_type_id
     JOIN fastrack_instances fi ON fi.id = fc.ft_instance_id
     JOIN fastrack_staffs fs ON fs.course_id = fc.id AND fs.staff_id IS NOT NULL
     LEFT JOIN staff s ON s.id = fs.staff_id
     LEFT JOIN staff inf ON inf.id = fs.instructor_foreman_id
     LEFT JOIN staff pa ON pa.id = fs.peon_attender_id
     WHERE fc.department_id = $1
       AND fc.ft_instance_id = $2
       AND fi.academic_year = $3
     GROUP BY fc.id, fct.course_type, fi.id
     ORDER BY fc.id DESC`,
    [departmentId, instanceId, academicYear]
  );
  return result.rows;
}

// HOD: approve the selected (course, staff) records.
// Only the HOD's department, and only records the coordinator has Verified.
async function approveHodRecords(items, departmentId) {
  const client = await pool.connect();
  let approved = 0;
  try {
    await client.query('BEGIN');
    for (const item of items) {
      const r = await client.query(
        `UPDATE fastrack_staffs fs SET status = 'Approved', updated_at = NOW()
           FROM fastrack_courses fc
          WHERE fc.id = fs.course_id
            AND fs.course_id = $1 AND fs.staff_id = $2
            AND fc.department_id = $3
            AND fs.status = 'Verified'`,
        [item.course_id, item.staff_id, departmentId]
      );
      approved += r.rowCount;
    }
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
  return { success: true, approved, message: 'Staff records approved successfully.' };
}

// HOD: a fastrack_staffs record, only if it belongs to the department
async function findStaffRecordInDepartment(staffRecordId, departmentId) {
  const r = await pool.query(
    `SELECT fs.id, fs.status
       FROM fastrack_staffs fs
       JOIN fastrack_courses fc ON fc.id = fs.course_id
      WHERE fs.id = $1 AND fc.department_id = $2`,
    [staffRecordId, departmentId]
  );
  return r.rows[0] || null;
}

// HOD: get course type for a fastrack_staff record
async function getCourseTypeForStaff(staffRecordId) {
  const r = await pool.query(
    `SELECT fct.course_type
     FROM fastrack_staffs fs
     JOIN fastrack_courses fc ON fc.id = fs.course_id
     JOIN ftcourses fct ON fct.id = fc.ft_course_type_id
     WHERE fs.id = $1`,
    [staffRecordId]
  );
  return r.rows[0]?.course_type || null;
}

// HOD: process justification (update classes/labs and auto-approve if justification provided)
async function processJustification(staffRecordId, { classes_conducted, labs_conducted, ft_justification }) {
  const updates = [];
  const values = [];
  let idx = 1;

  if (classes_conducted !== undefined && classes_conducted !== null) {
    updates.push(`classes_conducted = $${idx++}`);
    values.push(Number(classes_conducted));
  }
  if (labs_conducted !== undefined && labs_conducted !== null) {
    updates.push(`labs_conducted = $${idx++}`);
    values.push(Number(labs_conducted));
  }
  if (ft_justification !== undefined) {
    updates.push(`ft_justification = $${idx++}`);
    values.push(ft_justification);
  }
  if (ft_justification && ft_justification.trim()) {
    updates.push(`status = 'Approved'`);
  }

  if (updates.length === 0) return { success: false, message: 'Nothing to update' };

  updates.push(`updated_at = NOW()`);
  values.push(staffRecordId);

  await pool.query(
    `UPDATE fastrack_staffs SET ${updates.join(', ')} WHERE id = $${idx}`,
    values
  );
  return { success: true, message: 'Staff details updated and status approved successfully.' };
}

// HOD: list fastrack management view (summary)
async function listHodFastrackManagement(departmentId) {
  const result = await pool.query(
    `SELECT 
       fc.course_code,
       fc.course_name,
       fc.id,
       fct.course_type,
       fs.classes_conducted,
       fs.labs_conducted,
       fs.status,
       fs.staff_id,
       fs.instructor_foreman_id,
       fs.peon_attender_id,
       fs.id AS staff_record_id,
       CASE WHEN s.id IS NULL THEN NULL ELSE json_build_object('id', s.id, 'fname', s.fname, 'mname', s.mname, 'lname', s.lname) END AS "assignedStaff",
       CASE WHEN inf.id IS NULL THEN NULL ELSE json_build_object('id', inf.id, 'fname', inf.fname, 'mname', inf.mname, 'lname', inf.lname) END AS "instructorForeman",
       CASE WHEN pa.id IS NULL THEN NULL ELSE json_build_object('id', pa.id, 'fname', pa.fname, 'mname', pa.mname, 'lname', pa.lname) END AS "peonAttender"
     FROM fastrack_courses fc
     LEFT JOIN ftcourses fct ON fct.id = fc.ft_course_type_id
     LEFT JOIN fastrack_staffs fs ON fs.course_id = fc.id
     LEFT JOIN staff s ON s.id = fs.staff_id
     LEFT JOIN staff inf ON inf.id = fs.instructor_foreman_id
     LEFT JOIN staff pa ON pa.id = fs.peon_attender_id
     WHERE fc.department_id = $1
     ORDER BY fc.id DESC, fs.id`,
    [departmentId]
  );
  return result.rows;
}

// Lookup data for filter dropdowns
async function getHodLookupData() {
  const [instances, courseTypes] = await Promise.all([
    pool.query(`SELECT id, ft_instance_name, academic_year FROM fastrack_instances ORDER BY id DESC`),
    pool.query(`SELECT id, course_type FROM ftcourses ORDER BY id`),
  ]);
  return {
    instances: instances.rows,
    courseTypes: courseTypes.rows,
  };
}

module.exports = {
  resolveStaffId,
  getHodDepartmentId,
  listHodCourses,
  filterHodCourses,
  approveHodRecords,
  getCourseTypeForStaff,
  findStaffRecordInDepartment,
  processJustification,
  listHodFastrackManagement,
  getHodLookupData,
};