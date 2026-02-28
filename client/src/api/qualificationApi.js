import axios from './axios';

const tokenHeaders = (token) => {
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const getQualifications = async (token) => {
  return axios.get('/qualifications', {
    headers: tokenHeaders(token),
  });
};

export const getQualification = async (id, token) => {
  return axios.get(`/qualifications/${id}`, {
    headers: tokenHeaders(token),
  });
};

export const createQualification = async (payload, token) => {
  return axios.post('/qualifications', payload, {
    headers: tokenHeaders(token),
  });
};

export const updateQualification = async (id, payload, token) => {
  return axios.put(`/qualifications/${id}`, payload, {
    headers: tokenHeaders(token),
  });
};

export const deleteQualification = async (id, token) => {
  return axios.delete(`/qualifications/${id}`, {
    headers: tokenHeaders(token),
  });
};
