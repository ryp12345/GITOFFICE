import api from './axios';

// Festival Advance
export const getStaffFestivalAdvances = async (staffId) => {
  const res = await api.get(`/staff/${staffId}/festival-advances`);
  return res.data;
};

export const createStaffFestivalAdvance = async (staffId, payload) => {
  const res = await api.post(`/staff/${staffId}/festival-advances`, payload);
  return res.data;
};

export const updateStaffFestivalAdvance = async (staffId, advanceId, payload) => {
  const res = await api.patch(`/staff/${staffId}/festival-advances/${advanceId}`, payload);
  return res.data;
};

export const deleteStaffFestivalAdvance = async (staffId, advanceId) => {
  const res = await api.delete(`/staff/${staffId}/festival-advances/${advanceId}`);
  return res.data;
};

// Remuneration — the list response also carries the remuneration heads.
export const getStaffRemunerations = async (staffId) => {
  const res = await api.get(`/staff/${staffId}/remunerations`);
  return res.data;
};

export const createStaffRemunerations = async (staffId, rows) => {
  const res = await api.post(`/staff/${staffId}/remunerations`, { rows });
  return res.data;
};

export const updateStaffRemuneration = async (staffId, remunerationId, payload) => {
  const res = await api.patch(`/staff/${staffId}/remunerations/${remunerationId}`, payload);
  return res.data;
};

export const deleteStaffRemuneration = async (staffId, remunerationId) => {
  const res = await api.delete(`/staff/${staffId}/remunerations/${remunerationId}`);
  return res.data;
};

// Salary / TDS
export const getStaffSalaries = async (staffId, { month, year }) => {
  const res = await api.get(`/staff/${staffId}/salaries`, { params: { month, year } });
  return res.data;
};

export const getStaffTds = async (staffId, params) => {
  const res = await api.get(`/staff/${staffId}/tds`, { params });
  return res.data;
};

export const exportStaffTds = async (staffId, params) => {
  const res = await api.get(`/staff/${staffId}/tds/export`, { params, responseType: 'blob' });
  return res.data;
};

// Leaves tab (entitlements are saved through updateLeaveEntitlement in leaveEntitlementApi)
export const getStaffLeaves = async (staffId, year) => {
  const res = await api.get(`/staff/${staffId}/leaves`, { params: year ? { year } : {} });
  return res.data;
};
