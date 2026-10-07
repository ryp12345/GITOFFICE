import axios from './axios';

const tokenHeaders = (token) => {
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const getEgovDashboard = async (token) => {
  return axios.get('/egov/dashboard', {
    headers: tokenHeaders(token),
  });
};

// `report` is a key of the server's department report registry (same keys as the HOD pages).
export const getEgovReport = async (token, report) => {
  return axios.get(`/egov/reports/${report}`, {
    headers: tokenHeaders(token),
  });
};

export const validateEgovRecord = async (token, report, id, payload) => {
  return axios.patch(`/egov/reports/${report}/${id}/validation`, payload, {
    headers: tokenHeaders(token),
  });
};
