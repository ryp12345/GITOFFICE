const cron = require('node-cron');
const Jobs = require('./ScheduledJobs');

const { SCHEDULES, TZ } = require('./schedules');

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

for (const schedule of SCHEDULES) {
  cron.schedule(schedule.cron, safeRun(schedule.job, Jobs[schedule.job]), { timezone: TZ });
}

module.exports = {
  SCHEDULES,
  TZ,
  // expose for testing
  _cron: cron,
};
