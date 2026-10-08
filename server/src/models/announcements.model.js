const { pool } = require('../config/db');
const { toIsoDate } = require('../utils/pgDate');

// The Laravel egov and Dean R&D dashboards listed every event and notice (event::with('department')->get()),
// not just the admin's department, together with the departments each one was posted to.
async function listEvents() {
  const { rows } = await pool.query(
    `SELECT e.id, e.event_name, e.start_date, e.to_date, e.location, e.organizers,
            e.event_website, e.staff_type, e.attachment,
            COALESCE(
              ARRAY_AGG(DISTINCT d.dept_shortname) FILTER (WHERE d.id IS NOT NULL),
              '{}'
            ) AS departments
       FROM events e
       LEFT JOIN department_event de ON de.event_id = e.id
       LEFT JOIN departments d ON d.id = de.department_id
      GROUP BY e.id
      ORDER BY e.start_date DESC, e.id DESC`
  );
  return rows;
}

async function listNotices() {
  const { rows } = await pool.query(
    `SELECT n.id, n.title, n.date, n.description, n.staff_type,
            COALESCE(
              ARRAY_AGG(DISTINCT d.dept_shortname) FILTER (WHERE d.id IS NOT NULL),
              '{}'
            ) AS departments
       FROM notices n
       LEFT JOIN department_notice dn ON dn.notice_id = n.id
       LEFT JOIN departments d ON d.id = dn.department_id
      GROUP BY n.id
      ORDER BY n.date DESC, n.id DESC`
  );
  return rows.map((row) => ({ ...row, date: toIsoDate(row.date) }));
}

module.exports = {
  listEvents,
  listNotices,
};
