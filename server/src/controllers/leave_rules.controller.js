const LeaveRules = require('../models/leave_rules.model');
const { sendSuccess, sendError } = require('../utils/response');

exports.getAll = async (req, res) => {
  try {
    const rules = await LeaveRules.getAll(req.query.leave_id);
    sendSuccess(res, rules);
  } catch (err) {
    sendError(res, err.message || 'Error fetching leave rules', 500);
  }
};

exports.getById = async (req, res) => {
  try {
    const rule = await LeaveRules.getById(req.params.id);
    sendSuccess(res, rule);
  } catch (err) {
    sendError(res, err.message || 'Error fetching leave rule', 500);
  }
};

exports.create = async (req, res) => {
  try {
    const rule = await LeaveRules.create(req.body);
    sendSuccess(res, rule);
  } catch (err) {
    sendError(res, err.message || 'Error creating leave rule', 500);
  }
};

exports.update = async (req, res) => {
  try {
    const rule = await LeaveRules.update(req.params.id, req.body);
    sendSuccess(res, rule);
  } catch (err) {
    sendError(res, err.message || 'Error updating leave rule', 500);
  }
};

exports.delete = async (req, res) => {
  try {
    await LeaveRules.delete(req.params.id);
    sendSuccess(res, { id: req.params.id });
  } catch (err) {
    sendError(res, err.message || 'Error deleting leave rule', 500);
  }
};
