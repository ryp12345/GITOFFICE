import api from './axios';

export const getStaffInstitutions = async (staffId) => {
  const res = await api.get(`/staff/${staffId}/institutions`);
  return res.data;
};

export const createStaffInstitution = async (staffId, payload) => {
  const res = await api.post(`/staff/${staffId}/institutions`, payload);
  return res.data;
};

export const updateStaffInstitution = async (staffId, institutionStaffId, payload) => {
  const res = await api.patch(`/staff/${staffId}/institutions/${institutionStaffId}`, payload);
  return res.data;
};

export const deleteStaffInstitution = async (staffId, institutionStaffId) => {
  const res = await api.delete(`/staff/${staffId}/institutions/${institutionStaffId}`);
  return res.data;
};
