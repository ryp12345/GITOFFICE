import axios from './axios';

const tokenHeaders = (token) => {
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const getReligions = async (token) => {
  return axios.get('/religions', {
    headers: tokenHeaders(token),
  });
};

export const getReligion = async (id, token) => {
  return axios.get(`/religions/${id}`, {
    headers: tokenHeaders(token),
  });
};

export const createReligion = async (payload, token) => {
  return axios.post('/religions', payload, {
    headers: tokenHeaders(token),
  });
};

export const updateReligion = async (id, payload, token) => {
  return axios.put(`/religions/${id}`, payload, {
    headers: tokenHeaders(token),
  });
};

export const deleteReligion = async (id, token) => {
  return axios.delete(`/religions/${id}`, {
    headers: tokenHeaders(token),
  });
};
