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
