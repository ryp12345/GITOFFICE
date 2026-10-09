import api from './axios';

// Institute-wide summary for the Establishment dashboard.
export const getEstablishmentDashboard = () => api.get('/establishment/dashboard');

// Staff behind one "Staff Records to Complete" count (e.g. 'no_department').
export const getEstablishmentDataQualityStaff = (check) =>
  api.get(`/establishment/dashboard/data-quality/${encodeURIComponent(check)}`);
