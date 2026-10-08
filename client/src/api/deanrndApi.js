import axios from './axios';

const tokenHeaders = (token) => {
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const getDeanRndDashboard = async (token) => {
  return axios.get('/deanrnd/dashboard', {
    headers: tokenHeaders(token),
  });
};

// `report` is a key of the server's department report registry (same keys as the HOD pages).
export const getDeanRndReport = async (token, report) => {
  return axios.get(`/deanrnd/reports/${report}`, {
    headers: tokenHeaders(token),
  });
};
