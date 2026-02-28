const institutionModel = require('../models/institution.model');

async function listAll() {
  return institutionModel.findAll();
}

async function getById(id) {
  const row = await institutionModel.findById(id);
  if (!row) {
    const err = new Error('Institution not found');
    err.statusCode = 404;
    throw err;
  }
  return row;
}

async function create(payload) {
  if (!payload.name || !payload.name.trim()) {
    const err = new Error('name is required');
    err.statusCode = 400;
    throw err;
  }

  if (!payload.acronym || !payload.acronym.trim()) {
    const err = new Error('acronym is required');
    err.statusCode = 400;
    throw err;
  }

  return institutionModel.create(payload);
}

async function update(id, payload) {
  const exists = await institutionModel.findById(id);
  if (!exists) {
    const err = new Error('Institution not found');
    err.statusCode = 404;
    throw err;
  }
  return institutionModel.update(id, payload);
}

async function remove(id) {
  const exists = await institutionModel.findById(id);
  if (!exists) {
    const err = new Error('Institution not found');
    err.statusCode = 404;
    throw err;
  }
  return institutionModel.remove(id);
}

module.exports = { listAll, getById, create, update, remove };
