import api from './axios';

export const getProfessorApplications = async () => {
  return api.get('/hod/professor-applications');
};

export const createProfessorApplication = async (payload) => {
  return api.post('/hod/professor-applications', payload);
};

export const updateProfessorApplication = async (id, payload) => {
  return api.put(`/hod/professor-applications/${id}`, payload);
};

export const deleteProfessorApplication = async (id) => {
  return api.delete(`/hod/professor-applications/${id}`);
};

export const exportProfessorApplications = async () => {
  return api.get('/hod/professor-applications/export', {
    responseType: 'blob'
  });
};
