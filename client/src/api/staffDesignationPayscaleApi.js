import api from './axios';

export const getStaffDesignationPayscale = async (staffId) => {
  const res = await api.get(`/staff/${staffId}/designation-payscale`);
  return res.data;
};

export const changeStaffDesignationPayscale = async (staffId, payload) => {
  const res = await api.post(`/staff/${staffId}/designation-payscale`, payload);
  return res.data;
};

export const updateStaffDesignationRow = async (staffId, designationRowId, payload) => {
  const res = await api.patch(`/staff/${staffId}/designation/${designationRowId}`, payload);
  return res.data;
};

export const deleteStaffDesignationRow = async (staffId, designationRowId) => {
  const res = await api.delete(`/staff/${staffId}/designation/${designationRowId}`);
  return res.data;
};

export const updateStaffPayscaleRow = async (staffId, payRecordType, payRowId, payload) => {
  const res = await api.patch(`/staff/${staffId}/payscale/${payRecordType}/${payRowId}`, payload);
  return res.data;
};

export const deleteStaffPayscaleRow = async (staffId, payRecordType, payRowId) => {
  const res = await api.delete(`/staff/${staffId}/payscale/${payRecordType}/${payRowId}`);
  return res.data;
};

export const getStaffAdditionalDesignations = async (staffId) => {
  const res = await api.get(`/staff/${staffId}/additional-designations`);
  return res.data;
};

export const createStaffAdditionalDesignation = async (staffId, payload) => {
  const res = await api.post(`/staff/${staffId}/additional-designations`, payload);
  return res.data;
};

export const updateStaffAdditionalDesignation = async (staffId, rowId, payload) => {
  const res = await api.patch(`/staff/${staffId}/additional-designations/${rowId}`, payload);
  return res.data;
};

export const deleteStaffAdditionalDesignation = async (staffId, rowId) => {
  const res = await api.delete(`/staff/${staffId}/additional-designations/${rowId}`);
  return res.data;
};

export const getDesignationOptionsByEmployeeType = async (employeeType) => {
  const res = await api.get('/staff/employee/designations', {
    params: { employee_type: employeeType },
  });
  return res.data;
};

export const getPayscaleOptions = async ({ pay_type, emp_type, designation_id }) => {
  const res = await api.get('/staff/getstaffpay_list', {
    params: { pay_type, emp_type, designation_id },
  });
  return res.data;
};

export const getDepartmentOptions = async () => {
  const res = await api.get('/departments');
  return res.data;
};
