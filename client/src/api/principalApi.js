import axios from './axios';

const tokenHeaders = (token) => {
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const getPrincipalLeaveApplications = async (token, params = {}) => {
  return axios.get('/principal/leave-applications', {
    headers: tokenHeaders(token),
    params,
  });
};

export const approvePrincipalLeaveApplication = async (token, applicationId) => {
  return axios.post(`/principal/leave-applications/${applicationId}/approve`, {}, {
    headers: tokenHeaders(token),
  });
};

export const rejectPrincipalLeaveApplication = async (token, applicationId) => {
  return axios.post(`/principal/leave-applications/${applicationId}/reject`, {}, {
    headers: tokenHeaders(token),
  });
};
