const { pool } = require('../config/db');

// Fetch all leave applications for IT Cell department
async function listItCellLeaveApplications(req, res, next) {
  try {
    // Get IT Cell department id
    const deptResult = await pool.query(
      "SELECT id FROM departments WHERE LOWER(dept_name) = 'it cell' LIMIT 1"
    );
    if (!deptResult.rows.length) {
      return res.status(404).json({ success: false, message: 'IT Cell department not found' });
    }
    const itCellDeptId = deptResult.rows[0].id;

    // Get all staff ids in IT Cell
    const staffResult = await pool.query(
      'SELECT staff_id FROM department_staff WHERE department_id = $1 AND LOWER(COALESCE(status,\'active\')) = \'active\'',
      [itCellDeptId]
    );
    const staffIds = staffResult.rows.map(r => r.staff_id);
    if (!staffIds.length) {
      return res.json({ success: true, data: { department: { id: itCellDeptId, dept_name: 'IT Cell' }, applications: [] } });
    }

    // Filter by year: use query param or default to current year
    const year = req.query.year ? String(req.query.year) : String(new Date().getFullYear());

    const leaveResult = await pool.query(
      `SELECT
        lsa.id,
        lsa.leave_id,
        lsa.staff_id,
        lsa.alternate,
        lsa.additional_alternate,
        lsa.reason,
        lsa.recommender,
        lsa.approver,
        TO_CHAR(lsa.start::date, 'YYYY-MM-DD') AS start_date,
        TO_CHAR(lsa.end::date, 'YYYY-MM-DD') AS end_date,
        lsa.no_of_days,
        lsa.appl_status,
        lsa.leave_status,
        lsa.year,
        TO_CHAR(lsa.created_at::date, 'YYYY-MM-DD') AS application_date,
        l.shortname AS leave_shortname,
        l.longname AS leave_longname,
        TRIM(CONCAT_WS(' ', s1.fname, s1.mname, s1.lname)) AS staff_name,
        TRIM(CONCAT_WS(' ', s2.fname, s2.mname, s2.lname)) AS alternate_staff,
        TRIM(CONCAT_WS(' ', s3.fname, s3.mname, s3.lname)) AS additional_alternate_staff,
        CASE
          WHEN lsa.cl_type = 'Morning' THEN CONCAT(l.shortname, ' -Morning')
          WHEN lsa.cl_type = 'Afternoon' THEN CONCAT(l.shortname, ' -Afternoon')
          ELSE l.shortname
        END AS title
      FROM leave_staff_applications lsa
      JOIN leaves l ON l.id = lsa.leave_id
      JOIN staff s1 ON s1.id = lsa.staff_id
      LEFT JOIN staff s2 ON s2.id = lsa.alternate
      LEFT JOIN staff s3 ON s3.id = lsa.additional_alternate
      WHERE lsa.staff_id = ANY($1::int[])
        AND lsa.year = $2
      ORDER BY
        CASE lsa.appl_status
          WHEN 'pending' THEN 1
          WHEN 'recommended' THEN 2
          WHEN 'approved' THEN 3
          WHEN 'rejected' THEN 4
          WHEN 'cancelled' THEN 5
          ELSE 6
        END,
        lsa.id DESC`,
      [staffIds, year]
    );

    return res.json({
      success: true,
      data: {
        department: { id: itCellDeptId, dept_name: 'IT Cell' },
        applications: leaveResult.rows,
      },
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listItCellLeaveApplications,
};
