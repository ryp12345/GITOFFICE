import api from './axios';

export const getAssociateProfessorApplications = async () => {
  return api.get('/hod/associate-professor-applications');
};

export const createAssociateProfessorApplication = async (payload) => {
  return api.post('/hod/associate-professor-applications', payload);
};

export const updateAssociateProfessorApplication = async (id, payload) => {
  return api.put(`/hod/associate-professor-applications/${id}`, payload);
};

export const deleteAssociateProfessorApplication = async (id) => {
  return api.delete(`/hod/associate-professor-applications/${id}`);
};

export const exportAssociateProfessorApplications = async () => {
  return api.get('/hod/associate-professor-applications/export', {
    responseType: 'blob'
  });
};
