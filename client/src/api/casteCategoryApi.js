import axios from './axios';

const tokenHeaders = (token) => {
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const getCasteCategories = async (token, religionId) => {
  const params = religionId ? { params: { religionId } } : {};
  return axios.get('/castecategories', {
    headers: tokenHeaders(token),
    ...params,
  });
};

export const getCasteCategory = async (id, token) => {
  return axios.get(`/castecategories/${id}`, {
    headers: tokenHeaders(token),
  });
};

export const createCasteCategory = async (payload, token) => {
  return axios.post('/castecategories', payload, {
    headers: tokenHeaders(token),
  });
};

export const updateCasteCategory = async (id, payload, token) => {
  return axios.put(`/castecategories/${id}`, payload, {
    headers: tokenHeaders(token),
  });
};

export const deleteCasteCategory = async (id, token) => {
  return axios.delete(`/castecategories/${id}`, {
    headers: tokenHeaders(token),
  });
};
