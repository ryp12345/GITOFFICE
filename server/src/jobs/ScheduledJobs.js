// Job implementations for scheduled tasks. Import services as needed.
const leaveService = require('../services/leaveService');
const jobRunService = require('../services/jobRunService');
const staffModel = require('../models/staff.model');
const leaveModel = require('../models/leave.model');
const { pool } = require('../config/db');

async function yearly_leave_entitlements(context = {}) {
  console.log('Running job: yearly_leave_entitlements');
  const initiatedBy = context.fromApi ? (context.userId || 'api') : 'cli';
  let run = null;
  try { run = await jobRunService.startRun('yearly_leave_entitlements', { initiatedBy }); } catch (e) { console.warn('Could not record job run start:', e && e.message); }

  const year = Number(context.year) || new Date().getFullYear();
  try {
    // Find leave types with max_entitlement > 0
    const leaves = await leaveModel.getAll();
    const eligibleLeaves = leaves.filter(l => l && Number(l.max_entitlement) > 0 && l.status && String(l.status).toLowerCase().trim() === 'active' && !(String(l.shortname||'').toUpperCase().includes('SML')) && (String(l.shortname||'').toUpperCase() !== 'ML'));

    const staffs = await staffModel.findAll();
    let inserted = 0;

    for (const s of staffs) {
      for (const lv of eligibleLeaves) {
        const leaveId = Number(lv.id);
        const staffId = Number(s.id);
        const { rows } = await pool.query('SELECT id FROM leave_staff_entitlements WHERE staff_id = $1 AND leave_id = $2 AND year = $3 LIMIT 1', [staffId, leaveId, year]);
        if (!rows || rows.length === 0) {
          const monthlyGrantLog = {};
          ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'].forEach(m => monthlyGrantLog[m]=0);
          await pool.query(
            `INSERT INTO leave_staff_entitlements (year, staff_id, leave_id, entitled_curr_year, monthly_grant_log, wef, status, created_at, updated_at)
             VALUES ($1,$2,$3,$4,$5,$6,'active', NOW(), NOW())`,
            [year, staffId, leaveId, Number(lv.max_entitlement) || 0, JSON.stringify(monthlyGrantLog), `${year}-01-01`]
          );
          inserted++;
        }
      }
    }

    if (run) { try { await jobRunService.finishRun(run.id, 'success', { inserted }); } catch (e) { console.warn('Could not record job success:', e && e.message); } }
    console.log('yearly_leave_entitlements completed; inserted:', inserted);
    return { inserted };
  } catch (err) {
    console.error('yearly_leave_entitlements failed:', err);
    if (run) { try { await jobRunService.finishRun(run.id, 'failed', { error: err && err.message }); } catch (e) { console.warn('Could not record job failure:', e && e.message); } }
    throw err;
  }
}

async function inactivate_previous_year(context = {}) {
  console.log('Running job: inactivate_previous_year');
  const initiatedBy = context.fromApi ? (context.userId || 'api') : 'cli';
  let run = null;
  try {
    run = await jobRunService.startRun('inactivate_previous_year', { initiatedBy });
  } catch (e) {
    // Non-fatal: proceed without run logging if startRun fails
    console.warn('Could not record job run start:', e && e.message);
  }

  try {
    const res = await leaveService.inactivatePreviousYear();
    console.log('inactivate_previous_year completed:', res);
    if (run) {
      try { await jobRunService.finishRun(run.id, 'success', { result: res }); } catch (e) { console.warn('Could not record job success:', e && e.message); }
    }
    return res;
  } catch (err) {
    console.error('inactivate_previous_year failed:', err);
    if (run) {
      try { await jobRunService.finishRun(run.id, 'failed', { error: err && err.message }); } catch (e) { console.warn('Could not record job failure:', e && e.message); }
    }
    throw err;
  }
}

