let scheduledJobRun;
try {
  scheduledJobRun = require('../models/scheduled_job_run.model');
} catch (e) {
  // Fallback: provide no-op implementations so scheduling logic can run without DB
  //console.warn('scheduled_job_run.model not found — job run persistence disabled');
  scheduledJobRun = {
    createRun: async ({ job_name, status = 'running', meta = null } = {}) => ({ id: null, job_name, status, meta }),
    finishRun: async (id, { status = 'success', meta = null } = {}) => null,
    findById: async (id) => null,
    listRecent: async (limit = 50) => [],
  };
}

async function startRun(jobName, meta = null) {
  const rec = await scheduledJobRun.createRun({ job_name: jobName, status: 'running', meta });
  return rec;
}

async function finishRun(id, status = 'success', meta = null) {
  const rec = await scheduledJobRun.finishRun(id, { status, meta });
  return rec;
}

async function getRun(id) {
  return scheduledJobRun.findById(id);
}

async function listRecent(limit = 50) {
  return scheduledJobRun.listRecent(limit);
}

module.exports = { startRun, finishRun, getRun, listRecent };
