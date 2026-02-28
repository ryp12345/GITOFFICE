const departmentModel = require('../models/department.model');

async function listAll() {
  return departmentModel.findAll();
}

async function getById(id) {
  const row = await departmentModel.findById(id);
  if (!row) {
    const err = new Error('Department not found');
    err.statusCode = 404;
    throw err;
  }
  return row;
}

async function create(payload) {
  if (!payload.dept_name || !payload.dept_name.trim()) {
    const err = new Error('dept_name is required');
    err.statusCode = 400;
    throw err;
  }
  if (!payload.dept_shortname || !payload.dept_shortname.trim()) {
    const err = new Error('dept_shortname is required');
    err.statusCode = 400;
    throw err;
  }
  if (!payload.yoe) {
    const err = new Error('yoe is required');
    err.statusCode = 400;
    throw err;
  }
  return departmentModel.create(payload);
}

async function update(id, payload) {
  const exists = await departmentModel.findById(id);
  if (!exists) {
    const err = new Error('Department not found');
    err.statusCode = 404;
    throw err;
  }
  return departmentModel.update(id, payload);
}

async function remove(id) {
  const exists = await departmentModel.findById(id);
  if (!exists) {
    const err = new Error('Department not found');
    err.statusCode = 404;
    throw err;
  }
  return departmentModel.remove(id);
}

module.exports = { listAll, getById, create, update, remove };
