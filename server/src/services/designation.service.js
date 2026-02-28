const Designation = require('../models/designation.model');

const designationService = {
  getAll: () => Designation.getAll(),
  getById: (id) => Designation.getById(id),
  create: (data) => Designation.create(data),
  update: (id, data) => Designation.update(id, data),
  delete: (id) => Designation.delete(id),
};

module.exports = designationService;
