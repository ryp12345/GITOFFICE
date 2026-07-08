const { pool } = require('../../config/db');

async function getInsights() {
  const { rows } = await pool.query(
    `SELECT
        fc.id,
        fc.course_code,
        fc.course_name,
        fc.no_of_students,
        ft.course_type,
        d.dept_shortname,
        fi.ft_instance_name,
        fi.start_date,
        fi.end_date,
        fi.academic_year,
        s.scheme_name,
        fip.program_name,
        fip.semester,
        COALESCE(
          json_agg(
            json_build_object(
              'id', fs.id,
              'staff_name', TRIM(CONCAT(COALESCE(st.fname, ''), ' ', COALESCE(st.mname, ''), ' ', COALESCE(st.lname, ''))),
              'classes_conducted', fs.classes_conducted,
              'labs_conducted', fs.labs_conducted,
              'status', fs.status,
              'instructor_name', TRIM(CONCAT(COALESCE(inf.fname, ''), ' ', COALESCE(inf.mname, ''), ' ', COALESCE(inf.lname, ''))),
              'peon_name', TRIM(CONCAT(COALESCE(pn.fname, ''), ' ', COALESCE(pn.mname, ''), ' ', COALESCE(pn.lname, '')))
            )
          ) FILTER (WHERE fs.id IS NOT NULL),
          '[]'
        ) AS staff
     FROM fastrack_courses fc
     JOIN fastrack_staffs fs ON fs.course_id = fc.id AND fs.status = 'Approved'
     LEFT JOIN ftcourses ft ON ft.id = fc.ft_course_type_id
     LEFT JOIN departments d ON d.id = fc.department_id
     LEFT JOIN fastrack_instances fi ON fi.id = fc.ft_instance_id
     LEFT JOIN schemes s ON s.id = fi.scheme_id
     LEFT JOIN LATERAL (
        SELECT fip.semester, p.program_name
        FROM fastrack_instance_program fip
        LEFT JOIN programs p ON p.id = fip.program_id
        WHERE fip.fastrack_instance_id = fi.id
        LIMIT 1
     ) fip ON true
     LEFT JOIN staff st ON st.id = fs.staff_id
     LEFT JOIN staff inf ON inf.id = fs.instructor_foreman_id
     LEFT JOIN staff pn ON pn.id = fs.peon_attender_id
     GROUP BY fc.id, fc.course_code, fc.course_name, fc.no_of_students, ft.course_type, d.dept_shortname, fi.ft_instance_name, fi.start_date, fi.end_date, fi.academic_year, s.scheme_name, fip.program_name, fip.semester
     ORDER BY fc.id ASC`
  );
  return rows;
}

module.exports = {
  getInsights,
};