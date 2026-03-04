import api from './axios';

export const getStaffById = async (id) => {
  const res = await api.get(`/staff/${id}`);
  return res.data;
};

export const updateStaffById = async (id, data) => {
  const res = await api.put(`/staff/${id}`, data);
  return res.data;
};
