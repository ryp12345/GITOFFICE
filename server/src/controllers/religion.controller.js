const Religion = require('../models/religion.model');
const { sendSuccess, sendError } = require('../utils/response');

const validStatuses = ['Active', 'Inactive'];

exports.getAll = async (_req, res) => {
  try {
    const rows = await Religion.getAll();
    sendSuccess(res, rows);
  } catch (err) {
    sendError(res, err.message || 'Error fetching religions', 500);
  }
};

exports.getById = async (req, res) => {
  try {
    const row = await Religion.getById(req.params.id);
    if (!row) return sendError(res, 'Religion not found', 404);
    sendSuccess(res, row);
  } catch (err) {
    sendError(res, err.message || 'Error fetching religion', 500);
  }
};

exports.create = async (req, res) => {
  try {
    const { religion_name, status = 'Active' } = req.body || {};
    if (!religion_name || !religion_name.trim()) {
      return sendError(res, 'religion_name is required', 400);
    }
    if (!validStatuses.includes(status)) {
      return sendError(res, 'status must be Active or Inactive', 400);
    }

    const row = await Religion.create({
      religion_name: religion_name.trim(),
      status,
    });

    sendSuccess(res, row, 201);
  } catch (err) {
    sendError(res, err.message || 'Error creating religion', 500);
  }
};

exports.update = async (req, res) => {
  try {
    const { religion_name, status = 'Active' } = req.body || {};
    if (!religion_name || !religion_name.trim()) {
      return sendError(res, 'religion_name is required', 400);
    }
    if (!validStatuses.includes(status)) {
      return sendError(res, 'status must be Active or Inactive', 400);
    }

    const row = await Religion.update(req.params.id, {
      religion_name: religion_name.trim(),
      status,
    });

    if (!row) return sendError(res, 'Religion not found', 404);
    sendSuccess(res, row);
  } catch (err) {
    sendError(res, err.message || 'Error updating religion', 500);
  }
};

exports.delete = async (req, res) => {
  try {
    await Religion.delete(req.params.id);
    sendSuccess(res, { id: req.params.id });
  } catch (err) {
    sendError(res, err.message || 'Error deleting religion', 500);
  }
};
