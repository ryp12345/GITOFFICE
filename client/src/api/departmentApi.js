import axios from './axios';

const tokenHeaders = (token) => {
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const getDepartments = async (token) => {
  return axios.get('/departments', {
    headers: tokenHeaders(token),
  });
};

export const getDepartment = async (id, token) => {
  return axios.get(`/departments/${id}`, {
    headers: tokenHeaders(token),
  });
};

export const createDepartment = async (payload, token) => {
  return axios.post('/departments', payload, {
    headers: tokenHeaders(token),
  });
};

export const updateDepartment = async (id, payload, token) => {
  return axios.put(`/departments/${id}`, payload, {
    headers: tokenHeaders(token),
  });
};

export const deleteDepartment = async (id, token) => {
  return axios.delete(`/departments/${id}`, {
    headers: tokenHeaders(token),
  });
};
