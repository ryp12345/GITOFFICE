const { pool } = require('../../config/db');

async function findAll() {
  const { rows } = await pool.query(
    `SELECT fc.id,
            fc.course_code,
            fc.course_name,
            fc.department_id,
            fc.ft_instance_id,
            fc.no_of_students,
            fc.created_at,
            fc.updated_at,
            d.dept_shortname,
            d.dept_name,
            ft.course_type,
            fi.ft_instance_name,
            fi.academic_year,
            COALESCE(fs.classes_conducted, 0) AS classes_conducted,
            COALESCE(fs.labs_conducted, 0) AS labs_conducted,
            fs.status AS staff_status
     FROM fastrack_courses fc
     LEFT JOIN departments d ON d.id = fc.department_id
     LEFT JOIN ftcourses ft ON ft.id = fc.ft_course_type_id
     LEFT JOIN fastrack_instances fi ON fi.id = fc.ft_instance_id
     LEFT JOIN LATERAL (
       SELECT fs.classes_conducted, fs.labs_conducted, fs.status
       FROM fastrack_staffs fs
       WHERE fs.course_id = fc.id
       LIMIT 1
     ) fs ON true
     ORDER BY fc.id ASC`
  );
  return rows;
}

async function findById(id) {
  const { rows } = await pool.query(
    `SELECT fc.id,
            fc.course_code,
            fc.course_name,
            fc.department_id,
            fc.ft_instance_id,
            fc.no_of_students,
            fc.created_at,
            fc.updated_at
     FROM fastrack_courses fc
     WHERE fc.id = $1
     LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

async function findByInstanceAndYear(instanceId, academicYear) {
  const { rows } = await pool.query(
    `SELECT fc.id,
            fc.course_code,
            fc.course_name,
            fc.department_id,
            fc.ft_instance_id,
            fc.no_of_students,
            fc.created_at,
            fc.updated_at,
            d.dept_shortname,
            d.dept_name,
            ft.course_type,
            fi.ft_instance_name,
            fi.academic_year,
            COALESCE(fs.classes_conducted, 0) AS classes_conducted,
            COALESCE(fs.labs_conducted, 0) AS labs_conducted,
            fs.status AS staff_status
     FROM fastrack_courses fc
     LEFT JOIN departments d ON d.id = fc.department_id
     LEFT JOIN ftcourses ft ON ft.id = fc.ft_course_type_id
     JOIN fastrack_instances fi ON fi.id = fc.ft_instance_id
     LEFT JOIN LATERAL (
       SELECT fs.classes_conducted, fs.labs_conducted, fs.status
       FROM fastrack_staffs fs
       WHERE fs.course_id = fc.id
       LIMIT 1
     ) fs ON true
     WHERE fi.id = $1 AND fi.academic_year = $2
     ORDER BY fc.id ASC`,
    [instanceId, academicYear]
  );
  return rows;
}

async function checkDuplicate(courseCode, instanceId, excludeId = null) {
  let query = `SELECT id FROM fastrack_courses WHERE course_code = $1 AND ft_instance_id = $2`;
  const params = [courseCode, instanceId];
  if (excludeId) {
    query += ` AND id != $3`;
    params.push(excludeId);
  }
  const { rows } = await pool.query(query + ` LIMIT 1`, params);
  return rows[0] || null;
}

async function create({ course_code, course_name, department_id, ft_instance_id, no_of_students }) {
  const { rows } = await pool.query(
    `INSERT INTO fastrack_courses (course_code, course_name, department_id, ft_instance_id, no_of_students, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
     RETURNING id, course_code, course_name, department_id, ft_instance_id, no_of_students, created_at, updated_at`,
    [course_code, course_name, department_id, ft_instance_id, no_of_students]
  );
  return rows[0];
}

async function update(id, { course_code, course_name, department_id, ft_instance_id, no_of_students }) {
  const updates = [];
  const values = [];
  let idx = 1;

  if (course_code !== undefined) {
    updates.push(`course_code = $${idx++}`);
    values.push(course_code);
  }
  if (course_name !== undefined) {
    updates.push(`course_name = $${idx++}`);
    values.push(course_name);
  }
  if (department_id !== undefined) {
    updates.push(`department_id = $${idx++}`);
    values.push(department_id);
  }
  if (ft_instance_id !== undefined) {
    updates.push(`ft_instance_id = $${idx++}`);
    values.push(ft_instance_id);
  }
  if (no_of_students !== undefined) {
    updates.push(`no_of_students = $${idx++}`);
    values.push(no_of_students);
  }

  if (updates.length === 0) {
    return findById(id);
  }

  values.push(id);
  const { rows } = await pool.query(
    `UPDATE fastrack_courses SET ${updates.join(', ')}, updated_at = NOW()
     WHERE id = $${idx}
     RETURNING id, course_code, course_name, department_id, ft_instance_id, no_of_students, created_at, updated_at`,
    values
  );
  return rows[0] || null;
}

async function remove(id) {
  const { rows } = await pool.query(
    `DELETE FROM fastrack_courses
     WHERE id = $1
     RETURNING id, course_code, course_name`,
    [id]
  );
  return rows[0] || null;
}

async function findDepartments() {
  const { rows } = await pool.query(
    `SELECT id, dept_name, dept_shortname FROM departments ORDER BY dept_name ASC`
  );
  return rows;
}

async function findInstances() {
  const { rows } = await pool.query(
    `SELECT id, ft_instance_name, academic_year FROM fastrack_instances ORDER BY ft_instance_name ASC`
  );
  return rows;
}

async function findCourseTypes() {
  const { rows } = await pool.query(
    `SELECT id, course_type FROM ftcourses ORDER BY course_type ASC`
  );
  return rows;
}

module.exports = {
  findAll,
  findById,
  findByInstanceAndYear,
  checkDuplicate,
  create,
  update,
  remove,
  findDepartments,
  findInstances,
  findCourseTypes,
};
