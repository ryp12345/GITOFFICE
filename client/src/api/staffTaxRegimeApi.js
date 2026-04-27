import api from './axios';

export const getStaffTaxRegimes = async (staffId) => {
  const res = await api.get(`/staff/${staffId}/tax-regimes`);
  return res.data;
};

export const getTaxRegimeOptions = async () => {
  const res = await api.get('/staff/tax-regimes/options');
  return res.data;
};

export const createStaffTaxRegime = async (staffId, payload) => {
  const res = await api.post(`/staff/${staffId}/tax-regimes`, payload);
  return res.data;
};

export const updateStaffTaxRegime = async (staffId, regimeRowId, payload) => {
  const res = await api.patch(`/staff/${staffId}/tax-regimes/${regimeRowId}`, payload);
  return res.data;
};

export const deleteStaffTaxRegime = async (staffId, regimeRowId) => {
  const res = await api.delete(`/staff/${staffId}/tax-regimes/${regimeRowId}`);
  return res.data;
};
