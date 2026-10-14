import api from './axios';

export async function getItCellLeaveApplications(token, params = {}) {
  return api.get('/super-admin-leaves/it-cell-leave-applications', {
    headers: { Authorization: `Bearer ${token}` },
    params,
  });
}

export async function recommendItCellLeaveApplication(token, applicationId) {
  return api.post(`/super-admin-leaves/it-cell-leave-applications/${applicationId}/recommend`, {}, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function rejectItCellLeaveApplication(token, applicationId) {
  return api.post(`/super-admin-leaves/it-cell-leave-applications/${applicationId}/reject`, {}, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function bulkUpdateItCellLeaveApplications(token, action, ids) {
  return api.post('/super-admin-leaves/it-cell-leave-applications/bulk-action', { action, ids }, {
    headers: { Authorization: `Bearer ${token}` },
  });
}
