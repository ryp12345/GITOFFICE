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

async function isCoordinator(userId) {
  const staffId = await resolveStaffId(userId);
  if (!staffId) return false;

  const r = await pool.query(
    `SELECT 1 FROM coordinators c
      JOIN coordinator_staffs cs ON cs.coordinator_id = c.id
     WHERE cs.staff_id = $1 AND c.name = 'FASTRACK' AND cs.status = 'active' LIMIT 1`,
    [staffId]
  );
  return r.rows.length > 0;
}

async function getStaffDepartmentId(staffId) {
  const r = await pool.query(
    `SELECT department_id FROM department_staff WHERE staff_id = $1 AND status = 'active' LIMIT 1`,
    [staffId]
  );
  return r.rows[0]?.department_id || null;
}

// Faculty view: My Courses
async function listMyCourses(staffId) {
  const result = await pool.query(
    `SELECT 
       fs.id,
       fs.course_id,
       fs.staff_id,
       fs.instructor_foreman_id,
       fs.peon_attender_id,
       fs.classes_conducted,
       fs.labs_conducted,
       fs.document,
       fs.status,
       fs.created_at,
       fc.course_code,
       fc.course_name,
       fc.ft_course_type_id,
       fc.ft_instance_id,
       fc.no_of_students,
       fct.course_type,
       fi.academic_year,
       fi.ft_instance_name,
       fi.start_date,
       fi.end_date,
       fi.max_theory_class,
       fi.max_lab_class
     FROM fastrack_staffs fs
     JOIN fastrack_courses fc ON fc.id = fs.course_id
     JOIN ftcourses fct ON fct.id = fc.ft_course_type_id
     JOIN fastrack_instances fi ON fi.id = fc.ft_instance_id
     WHERE fs.staff_id = $1
     ORDER BY fc.id ASC`,
    [staffId]
  );
  return result.rows;
}

async function updateMyCourse(staffId, courseId, { classes_conducted, labs_conducted, document }) {
  const result = await pool.query(
    `INSERT INTO fastrack_staffs (course_id, staff_id, classes_conducted, labs_conducted, document)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (course_id, staff_id) DO UPDATE SET
       classes_conducted = COALESCE(EXCLUDED.classes_conducted, fastrack_staffs.classes_conducted),
       labs_conducted = COALESCE(EXCLUDED.labs_conducted, fastrack_staffs.labs_conducted),
       document = COALESCE(EXCLUDED.document, fastrack_staffs.document),
       updated_at = NOW()
     RETURNING *`,
    [courseId, staffId, classes_conducted ?? null, labs_conducted ?? null, document ?? null]
  );
  return result.rows[0];
}

// Coordinator: list all courses in department with staff assignments
async function listCoordinatorCourses(departmentId) {
  const result = await pool.query(
    `SELECT 
       fc.id,
       fc.course_code,
       fc.course_name,
       fc.ft_course_type_id,
       fc.ft_instance_id,
       fc.department_id,
       fc.no_of_students,
       fc.amount,
       fct.course_type,
       fct.Is_Remunerated,
       fi.academic_year,
       fi.ft_instance_name,
       fi.max_theory_class,
       fi.max_lab_class,
       json_agg(json_build_object(
         'id', fs.id,
         'staff_id', fs.staff_id,
         'instructor_foreman_id', fs.instructor_foreman_id,
         'peon_attender_id', fs.peon_attender_id,
         'classes_conducted', fs.classes_conducted,
         'labs_conducted', fs.labs_conducted,
         'document', fs.document,
         'status', fs.status,
         'staff', json_build_object(
           'id', s.id,
           'fname', s.fname,
           'mname', s.mname,
           'lname', s.lname
         ),
         'instructorForeman', json_build_object(
           'id', inf.id,
           'fname', inf.fname,
           'mname', inf.mname,
           'lname', inf.lname
         ),
         'peonAttender', json_build_object(
           'id', pa.id,
           'fname', pa.fname,
           'mname', pa.mname,
           'lname', pa.lname
         )
       )) FILTER (WHERE fs.id IS NOT NULL) AS fastrack_staffs
     FROM fastrack_courses fc
     JOIN ftcourses fct ON fct.id = fc.ft_course_type_id
     JOIN fastrack_instances fi ON fi.id = fc.ft_instance_id
     LEFT JOIN fastrack_staffs fs ON fs.course_id = fc.id
     LEFT JOIN staff s ON s.id = fs.staff_id
     LEFT JOIN staff inf ON inf.id = fs.instructor_foreman_id
     LEFT JOIN staff pa ON pa.id = fs.peon_attender_id
     WHERE fc.department_id = $1
     GROUP BY fc.id, fct.course_type, fct.Is_Remunerated, fi.academic_year, fi.ft_instance_name, fi.max_theory_class, fi.max_lab_class
     ORDER BY fc.id DESC`,
    [departmentId]
  );
  return result.rows;
}

