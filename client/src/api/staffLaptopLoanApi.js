import api from './axios';

export const getStaffLaptopLoans = async (staffId) => {
  const res = await api.get(`/staff/${staffId}/laptop-loans`);
  return res.data;
};

export const createStaffLaptopLoan = async (staffId, payload) => {
  const res = await api.post(`/staff/${staffId}/laptop-loans`, payload);
  return res.data;
};

export const updateStaffLaptopLoan = async (staffId, loanId, payload) => {
  const res = await api.patch(`/staff/${staffId}/laptop-loans/${loanId}`, payload);
  return res.data;
};

export const deleteStaffLaptopLoan = async (staffId, loanId) => {
  const res = await api.delete(`/staff/${staffId}/laptop-loans/${loanId}`);
  return res.data;
};
