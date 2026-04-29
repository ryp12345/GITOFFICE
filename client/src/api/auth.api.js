import api from './axios';

export const loginRequest = (payload) => api.post('/auth/login', payload);
export const registerRequest = (payload) => api.post('/auth/register', payload);
export const refreshTokenRequest = (payload) => api.post('/auth/refresh', payload);
export const meRequest = () => api.get('/users/me');
export const changePasswordRequest = (payload) => api.post('/users/me/change-password', payload);
export const verifyCurrentPasswordRequest = (payload) => api.post('/users/me/verify-password', payload);