async function monthly_leave_entitlements() {
  console.log('Running job: monthly_leave_entitlements');
  const context = arguments[0] || {};
  const initiatedBy = context.fromApi ? (context.userId || 'api') : 'cli';
  let run = null;
  try { run = await jobRunService.startRun('monthly_leave_entitlements', { initiatedBy }); } catch (e) { console.warn('Could not record job run start:', e && e.message); }

  const month = Number(context.month) || (new Date().getMonth() + 1);
  const year = Number(context.year) || new Date().getFullYear();
  const grant = Number(context.grant) || 1;

  try {
    // find CL leave id (casual leave) by shortname 'CL'
    const leaves = await leaveModel.getAll();
    const cl = leaves.find(l => (l.shortname || '').toUpperCase().trim() === 'CL');
    if (!cl) {
      console.warn('CL leave type not found; skipping monthly grants');
      if (run) { try { await jobRunService.finishRun(run.id, 'success', { applied: 0 }); } catch (e) {} }
      return { applied: 0 };
    }

    const staffs = await staffModel.findAll();
    let applied = 0;
    for (const s of staffs) {
      try {
        await leaveService.upsertMonthlyClEntitlement(null, Number(s.id), Number(cl.id), year, month, grant);
        applied++;
      } catch (err) {
        console.warn('Failed to apply monthly entitlement for staff', s.id, err && err.message);
      }
    }

    if (run) { try { await jobRunService.finishRun(run.id, 'success', { applied }); } catch (e) { console.warn('Could not record job success:', e && e.message); } }
    console.log('monthly_leave_entitlements applied to staff count:', applied);
    return { applied };
  } catch (err) {
    console.error('monthly_leave_entitlements failed:', err);
    if (run) { try { await jobRunService.finishRun(run.id, 'failed', { error: err && err.message }); } catch (e) { console.warn('Could not record job failure:', e && e.message); } }
    throw err;
  }
}

async function daily_Non_Vacational_EL() {
  console.log('Running job: daily_Non_Vacational_EL');
  const context = arguments[0] || {};
  const initiatedBy = context.fromApi ? (context.userId || 'api') : 'cli';
  let run = null;
  try { run = await jobRunService.startRun('daily_Non_Vacational_EL', { initiatedBy }); } catch (e) { console.warn('Could not record job run start:', e && e.message); }

  try {
    const now = new Date();
    const year = Number(context.year) || now.getFullYear();
    const month = now.getMonth() + 1;
    const day = now.getDate();

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // find non-vacational EL leave
      const { rows: leaves } = await client.query(
        "SELECT * FROM leaves WHERE LOWER(shortname) = 'el' AND LOWER(vacation_type) = 'non-vacational' AND LOWER(status) = 'active' LIMIT 1"
      );
      const leave = leaves && leaves[0];
      if (!leave) {
        console.log('No non-vacational EL leave found; nothing to do');
        await client.query('COMMIT');
        if (run) { try { await jobRunService.finishRun(run.id, 'success', { applied: 0 }); } catch (e) {} }
        return { applied: 0 };
      }

      const { rows: entitlements } = await client.query(
        'SELECT * FROM leave_staff_entitlements WHERE leave_id = $1 AND year = $2 AND status = $3',
        [leave.id, year, 'active']
      );

      let applied = 0;

      for (const eRow of entitlements) {
        // find earliest additional non-vacational designation start_date for this staff before current year
        const { rows: desRows } = await client.query(
          `SELECT start_date FROM designation_staff
           WHERE status = 'active' AND EXTRACT(YEAR FROM start_date) < $1
           AND designation_id IN (SELECT id FROM designations WHERE isadditional = 1 AND LOWER(isvacational) = 'non-vacational' AND status = 'active')
           AND staff_id = $2
           ORDER BY start_date LIMIT 1`,
          [year, eRow.staff_id]
        );

        if (!desRows || desRows.length === 0) continue;
        const startDate = desRows[0].start_date;
        const sDate = new Date(startDate);
        const sMonth = sDate.getMonth() + 1;
        const sDay = sDate.getDate();

        if (sMonth === month && sDay === day) {
          const { rows: staffRows } = await client.query('SELECT date_of_superanuation FROM staff WHERE id = $1 LIMIT 1', [eRow.staff_id]);
          const staff = staffRows && staffRows[0];
          if (!staff || !staff.date_of_superanuation) continue;

          const retirementDate = new Date(staff.date_of_superanuation);
          const retirementYear = retirementDate.getFullYear();

          let newEntitled = Number(leave.max_entitlement) || 0;
          if (retirementYear === year && retirementDate > sDate) {
            const diffMs = retirementDate - sDate;
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
            const extra = Math.round((Number(leave.max_entitlement) || 0) * diffDays / 365);
            newEntitled = (Number(leave.max_entitlement) || 0) + extra;
          }

          await client.query('UPDATE leave_staff_entitlements SET entitled_curr_year = $1, updated_at = NOW() WHERE id = $2', [newEntitled, eRow.id]);
          applied++;
        }
      }

      await client.query('COMMIT');
      if (run) { try { await jobRunService.finishRun(run.id, 'success', { applied }); } catch (e) {} }
      console.log('daily_Non_Vacational_EL applied to entitlements:', applied);
      return { applied };
    } catch (errInner) {
      await client.query('ROLLBACK');
      throw errInner;
    } finally {
      client.release();
    }
  } catch (err) {
    if (run) { try { await jobRunService.finishRun(run.id, 'failed', { error: err && err.message }); } catch (e) {} }
    throw err;
  }
}

