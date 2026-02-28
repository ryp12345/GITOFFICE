import axios from './axios';

const tokenHeaders = (token) => {
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const getInstitutions = async (token) => {
  return axios.get('/institutions', {
    headers: tokenHeaders(token),
  });
};

export const getInstitution = async (id, token) => {
  return axios.get(`/institutions/${id}`, {
    headers: tokenHeaders(token),
  });
};

export const createInstitution = async (payload, token) => {
  return axios.post('/institutions', payload, {
    headers: tokenHeaders(token),
  });
};

export const updateInstitution = async (id, payload, token) => {
  return axios.put(`/institutions/${id}`, payload, {
    headers: tokenHeaders(token),
  });
};

export const deleteInstitution = async (id, token) => {
  return axios.delete(`/institutions/${id}`, {
    headers: tokenHeaders(token),
  });
};
