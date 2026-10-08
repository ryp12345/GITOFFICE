const { pool } = require('../config/db');

// Institution-wide figures on the Laravel Dean R&D dashboard (DeanRndController::dashboard)
// that are not simply the size of one report listing.

// SUM(fund_received) over every funded project, as funded_project::sum('fund_received').
async function totalFundsReceived() {
  const { rows } = await pool.query(
    'SELECT COALESCE(SUM(fund_received), 0) AS total FROM funded_projects WHERE fund_received IS NOT NULL'
  );
  return Number(rows[0].total) || 0;
}

// "GIT Events": activities and conferences attended with KLS GIT as the sponsor. Laravel ended
// the first count with a stray semicolon, so the conference half was never added; both are
// summed here as the code intended.
async function gitSponsoredEventCount() {
  const { rows } = await pool.query(
    `SELECT (SELECT COUNT(*) FROM professional_activity_attendees WHERE sponsored_by = 'KLS GIT')
          + (SELECT COUNT(*) FROM conferences_attendees WHERE sponsored_by = 'KLS GIT') AS total`
  );
  return Number(rows[0].total) || 0;
}

// PhD holders ("Scholars") and PhD candidates ("Research Scholars"). qualification_staff.status
// is CHECK-constrained to the spelling 'Persuing', which Laravel matched. A staff member with
// two PhD rows in the same state is listed once.
async function listPhdStaff(status) {
  const { rows } = await pool.query(
    `SELECT DISTINCT ON (s.id) s.id AS staff_id, s.fname, s.mname, s.lname
       FROM qualification_staff qs
       JOIN qualifications q ON q.id = qs.qualification_id
       JOIN staff s ON s.id = qs.staff_id
      WHERE q.qual_shortname = 'PhD'
        AND qs.status = $1
      ORDER BY s.id`,
    [status]
  );

  return rows.sort((a, b) =>
    [a.fname, a.mname, a.lname].join(' ').localeCompare([b.fname, b.mname, b.lname].join(' '))
  );
}

module.exports = {
  totalFundsReceived,
  gitSponsoredEventCount,
  listPhdStaff,
};
