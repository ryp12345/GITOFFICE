import api from './axios';

export const getStaffSocietyShares = async (staffId) => {
  const res = await api.get(`/staff/${staffId}/society-shares`);
  return res.data;
};

export const createStaffSocietyShare = async (staffId, payload) => {
  const res = await api.post(`/staff/${staffId}/society-shares`, payload);
  return res.data;
};

export const updateStaffSocietyShare = async (staffId, shareId, payload) => {
  const res = await api.patch(`/staff/${staffId}/society-shares/${shareId}`, payload);
  return res.data;
};

export const deleteStaffSocietyShare = async (staffId, shareId) => {
  const res = await api.delete(`/staff/${staffId}/society-shares/${shareId}`);
  return res.data;
};
