import axios from './axios';

const tokenHeaders = (token) => {
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const getDesignations = async (token) => {
  return axios.get('/designations', {
    headers: tokenHeaders(token),
  });
};

export const createDesignation = async (data, token) => {
  return axios.post('/designations', data, {
    headers: tokenHeaders(token),
  });
};

export const updateDesignation = async (id, data, token) => {
  return axios.put(`/designations/${id}`, data, {
    headers: tokenHeaders(token),
  });
};

export const deleteDesignation = async (id, token) => {
  return axios.delete(`/designations/${id}`, {
    headers: tokenHeaders(token),
  });
};
