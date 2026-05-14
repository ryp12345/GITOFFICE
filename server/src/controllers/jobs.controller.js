const jobs = require('../jobs/ScheduledJobs');
const jobRunService = require('../services/jobRunService');

async function listJobs(_req, res) {
  res.json({ jobs: Object.keys(jobs) });
}

async function runJob(req, res, next) {
  const jobName = (req.body && req.body.job) || req.query.job;
  if (!jobName) {
    const err = new Error('Missing job name');
    err.statusCode = 400;
    return next(err);
  }

  const jobFn = jobs[jobName];
  if (typeof jobFn !== 'function') {
    const err = new Error('Unknown job: ' + jobName);
    err.statusCode = 404;
    return next(err);
  }

  try {
    // Job functions already handle run start/finish logging.
    const result = await jobFn({
      ...(req.body || {}),
      fromApi: true,
      userId: req.user?.id || 'api',
    });
    return res.json({ ok: true, job: jobName, result });
  } catch (err) {
    return next(err);
  }
}

async function getLogs(_req, res, next) {
  try {
    const rows = await jobRunService.listRecent(100);
    return res.json({ logs: rows });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  listJobs,
  runJob,
  getLogs,
};
