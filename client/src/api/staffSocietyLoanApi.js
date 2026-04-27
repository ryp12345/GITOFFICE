import api from './axios';

export const getStaffSocietyLoans = async (staffId) => {
  const res = await api.get(`/staff/${staffId}/society-loans`);
  return res.data;
};

export const createStaffSocietyLoan = async (staffId, payload) => {
  const res = await api.post(`/staff/${staffId}/society-loans`, payload);
  return res.data;
};

export const updateStaffSocietyLoan = async (staffId, loanId, payload) => {
  const res = await api.patch(`/staff/${staffId}/society-loans/${loanId}`, payload);
  return res.data;
};

export const deleteStaffSocietyLoan = async (staffId, loanId) => {
  const res = await api.delete(`/staff/${staffId}/society-loans/${loanId}`);
  return res.data;
};
