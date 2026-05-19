const cron = require('node-cron');
const Jobs = require('./ScheduledJobs');

// Mirror Laravel schedule (Asia/Kolkata timezone)
const TZ = 'Asia/Kolkata';

function safeRun(jobName, fn) {
  return async () => {
    try {
      console.log(`[scheduler] starting ${jobName} at ${new Date().toISOString()}`);
      await fn({ fromApi: false });
      console.log(`[scheduler] finished ${jobName} at ${new Date().toISOString()}`);
    } catch (err) {
      console.error(`[scheduler] ${jobName} failed:`, err && err.stack ? err.stack : err);
    }
  };
}

// Dec 26 @ 00:00 (yearly)
cron.schedule('0 0 26 12 *', safeRun('yearly_leave_entitlements', Jobs.yearly_leave_entitlements), { timezone: TZ });

// Jan 1 @ 00:00 (yearly)
cron.schedule('0 0 1 1 *', safeRun('inactivate_previous_year', Jobs.inactivate_previous_year), { timezone: TZ });

// 1st of month @ 00:00 (monthly)
cron.schedule('0 0 1 * *', safeRun('monthly_leave_entitlements', Jobs.monthly_leave_entitlements), { timezone: TZ });

// Daily @ 00:00
cron.schedule('0 0 * * *', safeRun('daily_Non_Vacational_EL', Jobs.daily_Non_Vacational_EL), { timezone: TZ });

// Jun 27 @ 00:00 (yearly)
cron.schedule('0 0 27 6 *', safeRun('halfyearlyEL', Jobs.halfyearlyEL), { timezone: TZ });

// Daily @ 10:54 (matches Laravel `sendMissingPunchesEmail` dailyAt('10:54'))
// cron.schedule('54 10 * * *', safeRun('sendMissingPunchesEmail', Jobs.sendMissingPunchesEmail), { timezone: TZ });

//console.log('[scheduler] job scheduler initialized (mirrors Laravel Kernel)');

module.exports = {
  // expose for testing
  _cron: cron,
};
