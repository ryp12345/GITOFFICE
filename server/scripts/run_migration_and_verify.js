const fs = require('fs');
const path = require('path');
const { pool } = require('../config/db');

async function applyMigration() {
  /*
  const file = path.resolve(__dirname, '..', 'db', 'migrations', '0001_create_scheduled_job_runs.sql');
  const sql = fs.readFileSync(file, 'utf8');
  console.log('Applying migration:', file);
  await pool.query(sql);
  console.log('Migration applied.');
  */
  console.log('applyMigration disabled (commented out)');
  return;
}

async function runJob() {
  console.log('Invoking job: inactivate_previous_year');
  const jobs = require('../src/jobs/ScheduledJobs');
  if (typeof jobs.inactivate_previous_year !== 'function') {
    throw new Error('Job function not found: inactivate_previous_year');
  }
  await jobs.inactivate_previous_year();
  console.log('Job invocation complete.');
}

async function verify() {
  const year = new Date().getFullYear() - 1;
  const { rows } = await pool.query(
    'SELECT COUNT(*)::int AS cnt FROM leave_staff_entitlements WHERE year = $1 AND status = $2',
    [year, 'active']
  );
  console.log(`Active leave_staff_entitlements rows for ${year}:`, rows[0].cnt);
}

(async () => {
  try {
    await applyMigration();
    await runJob();
    await verify();
    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    try { await pool.end(); } catch(_){}
    process.exit(1);
  }
})();
