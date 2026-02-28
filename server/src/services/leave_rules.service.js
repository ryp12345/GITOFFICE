const LeaveRules = require('../models/leave_rules.model');

module.exports = {
  getAll: (leave_id) => LeaveRules.getAll(leave_id),
  getById: (id) => LeaveRules.getById(id),
  create: (data) => LeaveRules.create(data),
  update: (id, data) => LeaveRules.update(id, data),
  delete: (id) => LeaveRules.delete(id)
};
