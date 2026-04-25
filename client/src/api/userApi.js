import api from './axios';

export const getUsers = () => api.get('/users');
export const impersonateUser = (userId) => api.post(`/users/${userId}/impersonate`);
export const resetUserPassword = (userId) => api.post(`/users/${userId}/reset-password`);
export const stopImpersonation = () => api.post('/users/stop-impersonation');
