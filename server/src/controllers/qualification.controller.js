const Qualification = require('../models/qualification.model');
const { sendSuccess, sendError } = require('../utils/response');

const validStatuses = ['Active', 'Inactive'];

exports.getAll = async (_req, res) => {
  try {
    const rows = await Qualification.getAll();
    sendSuccess(res, rows);
  } catch (err) {
    sendError(res, err.message || 'Error fetching qualifications', 500);
  }
};

exports.getById = async (req, res) => {
  try {
    const row = await Qualification.getById(req.params.id);
    if (!row) return sendError(res, 'Qualification not found', 404);
    sendSuccess(res, row);
  } catch (err) {
    sendError(res, err.message || 'Error fetching qualification', 500);
  }
};

exports.create = async (req, res) => {
  try {
    const { qual_name, qual_shortname, status = 'Active' } = req.body || {};
    if (!qual_name || !qual_name.trim()) {
      return sendError(res, 'qual_name is required', 400);
    }
    if (!qual_shortname || !qual_shortname.trim()) {
      return sendError(res, 'qual_shortname is required', 400);
    }
    if (!validStatuses.includes(status)) {
      return sendError(res, 'status must be Active or Inactive', 400);
    }

    const row = await Qualification.create({
      qual_name: qual_name.trim(),
      qual_shortname: qual_shortname.trim(),
      status,
    });

    sendSuccess(res, row, 201);
  } catch (err) {
    sendError(res, err.message || 'Error creating qualification', 500);
  }
};

exports.update = async (req, res) => {
  try {
    const { qual_name, qual_shortname, status = 'Active' } = req.body || {};
    if (!qual_name || !qual_name.trim()) {
      return sendError(res, 'qual_name is required', 400);
    }
    if (!qual_shortname || !qual_shortname.trim()) {
      return sendError(res, 'qual_shortname is required', 400);
    }
    if (!validStatuses.includes(status)) {
      return sendError(res, 'status must be Active or Inactive', 400);
    }

    const row = await Qualification.update(req.params.id, {
      qual_name: qual_name.trim(),
      qual_shortname: qual_shortname.trim(),
      status,
    });

    if (!row) return sendError(res, 'Qualification not found', 404);
    sendSuccess(res, row);
  } catch (err) {
    sendError(res, err.message || 'Error updating qualification', 500);
  }
};

exports.delete = async (req, res) => {
  try {
    await Qualification.delete(req.params.id);
    sendSuccess(res, { id: req.params.id });
  } catch (err) {
    sendError(res, err.message || 'Error deleting qualification', 500);
  }
};
