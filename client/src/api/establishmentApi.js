import api from './axios';

// Institute-wide summary for the Establishment dashboard.
export const getEstablishmentDashboard = () => api.get('/establishment/dashboard');
