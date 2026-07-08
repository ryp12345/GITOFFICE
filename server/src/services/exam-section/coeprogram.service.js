const programModel = require('../../models/exam-section/coeprogram.model');

async function getPrograms() {
  return programModel.findAll();
}

async function getProgramById(id) {
  return programModel.findById(id);
}

async function getDepartments() {
  return programModel.findDepartments();
}

async function createProgram(payload) {
  if (!payload.program_name || !String(payload.program_name).trim()) {
    const err = new Error('Program name is required');
    err.statusCode = 400;
    throw err;
  }
  if (!payload.program_code || !String(payload.program_code).trim()) {
    const err = new Error('Program code is required');
    err.statusCode = 400;
    throw err;
  }
  if (!payload.department_id) {
    const err = new Error('Department is required');
    err.statusCode = 400;
    throw err;
  }
  if (!payload.type || !['UG', 'PG'].includes(payload.type)) {
    const err = new Error('UG/PG type is required');
    err.statusCode = 400;
    throw err;
  }
  return programModel.create({
    program_name: String(payload.program_name).trim(),
    program_code: String(payload.program_code).trim(),
    start_date: payload.start_date || null,
    close_date: payload.close_date || null,
    department_id: Number(payload.department_id),
    type: payload.type,
    program_intake: payload.program_intake,
  });
}

async function updateProgram(id, payload) {
  const existing = await programModel.findById(id);
  if (!existing) {
    const err = new Error('Program not found');
    err.statusCode = 404;
    throw err;
  }
  return programModel.update(id, payload);
}

async function deleteProgram(id) {
  const existing = await programModel.findById(id);
  if (!existing) {
    const err = new Error('Program not found');
    err.statusCode = 404;
    throw err;
  }
  return programModel.remove(id);
}

module.exports = {
  getPrograms,
  getProgramById,
  getDepartments,
  createProgram,
  updateProgram,
  deleteProgram,
};