import axios from './axios';

const tokenHeaders = (token) => {
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const getRemunerationHeads = async (token) => {
  return axios.get('/remunerationheads', {
    headers: tokenHeaders(token),
  });
};

export const getRemunerationHead = async (id, token) => {
  return axios.get(`/remunerationheads/${id}`, {
    headers: tokenHeaders(token),
  });
};

export const createRemunerationHead = async (payload, token) => {
  return axios.post('/remunerationheads', payload, {
    headers: tokenHeaders(token),
  });
};

export const updateRemunerationHead = async (id, payload, token) => {
  return axios.put(`/remunerationheads/${id}`, payload, {
    headers: tokenHeaders(token),
  });
};

export const deleteRemunerationHead = async (id, token) => {
  return axios.delete(`/remunerationheads/${id}`, {
    headers: tokenHeaders(token),
  });
};
