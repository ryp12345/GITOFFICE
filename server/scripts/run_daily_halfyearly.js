#!/usr/bin/env node
// Small smoke runner to execute daily_Non_Vacational_EL and halfyearlyEL
const jobs = require('../src/jobs/ScheduledJobs');

(async () => {
  try {
    console.log('Starting smoke run: daily_Non_Vacational_EL');
    const r1 = await jobs.daily_Non_Vacational_EL({});
    console.log('daily_Non_Vacational_EL result:', r1);

    console.log('Starting smoke run: halfyearlyEL');
    const r2 = await jobs.halfyearlyEL({});
    console.log('halfyearlyEL result:', r2);

    console.log('Smoke run completed');
    process.exit(0);
  } catch (err) {
    console.error('Smoke run failed:', err && err.message);
    process.exit(2);
  }
})();
