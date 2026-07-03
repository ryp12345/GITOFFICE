import api from './axios';

export const getExamSectionDashboard = async () => {
  const res = await api.get('/exam-section/dashboard');
  return res.data;
};

export const getFastrackCourses = async (params = {}) => {
  const res = await api.get('/exam-section/fastrack', { params });
  return res.data;
};

export const getFastrackCoursesByAcademicYear = async (params) => {
  const res = await api.get('/exam-section/fastrack/academic_year', { params });
  return res.data;
};

export const getFastrackLookup = async () => {
  const res = await api.get('/exam-section/fastrack/lookup');
  return res.data;
};

export const createFastrackCourse = async (payload) => {
  const res = await api.post('/exam-section/fastrack', payload);
  return res.data;
};

export const updateFastrackCourse = async (id, payload) => {
  const res = await api.patch(`/exam-section/fastrack/${id}`, payload);
  return res.data;
};

export const deleteFastrackCourse = async (id) => {
  const res = await api.delete(`/exam-section/fastrack/${id}`);
  return res.data;
};

export const downloadFastrackTemplate = async () => {
  const res = await api.get('/exam-section/fastrack/download-template', { responseType: 'blob' });
  return res.data;
};

export const uploadFastrackExcel = async (formData) => {
  const res = await api.post('/exam-section/fastrack/upload_excel', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return res.data;
};

export const exportFastrackCourses = async () => {
  const res = await api.post('/exam-section/fastrack/course_details/export', {}, { responseType: 'blob' });
  return res.data;
};

export const getSchemes = async () => {
  const res = await api.get('/exam-section/schemes');
  return res.data;
};

export const createScheme = async (payload) => {
  const res = await api.post('/exam-section/schemes', payload);
  return res.data;
};

export const updateScheme = async (id, payload) => {
  const res = await api.patch(`/exam-section/schemes/${id}`, payload);
  return res.data;
};

export const deleteScheme = async (id) => {
  const res = await api.delete(`/exam-section/schemes/${id}`);
  return res.data;
};

export const getCourseTypes = async () => {
  const res = await api.get('/exam-section/course-types');
  return res.data;
};

export const createCourseType = async (payload) => {
  const res = await api.post('/exam-section/course-types', payload);
  return res.data;
};

export const updateCourseType = async (id, payload) => {
  const res = await api.patch(`/exam-section/course-types/${id}`, payload);
  return res.data;
};

export const deleteCourseType = async (id) => {
  const res = await api.delete(`/exam-section/course-types/${id}`);
  return res.data;
};

export const getInstances = async () => {
  const res = await api.get('/exam-section/fastrack-instances');
  return res.data;
};

export const getInstanceById = async (id) => {
  const res = await api.get(`/exam-section/fastrack-instances/${id}`);
  return res.data;
};

export const getInstanceLookup = async () => {
  const res = await api.get('/exam-section/fastrack-instance/lookup');
  return res.data;
};

export const createInstance = async (payload) => {
  const res = await api.post('/exam-section/fastrack-instances', payload);
  return res.data;
};

export const updateInstance = async (id, payload) => {
  const res = await api.patch(`/exam-section/fastrack-instances/${id}`, payload);
  return res.data;
};

export const deleteInstance = async (id) => {
  const res = await api.delete(`/exam-section/fastrack-instances/${id}`);
  return res.data;
};

export const getPrograms = async () => {
  const res = await api.get('/exam-section/fastrack-instance/lookup');
  return res.data;
};

export const getPayConfig = async () => {
  const res = await api.get('/exam-section/Fastrackpay');
  return res.data;
};

export const getPayConfigData = async (academicYear) => {
  const res = await api.get('/exam-section/Fastrackpay/getData', { params: { academic_year: academicYear } });
  return res.data;
};

export const createPayConfig = async (payload) => {
  const res = await api.post('/exam-section/Fastrackpay/create', payload);
  return res.data;
};

export const updatePayConfig = async (id, payload) => {
  const res = await api.patch(`/exam-section/Fastrackpay/update/${id}`, payload);
  return res.data;
};

export const getDeptFees = async () => {
  const res = await api.get('/exam-section/ft_deptfees');
  return res.data;
};

export const getInsights = async () => {
  const res = await api.get('/exam-section/fastrack_insights');
  return res.data;
};

export const getExpenseMasters = async () => {
  const res = await api.get('/exam-section/expense-masters');
  return res.data;
};

export const getExpenseMasterById = async (id) => {
  const res = await api.get(`/exam-section/expense-masters/${id}`);
  return res.data;
};

export const createExpenseMaster = async (payload) => {
  const res = await api.post('/exam-section/expense-masters', payload);
  return res.data;
};

export const updateExpenseMaster = async (id, payload) => {
  const res = await api.patch(`/exam-section/expense-masters/${id}`, payload);
  return res.data;
};

export const deleteExpenseMaster = async (id) => {
  const res = await api.delete(`/exam-section/expense-masters/${id}`);
  return res.data;
};

export const getExpenses = async (params = {}) => {
  const res = await api.get('/exam-section/fastrack_expenses', { params });
  return res.data;
};

export const getExpensesByAcademicYear = async (params) => {
  const res = await api.get('/exam-section/fastrack_expenses/filter', { params });
  return res.data;
};
