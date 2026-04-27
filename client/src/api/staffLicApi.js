import api from './axios';

export const getStaffLics = async (staffId) => {
  const res = await api.get(`/staff/${staffId}/lics`);
  return res.data;
};

export const createStaffLic = async (staffId, payload) => {
  const res = await api.post(`/staff/${staffId}/lics`, payload);
  return res.data;
};

export const updateStaffLic = async (staffId, licId, payload) => {
  const res = await api.patch(`/staff/${staffId}/lics/${licId}`, payload);
  return res.data;
};

export const deleteStaffLic = async (staffId, licId) => {
  const res = await api.delete(`/staff/${staffId}/lics/${licId}`);
  return res.data;
};

export const getLicTransactions = async (staffId, licId) => {
  const res = await api.get(`/staff/${staffId}/lics/${licId}/transactions`);
  return res.data;
};

export const createLicTransaction = async (staffId, licId, payload) => {
  const res = await api.post(`/staff/${staffId}/lics/${licId}/transactions`, payload);
  return res.data;
};

export const deleteLicTransaction = async (staffId, licId, transId) => {
  const res = await api.delete(`/staff/${staffId}/lics/${licId}/transactions/${transId}`);
  return res.data;
};
