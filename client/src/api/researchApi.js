import api from './axios';

export const RESEARCH_BASE_URL = '/research';

// The 500 KB ceiling that Laravel enforced on every research upload. Consultancy was the one
// exception and still accepts the larger limit, so the label follows the active menu.
export const RESEARCH_MAX_DOCUMENT_BYTES = 500 * 1024;
export const RESEARCH_CONSULTANCY_MAX_DOCUMENT_BYTES = 20000 * 1024;

const UPLOAD_HEADERS = { 'Content-Type': 'multipart/form-data' };

export const getResearchRecords = async (resource) => {
  const res = await api.get(`${RESEARCH_BASE_URL}/${resource}`);
  return res.data;
};

export const createResearchRecord = async (resource, formData) => {
  const res = await api.post(`${RESEARCH_BASE_URL}/${resource}`, formData, {
    headers: UPLOAD_HEADERS,
  });
  return res.data;
};

export const updateResearchRecord = async (resource, id, formData) => {
  const res = await api.patch(`${RESEARCH_BASE_URL}/${resource}/${id}`, formData, {
    headers: UPLOAD_HEADERS,
  });
  return res.data;
};

export const deleteResearchRecord = async (resource, id) => {
  const res = await api.delete(`${RESEARCH_BASE_URL}/${resource}/${id}`);
  return res.data;
};