async function halfyearlyEL() {
  console.log('Running job: halfyearlyEL');
  const context = arguments[0] || {};
  const initiatedBy = context.fromApi ? (context.userId || 'api') : 'cli';
  let run = null;
  try { run = await jobRunService.startRun('halfyearlyEL', { initiatedBy }); } catch (e) { console.warn('Could not record job run start:', e && e.message); }

  try {
    const now = new Date();
    const year = Number(context.year) || now.getFullYear();

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // staff selection roughly matching Laravel query
      const staffSql = `SELECT staff.id, staff.fname, staff.mname, staff.lname, staff.date_of_superanuation
        FROM staff
        JOIN employee_types ON employee_types.staff_id = staff.id
        JOIN association_staff ON association_staff.staff_id = staff.id
        WHERE staff.id NOT IN (
          SELECT s.id FROM staff s
          JOIN designation_staff ON s.id = designation_staff.staff_id
          JOIN designations ON designation_staff.designation_id = designations.id
          WHERE designation_staff.status = 'active' AND designations.isadditional = 1 AND LOWER(designations.isvacational) = 'non-vacational'
        )
        AND employee_types.employee_type = 'teaching'
        AND association_staff.association_id IN (SELECT id FROM associations WHERE asso_name = 'Confirmed' OR asso_name = 'Promotional Probationary')
        AND association_staff.status = 'active'`;

      const { rows: staffRows } = await client.query(staffSql);

      const { rows: leaveRows } = await client.query(
        "SELECT * FROM leaves WHERE LOWER(vacation_type) = 'vacational' AND LOWER(shortname) = 'el' AND LOWER(status) = 'active' LIMIT 1"
      );
      const leave = leaveRows && leaveRows[0];
      if (!leave) {
        console.log('Vacational EL leave not found; nothing to do');
        await client.query('COMMIT');
        if (run) { try { await jobRunService.finishRun(run.id, 'success', { applied: 0 }); } catch (e) {} }
        return { applied: 0 };
      }

      let applied = 0;

      for (const st of staffRows) {
        const { rows: entRows } = await client.query(
          'SELECT * FROM leave_staff_entitlements WHERE staff_id = $1 AND leave_id = $2 AND year = $3 LIMIT 1',
          [st.id, leave.id, year]
        );
        if (!entRows || entRows.length === 0) continue;
        const ent = entRows[0];

        const dor = st.date_of_superanuation ? new Date(st.date_of_superanuation).getFullYear() : null;
        let max_entitlement_full = Number(leave.max_entitlement) || 0;
        if (dor === year && st.date_of_superanuation) {
          const retirementDate = new Date(st.date_of_superanuation);
          const firstOfJul = new Date(`${year}-07-01`);
          const noOfDaysRemaining = Math.max(0, Math.floor((retirementDate - firstOfJul) / (1000 * 60 * 60 * 24)));
          max_entitlement_full = Math.ceil(noOfDaysRemaining * (Number(leave.max_entitlement) || 0) / 365);
        }

        const newEntitled = (Number(ent.entitled_curr_year) || 0) + max_entitlement_full;
        await client.query('UPDATE leave_staff_entitlements SET entitled_curr_year = $1, updated_at = NOW() WHERE id = $2', [newEntitled, ent.id]);
        applied++;
      }

      await client.query('COMMIT');
      if (run) { try { await jobRunService.finishRun(run.id, 'success', { applied }); } catch (e) {} }
      console.log('halfyearlyEL applied to staff count:', applied);
      return { applied };
    } catch (errInner) {
      await client.query('ROLLBACK');
      throw errInner;
    } finally {
      client.release();
    }
  } catch (err) {
    if (run) { try { await jobRunService.finishRun(run.id, 'failed', { error: err && err.message }); } catch (e) {} }
    throw err;
  }
}

async function sendMissingPunchesEmail() {
  console.log('stub: sendMissingPunchesEmail');
}

module.exports = {
  yearly_leave_entitlements,
  inactivate_previous_year,
  monthly_leave_entitlements,
  daily_Non_Vacational_EL,
  halfyearlyEL,
  sendMissingPunchesEmail,
};
