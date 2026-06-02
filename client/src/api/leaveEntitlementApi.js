import axios from './axios';

const tokenHeaders = (token) => (token ? { Authorization: `Bearer ${token}` } : {});

export const getLeaveEntitlementMeta = async (token) => {
  return axios.get('/leave-entitlements/meta', {
    headers: tokenHeaders(token),
  });
};

export const getLeaveEntitlements = async ({ year, departmentId, mode } = {}, token) => {
  const params = {};

  if (Number.isFinite(Number(year)) && Number(year) > 0) {
    params.year = Number(year);
  }

  if (departmentId) {
    params.department_id = departmentId;
  }

  if (mode) {
    params.mode = mode;
  }

  return axios.get('/leave-entitlements', {
    params,
    headers: tokenHeaders(token),
  });
};

export const getLeaveEntitlementsForHod = async ({ year }, token) => {
  const params = { year };
  return axios.get('/leave-entitlements/hod', {
    params,
    headers: tokenHeaders(token),
  });
};

export const updateLeaveEntitlement = async (payload, token) => {
  return axios.patch('/leave-entitlements', payload, {
    headers: tokenHeaders(token),
  });
};
