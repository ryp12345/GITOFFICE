const { pool } = require('../config/db');
const { notExitedSql } = require('./biometricEligibility');

// Login account totals.
async function getAccountSummary() {
  const { rows } = await pool.query(`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE LOWER(COALESCE(status, '')) = 'active')::int AS active
    FROM users`);
  return rows[0] || { total: 0, active: 0 };
}

// Leave entitlement coverage for staff in service: shows whether the yearly / monthly
// entitlement jobs have run for this year.
async function getEntitlementCoverage(year) {
  const { rows } = await pool.query(`
    WITH in_service AS (
      SELECT s.id FROM staff s
      WHERE EXISTS (
        SELECT 1 FROM employee_types e
         WHERE e.staff_id = s.id AND LOWER(COALESCE(e.status, 'active')) = 'active'
      )
      AND ${notExitedSql('s')}
    )
    SELECT
      (SELECT COUNT(*) FROM in_service)::int AS staff_in_service,
      (SELECT COUNT(DISTINCT le.staff_id) FROM leave_staff_entitlements le
        WHERE le.year = $1 AND le.staff_id IN (SELECT id FROM in_service))::int AS covered_this_year`, [year]);
  return rows[0] || {};
}

module.exports = {
  getAccountSummary,
  getEntitlementCoverage,
};
