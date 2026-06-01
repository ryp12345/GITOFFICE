import api from './axios';

export const getTicketDashboard = () => api.get('/tickets/dashboard');
export const getTicketDetails = (id) => api.get(`/tickets/${id}`);

export const createTicket = (payload) => {
  const formData = new FormData();
  formData.append('title', payload.title || '');
  formData.append('description', payload.description || '');

  (payload.attachments || []).forEach((file) => {
    formData.append('attachment[]', file);
  });

  return api.post('/tickets', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const updateTicket = (id, payload) => {
  const formData = new FormData();

  if (payload.title !== undefined) {
    formData.append('title', payload.title);
  }

  if (payload.description !== undefined) {
    formData.append('description', payload.description);
  }

  (payload.attachments || []).forEach((file) => {
    formData.append('attachment[]', file);
  });

  return api.put(`/tickets/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const deleteTicket = (id) => api.delete(`/tickets/${id}`);

export const addTicketReply = (id, payload) => {
  const formData = new FormData();
  formData.append('title', payload.title || '');
  formData.append('description', payload.description || '');

  (payload.attachments || []).forEach((file) => {
    formData.append('post_attachment[]', file);
  });

  return api.post(`/tickets/${id}/replies`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const updateTicketStatus = (id, status) => api.patch(`/tickets/${id}/status`, { status });

export function getUploadsBaseUrl() {
  const configuredApiUrl = import.meta.env.VITE_API_URL?.trim();
  const runtimeHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  const apiBaseUrl = configuredApiUrl || `http://${runtimeHost}:3004/api`;
  return apiBaseUrl.replace(/\/api\/?$/, '');
}

export function buildUploadUrl(relativePath) {
  if (!relativePath) return '';
  return `${getUploadsBaseUrl()}${relativePath.startsWith('/') ? '' : '/'}${relativePath}`;
}
