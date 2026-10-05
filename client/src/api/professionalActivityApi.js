import api from './axios';

export const PROFESSIONAL_ACTIVITY_BASE_URL = '/professional-activities';

const UPLOAD_HEADERS = { 'Content-Type': 'multipart/form-data' };

export const getProfessionalActivities = async () => {
  const res = await api.get(PROFESSIONAL_ACTIVITY_BASE_URL);
  return res.data;
};

export const createAttendedProfessionalActivity = async (formData) => {
  const res = await api.post(`${PROFESSIONAL_ACTIVITY_BASE_URL}/attended`, formData, {
    headers: UPLOAD_HEADERS,
  });
  return res.data;
};

export const updateAttendedProfessionalActivity = async (id, formData) => {
  const res = await api.patch(`${PROFESSIONAL_ACTIVITY_BASE_URL}/attended/${id}`, formData, {
    headers: UPLOAD_HEADERS,
  });
  return res.data;
};

export const deleteAttendedProfessionalActivity = async (id) => {
  const res = await api.delete(`${PROFESSIONAL_ACTIVITY_BASE_URL}/attended/${id}`);
  return res.data;
};

export const createConductedProfessionalActivity = async (formData) => {
  const res = await api.post(`${PROFESSIONAL_ACTIVITY_BASE_URL}/conducted`, formData, {
    headers: UPLOAD_HEADERS,
  });
  return res.data;
};

export const updateConductedProfessionalActivity = async (id, formData) => {
  const res = await api.patch(`${PROFESSIONAL_ACTIVITY_BASE_URL}/conducted/${id}`, formData, {
    headers: UPLOAD_HEADERS,
  });
  return res.data;
};

export const deleteConductedProfessionalActivity = async (id) => {
  const res = await api.delete(`${PROFESSIONAL_ACTIVITY_BASE_URL}/conducted/${id}`);
  return res.data;
};
