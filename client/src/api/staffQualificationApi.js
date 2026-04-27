import axios from './axios';

const tokenHeaders = (token) => {
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const getStaffQualifications = async (staffId, token) => {
  return axios.get(`/staff-qualifications/${staffId}`, {
    headers: tokenHeaders(token),
  });
};

export const createStaffQualification = async (staffId, payload, token) => {
  return axios.post(`/staff-qualifications/${staffId}`, payload, {
    headers: tokenHeaders(token),
  });
};

export const updateStaffQualification = async (id, payload, token) => {
  return axios.put(`/staff-qualifications/record/${id}`, payload, {
    headers: tokenHeaders(token),
  });
};

export const deleteStaffQualification = async (id, token) => {
  return axios.delete(`/staff-qualifications/record/${id}`, {
    headers: tokenHeaders(token),
  });
};
