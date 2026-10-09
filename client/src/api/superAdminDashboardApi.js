import api from './axios';

// Institute summary plus accounts, tickets and leave entitlement coverage for the Super Admin dashboard.
export const getSuperAdminDashboard = () => api.get('/super-admin/dashboard');
