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
    const run = await jobRunService.startRun(jobName, { initiatedBy: req.user?.id || 'api' });
    try {
      const result = await jobFn({ fromApi: true, body: req.body });
      await jobRunService.finishRun(run.id, 'success', { result });
      return res.json({ ok: true, job: jobName, run });
    } catch (err) {
      await jobRunService.finishRun(run.id, 'failed', { error: err.message || String(err) });
      throw err;
    }
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
