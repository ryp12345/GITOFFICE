const schemeModel = require('../../models/exam-section/scheme.model');

async function getSchemes() {
  return schemeModel.findAll();
}

async function getSchemeById(id) {
  return schemeModel.findById(id);
}

async function createScheme({ scheme_name, status }) {
  if (!scheme_name || !String(scheme_name).trim()) {
    const err = new Error('Scheme name is required');
    err.statusCode = 400;
    throw err;
  }
  return schemeModel.create({
    scheme_name: String(scheme_name).trim(),
    status: status || 'active'
  });
}

async function updateScheme(id, { scheme_name, status }) {
  const existing = await schemeModel.findById(id);
  if (!existing) {
    const err = new Error('Scheme not found');
    err.statusCode = 404;
    throw err;
  }

  const updateData = {};
  if (scheme_name !== undefined) {
    updateData.scheme_name = String(scheme_name).trim();
  }
  if (status !== undefined) {
    updateData.status = status;
  }

  return schemeModel.update(id, updateData);
}

async function deleteScheme(id) {
  const existing = await schemeModel.findById(id);
  if (!existing) {
    const err = new Error('Scheme not found');
    err.statusCode = 404;
    throw err;
  }
  return schemeModel.remove(id);
}

module.exports = {
  getSchemes,
  getSchemeById,
  createScheme,
  updateScheme,
  deleteScheme,
};
