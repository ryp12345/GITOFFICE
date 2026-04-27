import axios from './axios';

const tokenHeaders = (token) => {
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const getCoordinators = async (token) => {
  return axios.get('/coordinators', {
    headers: tokenHeaders(token),
  });
};

export const createCoordinator = async (payload, token) => {
  return axios.post('/coordinators', payload, {
    headers: tokenHeaders(token),
  });
};

export const updateCoordinator = async (id, payload, token) => {
  return axios.put(`/coordinators/${id}`, payload, {
    headers: tokenHeaders(token),
  });
};

export const deleteCoordinator = async (id, token) => {
  return axios.delete(`/coordinators/${id}`, {
    headers: tokenHeaders(token),
  });
};

export default { getCoordinators, createCoordinator, updateCoordinator, deleteCoordinator };
