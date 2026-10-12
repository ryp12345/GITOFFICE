import axios from './axios';

// Employee totals and institution events for the Principal Office dashboard.
export const getPrincipalOfficeDashboard = async () => axios.get('/principal-office/dashboard');
