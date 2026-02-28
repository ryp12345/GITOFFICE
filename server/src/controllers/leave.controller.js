const Leave = require('../models/leave.model');
const { sendSuccess, sendError } = require('../utils/response');

exports.getAll = async (req, res) => {
  try {
    const leaves = await Leave.getAll();
    sendSuccess(res, leaves);
  } catch (err) {
    sendError(res, err.message || 'Error fetching leaves', 500);
  }
};

exports.getById = async (req, res) => {
  try {
    const leave = await Leave.getById(req.params.id);
    sendSuccess(res, leave);
  } catch (err) {
    sendError(res, err.message || 'Error fetching leave', 500);
  }
};

exports.create = async (req, res) => {
  try {
    const leave = await Leave.create(req.body);
    sendSuccess(res, leave);
  } catch (err) {
    sendError(res, err.message || 'Error creating leave', 500);
  }
};

exports.update = async (req, res) => {
  try {
    const leave = await Leave.update(req.params.id, req.body);
    sendSuccess(res, leave);
  } catch (err) {
    sendError(res, err.message || 'Error updating leave', 500);
  }
};

exports.delete = async (req, res) => {
  try {
    await Leave.delete(req.params.id);
    sendSuccess(res, { id: req.params.id });
  } catch (err) {
    sendError(res, err.message || 'Error deleting leave', 500);
  }
};
