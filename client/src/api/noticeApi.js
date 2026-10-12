import axios from './axios';

// Abilities for the signed-in user plus the active departments and staff types for the form.
export const getNoticeMeta = async () => axios.get('/notices/meta');

// Notices addressed to the signed-in user, for dashboard notice boards.
export const getNoticeFeed = async (params = {}) => axios.get('/notices/feed', { params });

// Own notices, or every notice for roles that manage all (Super Admin).
export const getNotices = async () => axios.get('/notices');

export const createNotice = async (payload) => axios.post('/notices', payload);

export const updateNotice = async (id, payload) => axios.put(`/notices/${id}`, payload);

export const deleteNotice = async (id) => axios.delete(`/notices/${id}`);
