const coordinatorModel = require('../models/coordinator.model');

function normalizeName(value) {
  return String(value || '').trim().toLowerCase();
}

async function ensureUniqueName(name, excludeId = null) {
  const all = await coordinatorModel.findAll();
  const target = normalizeName(name);

  const duplicate = all.find((row) => {
    if (!row || row.name === undefined || row.name === null) return false;
    if (excludeId !== null && Number(row.id) === Number(excludeId)) return false;
    return normalizeName(row.name) === target;
  });

  if (duplicate) {
    const err = new Error('Coordinator name already exists');
    err.statusCode = 409;
    throw err;
  }
}

async function listAll() {
  return coordinatorModel.findAll();
}

async function getById(id) {
  const row = await coordinatorModel.findById(id);
  if (!row) {
    const err = new Error('Coordinator not found');
    err.statusCode = 404;
    throw err;
  }
  return row;
}

async function create(payload) {
  if (!payload.name || !String(payload.name).trim()) {
    const err = new Error('name is required');
    err.statusCode = 400;
    throw err;
  }
  if (!payload.employee_type || !String(payload.employee_type).trim()) {
    const err = new Error('employee_type is required');
    err.statusCode = 400;
    throw err;
  }

  await ensureUniqueName(payload.name);
  return coordinatorModel.create(payload);
}

async function update(id, payload) {
  const exists = await coordinatorModel.findById(id);
  if (!exists) {
    const err = new Error('Coordinator not found');
    err.statusCode = 404;
    throw err;
  }

  if (payload.name !== undefined) {
    if (!String(payload.name).trim()) {
      const err = new Error('name cannot be empty');
      err.statusCode = 400;
      throw err;
    }
    await ensureUniqueName(payload.name, id);
  }

  if (payload.employee_type !== undefined && !String(payload.employee_type).trim()) {
    const err = new Error('employee_type cannot be empty');
    err.statusCode = 400;
    throw err;
  }

  return coordinatorModel.update(id, payload);
}

async function remove(id) {
  const exists = await coordinatorModel.findById(id);
  if (!exists) {
    const err = new Error('Coordinator not found');
    err.statusCode = 404;
    throw err;
  }
  return coordinatorModel.remove(id);
}

module.exports = { listAll, getById, create, update, remove };
