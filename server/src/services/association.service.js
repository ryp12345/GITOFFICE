const associationModel = require('../models/association.model');

async function listAll() {
  return associationModel.findAll();
}

async function getById(id) {
  const row = await associationModel.findById(id);
  if (!row) {
    const err = new Error('Association not found');
    err.statusCode = 404;
    throw err;
  }
  return row;
}

async function create(payload) {
  if (!payload.asso_name || !payload.asso_name.trim()) {
    const err = new Error('asso_name is required');
    err.statusCode = 400;
    throw err;
  }
  return associationModel.create(payload);
}

async function update(id, payload) {
  const exists = await associationModel.findById(id);
  if (!exists) {
    const err = new Error('Association not found');
    err.statusCode = 404;
    throw err;
  }
  return associationModel.update(id, payload);
}

async function remove(id) {
  const exists = await associationModel.findById(id);
  if (!exists) {
    const err = new Error('Association not found');
    err.statusCode = 404;
    throw err;
  }
  return associationModel.remove(id);
}

module.exports = { listAll, getById, create, update, remove };
