import axios from './axios';

const tokenHeaders = (token) => (token ? { Authorization: `Bearer ${token}` } : {});

export const getLeaveEntitlementMeta = async (token) => {
  return axios.get('/leave-entitlements/meta', {
    headers: tokenHeaders(token),
  });
};

export const getLeaveEntitlements = async ({ year, departmentId }, token) => {
  const params = { year };
  if (departmentId) {
    params.department_id = departmentId;
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
