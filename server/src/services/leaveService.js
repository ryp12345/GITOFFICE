const db = require('../models');

/**
 * Inactivate previous year's leave_staff_entitlements rows.
 * If `tx` is provided, it will be used; otherwise a transaction is started.
 */
async function inactivatePreviousYear(tx = null) {
  const year = new Date().getFullYear() - 1;
  const sequelize = db.sequelize;
  let localTx = tx;
  let createdTx = false;
  try {
    if (!localTx) {
      localTx = await sequelize.transaction();
      createdTx = true;
    }

    const [result] = await sequelize.query(
      `UPDATE leave_staff_entitlements
       SET status = 'inactive', updated_at = NOW()
       WHERE year = :year AND status = 'active'`,
      { replacements: { year }, transaction: localTx }
    );

    if (createdTx) await localTx.commit();
    return result;
  } catch (err) {
    if (createdTx && localTx) await localTx.rollback();
    throw err;
  }
}

/**
 * Upsert monthly CL entitlement.
 * - Ensures a leave_staff_entitlements row exists for the given staff/leave/year.
 * - Applies `grant` to the month's slot in `monthly_grant_log` (JSON) and increments `entitled_curr_year` up to `max_entitlement` if available.
 * This is a lightweight implementation intended as a skeleton to be expanded.
 */
async function upsertMonthlyClEntitlement(tx = null, staffId, leaveId, year, month, grant = 0) {
  const sequelize = db.sequelize;
  let localTx = tx;
  let createdTx = false;
  try {
    if (!localTx) {
      localTx = await sequelize.transaction();
      createdTx = true;
    }

    const selectSql = `SELECT * FROM leave_staff_entitlements WHERE staff_id = :staffId AND leave_id = :leaveId AND year = :year LIMIT 1`;
    const [rows] = await sequelize.query(selectSql, { replacements: { staffId, leaveId, year }, transaction: localTx });

    // load leave to respect max_entitlement cap
    const [leaveRows] = await sequelize.query('SELECT max_entitlement FROM leaves WHERE id = :leaveId LIMIT 1', { replacements: { leaveId }, transaction: localTx });
    const leaveMax = (leaveRows && leaveRows[0] && Number(leaveRows[0].max_entitlement)) || 0;

    const monthKeys = [null,'jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
    const monthKey = monthKeys[month] || 'jan';

    if (!rows || rows.length === 0) {
      const monthlyGrantLog = {};
      monthKeys.slice(1).forEach((k) => monthlyGrantLog[k] = 0);

      // compute grant respecting max_entitlement
      const grantToApply = Math.min(Math.max(Number(grant) || 0, 0), leaveMax);
      monthlyGrantLog[monthKey] = grantToApply;

      const insertSql = `INSERT INTO leave_staff_entitlements (staff_id, leave_id, year, entitled_curr_year, monthly_grant_log, wef, status)
        VALUES (:staffId, :leaveId, :year, :entitled, :monthly_grant_log, :wef, 'active')`;

      await sequelize.query(insertSql, {
        replacements: {
          staffId,
          leaveId,
          year,
          entitled: grantToApply,
          monthly_grant_log: JSON.stringify(monthlyGrantLog),
          wef: `${year}-01-01`,
        },
        transaction: localTx,
      });
    } else {
      const row = rows[0];
      let monthlyGrantLog = {};
      try { monthlyGrantLog = row.monthly_grant_log ? JSON.parse(row.monthly_grant_log) : {}; } catch(_) { monthlyGrantLog = {} }

      const currentEntitled = Number(row.entitled_curr_year || 0);
      const remainingEntitlement = Math.max(leaveMax - currentEntitled, 0);
      const grantToApply = Math.min(Math.max(Number(grant) || 0, 0), remainingEntitlement);

      monthlyGrantLog[monthKey] = (monthlyGrantLog[monthKey] || 0) + grantToApply;

      const newEntitled = currentEntitled + grantToApply;
      const updateSql = `UPDATE leave_staff_entitlements SET entitled_curr_year = :entitled, monthly_grant_log = :monthly_grant_log WHERE id = :id`;
      await sequelize.query(updateSql, {
        replacements: { entitled: newEntitled, monthly_grant_log: JSON.stringify(monthlyGrantLog), id: row.id },
        transaction: localTx,
      });
    }

    if (createdTx) await localTx.commit();
    return true;
  } catch (err) {
    if (createdTx && localTx) await localTx.rollback();
    throw err;
  }
}

module.exports = {
  inactivatePreviousYear,
  upsertMonthlyClEntitlement,
};
