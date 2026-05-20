import axios from './axios';

const tokenHeaders = (token) => {
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const getDeanLeaveApplications = async (token, params = {}) => {
  return axios.get('/dean/leave-applications', {
    headers: tokenHeaders(token),
    params,
  });
};

export const approveDeanLeaveApplication = async (token, applicationId) => {
  return axios.post(`/dean/leave-applications/${applicationId}/approve`, {}, {
    headers: tokenHeaders(token),
  });
};

export const rejectDeanLeaveApplication = async (token, applicationId) => {
  return axios.post(`/dean/leave-applications/${applicationId}/reject`, {}, {
    headers: tokenHeaders(token),
  });
};
