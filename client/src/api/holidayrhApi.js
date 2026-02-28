import axios from './axios';

const tokenHeaders = (token) => (token ? { Authorization: `Bearer ${token}` } : {});

export const getHolidayRHList = async (token) => {
  return axios.get('/holidayrhs', {
    headers: tokenHeaders(token),
  });
};

export const createHolidayRH = async (payload, token) => {
  return axios.post('/holidayrhs', payload, {
    headers: tokenHeaders(token),
  });
};

export const updateHolidayRH = async (id, payload, token) => {
  return axios.put(`/holidayrhs/${id}`, payload, {
    headers: tokenHeaders(token),
  });
};

export const deleteHolidayRH = async (id, token) => {
  return axios.delete(`/holidayrhs/${id}`, {
    headers: tokenHeaders(token),
  });
};
