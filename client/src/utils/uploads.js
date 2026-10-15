import api from '../api/axios';

// Turns a server path such as "/uploads/staff/profile_photos/12.jpg?v=1" into an absolute URL on
// the API host (files are served by the Node server, not the Vite dev server).
export function resolveUploadUrl(fileUrl) {
  if (!fileUrl) return '';
  if (/^https?:\/\//i.test(fileUrl)) return fileUrl;

  const normalized = fileUrl.startsWith('/') ? fileUrl : `/${fileUrl}`;
  const apiBase = (import.meta.env.VITE_API_URL || '').trim() || api.defaults.baseURL || '';
  if (apiBase) return `${String(apiBase).replace(/\/$/, '').replace(/\/api$/, '')}${normalized}`;
  return typeof window !== 'undefined' ? `${window.location.origin}${normalized}` : normalized;
}