// Coordinator: get staff lists for assignment modal
async function getStaffForAssignment(departmentId) {
  // Teaching staff
  const teaching = await pool.query(
    `SELECT DISTINCT s.id, s.fname, s.lname, d.design_name, dpt.dept_shortname
     FROM staff s
     JOIN department_staff ds ON ds.staff_id = s.id
     JOIN departments dpt ON dpt.id = ds.department_id
     JOIN employee_types et ON et.staff_id = s.id
     JOIN designation_staff dst ON dst.staff_id = s.id
     JOIN designations d ON d.id = dst.designation_id
     WHERE et.employee_type = 'Teaching'
       AND et.status = 'active'
       AND ds.status = 'active'
       AND dst.status = 'active'
       AND d.design_name IN ('Assistant Professor', 'Associate Professor', 'Professor', 'Lecturer')
       AND (
         $1 = 9 AND ds.department_id IN (1, 9)
         OR ds.department_id = $1
       )
     ORDER BY s.fname ASC`,
    [departmentId]
  );

  // Non-teaching: Instructor/Foreman
  const ntInstructor = await pool.query(
    `SELECT DISTINCT s.id, s.fname, s.lname, d.design_name, dpt.dept_shortname
     FROM staff s
     JOIN department_staff ds ON ds.staff_id = s.id
     JOIN departments dpt ON dpt.id = ds.department_id
     JOIN employee_types et ON et.staff_id = s.id
     JOIN designation_staff dst ON dst.staff_id = s.id
     JOIN designations d ON d.id = dst.designation_id
     WHERE et.employee_type = 'Non-Teaching'
       AND et.status = 'active'
       AND ds.status = 'active'
       AND dst.status = 'active'
       AND d.design_name IN ('Instructor', 'Foreman', 'Assistant Instructor')
     ORDER BY s.fname ASC`
  );

  // Non-teaching: Peon/Attender
  const ntPeon = await pool.query(
    `SELECT DISTINCT s.id, s.fname, s.lname, d.design_name, dpt.dept_shortname
     FROM staff s
     JOIN department_staff ds ON ds.staff_id = s.id
     JOIN departments dpt ON dpt.id = ds.department_id
     JOIN employee_types et ON et.staff_id = s.id
     JOIN designation_staff dst ON dst.staff_id = s.id
     JOIN designations d ON d.id = dst.designation_id
     WHERE et.employee_type = 'Non-Teaching'
       AND et.status = 'active'
       AND ds.status = 'active'
       AND dst.status = 'active'
       AND d.design_name IN ('Peons', 'Attender', 'Mechanic')
     ORDER BY s.fname ASC`
  );

  return {
    teaching: teaching.rows,
    instructorForeman: ntInstructor.rows,
    peonAttender: ntPeon.rows,
  };
}

