import api from './axios';

export const getStaffAnnualIncrements = async (staffId) => {
  const res = await api.get(`/staff/${staffId}/annual-increments`);
  return res.data;
};

export const createStaffAnnualIncrement = async (staffId, payload) => {
  const res = await api.post(`/staff/${staffId}/annual-increments`, payload);
  return res.data;
};

export const updateStaffAnnualIncrement = async (staffId, incrementId, payload) => {
  const res = await api.patch(`/staff/${staffId}/annual-increments/${incrementId}`, payload);
  return res.data;
};

export const deleteStaffAnnualIncrement = async (staffId, incrementId) => {
  const res = await api.delete(`/staff/${staffId}/annual-increments/${incrementId}`);
  return res.data;
};
