import axios from './axios';

const tokenHeaders = (token) => {
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Dashboard summary shared by the Principal and Dean Admin portals.
export const getPrincipalDashboard = async (token) => {
  return axios.get('/principal/dashboard', {
    headers: tokenHeaders(token),
  });
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

// Faculty Recruitment (read-only, every department). Same { rows } payload as the HOD lists.
export const getPrincipalAssociateProfessorApplications = async () => {
  return axios.get('/principal/faculty-recruitment/associate-professor-applications');
};

export const getPrincipalProfessorApplications = async () => {
  return axios.get('/principal/faculty-recruitment/professor-applications');
};
