import axios from './axios';

const tokenHeaders = (token) => {
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const getDepartmentOverview = async (token) => {
  return axios.get('/hod/department-overview', {
    headers: tokenHeaders(token),
  });
};

export const getMyStaff = async (token) => {
  return axios.get('/hod/my-staff', {
    headers: tokenHeaders(token),
  });
};

export const getHodLeaveApplications = async (token, params = {}) => {
  return axios.get('/hod/leave-applications', {
    headers: tokenHeaders(token),
    params,
  });
};

export const recommendHodLeaveApplication = async (token, applicationId) => {
  return axios.post(`/hod/leave-applications/${applicationId}/recommend`, {}, {
    headers: tokenHeaders(token),
  });
};

export const rejectHodLeaveApplication = async (token, applicationId) => {
  return axios.post(`/hod/leave-applications/${applicationId}/reject`, {}, {
    headers: tokenHeaders(token),
  });
};

export const bulkUpdateHodLeaveApplications = async (token, action, ids) => {
  return axios.post('/hod/leave-applications/bulk-action', {
    action,
    ids,
  }, {
    headers: tokenHeaders(token),
  });
};
