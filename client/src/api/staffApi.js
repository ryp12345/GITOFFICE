// Get filtered staff list
export const getFilteredStaff = async (filters) => {
  // filters: { departments, associations, designations, religion_id, castecategory_id, gender, employee_type }
  const params = {};
  if (filters.departments?.length) params.departments = filters.departments;
  if (filters.associations?.length) params.associations = filters.associations;
  if (filters.designations?.length) params.designations = filters.designations;
  if (filters.religion_id && filters.religion_id !== 'all') params.religion_id = filters.religion_id;
  if (filters.castecategory_id && filters.castecategory_id !== 'all') params.castecategory_id = filters.castecategory_id;
  if (filters.gender && filters.gender !== 'all') params.gender = filters.gender;
  if (filters.employee_type && filters.employee_type !== 'all') params.employee_type = filters.employee_type;
  const res = await api.get('/staff/filter', { params });
  return res.data;
};
import api from './axios';

export const getStaffById = async (id) => {
  const res = await api.get(`/staff/${id}`);
  return res.data;
};

export const updateStaffById = async (id, data) => {
  const res = await api.put(`/staff/${id}`, data);
  return res.data;
};