// Coordinator: assign staff to course
async function assignStaffToCourse(courseId, { staff_ids, instructor_foreman_id, peon_attender_id, ft_course_type_id }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Update course type
    await client.query(
      `UPDATE fastrack_courses SET ft_course_type_id = $1 WHERE id = $2`,
      [ft_course_type_id, courseId]
    );

    // Delete existing assignments
    await client.query(`DELETE FROM fastrack_staffs WHERE course_id = $1`, [courseId]);

    // Insert new assignments
    const staffIds = Array.isArray(staff_ids) ? staff_ids : [staff_ids];
    for (const staffId of staffIds) {
      await client.query(
        `INSERT INTO fastrack_staffs (course_id, staff_id, instructor_foreman_id, peon_attender_id, status)
         VALUES ($1, $2, $3, $4, 'Pending')`,
        [courseId, staffId, instructor_foreman_id || null, peon_attender_id || null]
      );
    }

    await client.query('COMMIT');
    return { success: true };
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

// Coordinator: update staff assignment
async function updateStaffAssignment(courseId, { staff_ids, instructor_foreman_id, peon_attender_id, ft_course_type_id }) {
  return assignStaffToCourse(courseId, { staff_ids, instructor_foreman_id, peon_attender_id, ft_course_type_id });
}

// Coordinator: filter courses by academic year and instance
async function filterCoordinatorCourses(departmentId, academicYear, instanceId) {
  const result = await pool.query(
    `SELECT 
       fc.id,
       fc.course_code,
       fc.course_name,
       fc.ft_course_type_id,
       fc.ft_instance_id,
       fct.course_type,
       fct.Is_Remunerated,
       fi.academic_year,
       fi.ft_instance_name,
       json_agg(json_build_object(
         'id', fs.id,
         'staff_id', fs.staff_id,
         'instructor_foreman_id', fs.instructor_foreman_id,
         'peon_attender_id', fs.peon_attender_id,
         'classes_conducted', fs.classes_conducted,
         'labs_conducted', fs.labs_conducted,
         'document', fs.document,
         'status', fs.status,
         'staff', json_build_object('id', s.id, 'fname', s.fname, 'mname', s.mname, 'lname', s.lname),
         'instructorForeman', json_build_object('id', inf.id, 'fname', inf.fname, 'mname', inf.mname, 'lname', inf.lname),
         'peonAttender', json_build_object('id', pa.id, 'fname', pa.fname, 'mname', pa.mname, 'lname', pa.lname)
       )) FILTER (WHERE fs.id IS NOT NULL) AS fastrack_staffs
     FROM fastrack_courses fc
     JOIN ftcourses fct ON fct.id = fc.ft_course_type_id
     JOIN fastrack_instances fi ON fi.id = fc.ft_instance_id
     LEFT JOIN fastrack_staffs fs ON fs.course_id = fc.id
     LEFT JOIN staff s ON s.id = fs.staff_id
     LEFT JOIN staff inf ON inf.id = fs.instructor_foreman_id
     LEFT JOIN staff pa ON pa.id = fs.peon_attender_id
     WHERE fc.department_id = $1
       AND fc.ft_instance_id = $2
       AND fi.academic_year = $3
     GROUP BY fc.id, fct.course_type, fct.Is_Remunerated, fi.academic_year, fi.ft_instance_name
     ORDER BY fc.id DESC`,
    [departmentId, instanceId, academicYear]
  );
  return result.rows;
}

// Coordinator Verification: list courses for verification
async function listVerificationCourses(departmentId) {
  const result = await pool.query(
    `SELECT 
       fc.id,
       fc.course_code,
       fc.course_name,
       fc.ft_course_type_id,
       fc.ft_instance_id,
       fc.amount,
       fct.course_type,
       fi.academic_year,
       fi.ft_instance_name,
       json_agg(json_build_object(
         'id', fs.id,
         'staff_id', fs.staff_id,
         'classes_conducted', fs.classes_conducted,
         'labs_conducted', fs.labs_conducted,
         'document', fs.document,
         'status', fs.status,
         'staff', json_build_object('id', s.id, 'fname', s.fname, 'mname', s.mname, 'lname', s.lname)
       )) FILTER (WHERE fs.id IS NOT NULL) AS fastrack_staffs
     FROM fastrack_courses fc
     JOIN ftcourses fct ON fct.id = fc.ft_course_type_id
     JOIN fastrack_instances fi ON fi.id = fc.ft_instance_id
     LEFT JOIN fastrack_staffs fs ON fs.course_id = fc.id
     LEFT JOIN staff s ON s.id = fs.staff_id
     WHERE fc.department_id = $1
     GROUP BY fc.id, fct.course_type, fi.academic_year, fi.ft_instance_name
     ORDER BY fc.id ASC`,
    [departmentId]
  );
  return result.rows;
}

// Coordinator Verification: verify selected records
async function verifyRecords(items) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const item of items) {
      await client.query(
        `UPDATE fastrack_staffs SET status = 'Verified' WHERE course_id = $1 AND staff_id = $2`,
        [item.course_id, item.staff_id]
      );
    }
    await client.query('COMMIT');
    return { success: true };
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

// Lookup data for modals
async function getLookupData() {
  const [instances, courseTypes, departments] = await Promise.all([
    pool.query(`SELECT id, ft_instance_name, academic_year FROM fastrack_instances ORDER BY id DESC`),
    pool.query(`SELECT id, course_type, Is_Remunerated FROM ftcourses ORDER BY id`),
    pool.query(`SELECT id, dept_name, dept_shortname FROM departments ORDER BY dept_name`),
  ]);
  return {
    instances: instances.rows,
    courseTypes: courseTypes.rows,
    departments: departments.rows,
  };
}

module.exports = {
  resolveStaffId,
  isCoordinator,
  getStaffDepartmentId,
  listMyCourses,
  updateMyCourse,
  listCoordinatorCourses,
  getStaffForAssignment,
  assignStaffToCourse,
  updateStaffAssignment,
  filterCoordinatorCourses,
  listVerificationCourses,
  verifyRecords,
  getLookupData,
};