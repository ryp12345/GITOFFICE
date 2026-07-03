const instanceModel = require('../../models/exam-section/fastrack_instance.model');

async function getInstances() {
  return instanceModel.findAllWithPrograms();
}

async function getInstanceById(id) {
  const instance = await instanceModel.findById(id);
  if (!instance) {
    const err = new Error('Fastrack instance not found');
    err.statusCode = 404;
    throw err;
  }
  const programs = await instanceModel.findProgramsByInstanceId(id);
  return { ...instance, programs };
}

async function getLookupData() {
  const [schemes, programs] = await Promise.all([
    instanceModel.findSchemes(),
    instanceModel.findPrograms()
  ]);
  return { schemes, programs };
}

async function createInstance(payload) {
  if (!payload.ft_instance_name || !String(payload.ft_instance_name).trim()) {
    const err = new Error('Fastrack instance name is required');
    err.statusCode = 400;
    throw err;
  }
  if (!payload.academic_year || !String(payload.academic_year).trim()) {
    const err = new Error('Academic year is required');
    err.statusCode = 400;
    throw err;
  }
  if (!payload.start_date) {
    const err = new Error('Start date is required');
    err.statusCode = 400;
    throw err;
  }
  if (!payload.end_date) {
    const err = new Error('End date is required');
    err.statusCode = 400;
    throw err;
  }
  if (!payload.scheme_id) {
    const err = new Error('Scheme is required');
    err.statusCode = 400;
    throw err;
  }

  const programIds = Array.isArray(payload.program_ids) ? payload.program_ids.map(Number) : [];
  const semesters = Array.isArray(payload.semesters) ? payload.semesters.map(Number) : [];

  if (programIds.length === 0) {
    const err = new Error('At least one program must be selected');
    err.statusCode = 400;
    throw err;
  }
  if (semesters.length === 0) {
    const err = new Error('At least one semester must be selected');
    err.statusCode = 400;
    throw err;
  }

  return instanceModel.createInstance({
    ft_instance_name: String(payload.ft_instance_name).trim(),
    start_date: payload.start_date,
    end_date: payload.end_date,
    academic_year: String(payload.academic_year).trim(),
    scheme_id: Number(payload.scheme_id),
    max_theory_class: String(payload.max_theory_class || '').trim(),
    max_lab_class: String(payload.max_lab_class || '').trim(),
    total_fees_collected: payload.total_fees_collected || 0,
    deadline_date: payload.deadline_date || null,
    programIds,
    semesters
  });
}

async function updateInstance(id, payload) {
  const existing = await instanceModel.findById(id);
  if (!existing) {
    const err = new Error('Fastrack instance not found');
    err.statusCode = 404;
    throw err;
  }

  const programIds = payload.program_ids !== undefined ? (Array.isArray(payload.program_ids) ? payload.program_ids.map(Number) : []) : undefined;
  const semesters = payload.semesters !== undefined ? (Array.isArray(payload.semesters) ? payload.semesters.map(Number) : []) : undefined;

  if (programIds !== undefined && programIds.length === 0) {
    const err = new Error('At least one program must be selected');
    err.statusCode = 400;
    throw err;
  }
  if (semesters !== undefined && semesters.length === 0) {
    const err = new Error('At least one semester must be selected');
    err.statusCode = 400;
    throw err;
  }

  return instanceModel.updateInstance(id, {
    ft_instance_name: payload.ft_instance_name !== undefined ? String(payload.ft_instance_name).trim() : existing.ft_instance_name,
    start_date: payload.start_date || existing.start_date,
    end_date: payload.end_date || existing.end_date,
    academic_year: payload.academic_year !== undefined ? String(payload.academic_year).trim() : existing.academic_year,
    scheme_id: payload.scheme_id ? Number(payload.scheme_id) : existing.scheme_id,
    max_theory_class: payload.max_theory_class !== undefined ? String(payload.max_theory_class).trim() : existing.max_theory_class,
    max_lab_class: payload.max_lab_class !== undefined ? String(payload.max_lab_class).trim() : existing.max_lab_class,
    total_fees_collected: payload.total_fees_collected !== undefined ? payload.total_fees_collected : existing.total_fees_collected,
    deadline_date: payload.deadline_date || existing.deadline_date,
    programIds: programIds !== undefined ? programIds : [],
    semesters: semesters !== undefined ? semesters : []
  });
}

async function deleteInstance(id) {
  const existing = await instanceModel.findById(id);
  if (!existing) {
    const err = new Error('Fastrack instance not found');
    err.statusCode = 404;
    throw err;
  }
  return instanceModel.removeInstance(id);
}

module.exports = {
  getInstances,
  getInstanceById,
  getLookupData,
  createInstance,
  updateInstance,
  deleteInstance,
};
