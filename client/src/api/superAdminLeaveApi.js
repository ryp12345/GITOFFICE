import api from './axios';

export async function getItCellLeaveApplications(token, params = {}) {
  return api.get('/super-admin-leaves/it-cell-leave-applications', {
    headers: { Authorization: `Bearer ${token}` },
    params,
  });
}
