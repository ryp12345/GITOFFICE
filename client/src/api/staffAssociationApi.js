import api from './axios';

export const getStaffAssociations = async (staffId) => {
  const res = await api.get(`/staff/${staffId}/associations`);
  return res.data;
};

export const createStaffAssociation = async (staffId, payload) => {
  const res = await api.post(`/staff/${staffId}/associations`, payload);
  return res.data;
};

export const updateStaffAssociation = async (staffId, associationStaffId, payload) => {
  const res = await api.patch(`/staff/${staffId}/associations/${associationStaffId}`, payload);
  return res.data;
};

export const deleteStaffAssociation = async (staffId, associationStaffId) => {
  const res = await api.delete(`/staff/${staffId}/associations/${associationStaffId}`);
  return res.data;
};
