import axios from './axios';

const tokenHeaders = (token) => {
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const getAssociations = async (token) => {
  return axios.get('/associations', {
    headers: tokenHeaders(token),
  });
};

export const createAssociation = async (payload, token) => {
  return axios.post('/associations', payload, {
    headers: tokenHeaders(token),
  });
};

export const updateAssociation = async (id, payload, token) => {
  return axios.put(`/associations/${id}`, payload, {
    headers: tokenHeaders(token),
  });
};

export const deleteAssociation = async (id, token) => {
  return axios.delete(`/associations/${id}`, {
    headers: tokenHeaders(token),
  });
};

export default { getAssociations, createAssociation, updateAssociation, deleteAssociation };
