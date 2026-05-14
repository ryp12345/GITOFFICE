import api from './axios';

// List all available jobs and their schedules
export const listJobs = async () => {
  const response = await api.get('/jobs');
  return response.data;
};

// Run a job immediately
// jobName: string (e.g., 'yearly_leave_entitlements', 'inactivate_previous_year', etc.)
// options: object (optional) with year, month, or other job-specific params
export const runJob = async (jobName, options = {}) => {
  const response = await api.post('/jobs/run', {
    job: jobName,
    ...options,
  });
  return response.data;
};

// Get job execution logs
export const getJobLogs = async () => {
  const response = await api.get('/jobs/logs');
  return response.data;
};

export default {
  listJobs,
  runJob,
  getJobLogs,
};
