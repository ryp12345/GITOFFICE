const Leave = require('../models/leave.model');

module.exports = {
  getAll: () => Leave.getAll(),
  getById: (id) => Leave.getById(id),
  create: (data) => Leave.create(data),
  update: (id, data) => Leave.update(id, data),
  delete: (id) => Leave.delete(id)
};
