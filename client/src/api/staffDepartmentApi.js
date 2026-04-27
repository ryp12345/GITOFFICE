import api from './axios';

export const getStaffDepartments = async (staffId) => {
  const res = await api.get(`/staff/${staffId}/departments`);
  return res.data;
};

export const createStaffDepartment = async (staffId, payload) => {
  const res = await api.post(`/staff/${staffId}/departments`, payload);
  return res.data;
};

export const updateStaffDepartment = async (staffId, departmentStaffId, payload) => {
  const res = await api.patch(`/staff/${staffId}/departments/${departmentStaffId}`, payload);
  return res.data;
};

export const deleteStaffDepartment = async (staffId, departmentStaffId) => {
  const res = await api.delete(`/staff/${staffId}/departments/${departmentStaffId}`);
  return res.data;
};
