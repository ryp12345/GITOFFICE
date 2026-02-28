const RemunerationHead = require('../models/remunerationhead.model');
const { sendSuccess, sendError } = require('../utils/response');

exports.getAll = async (_req, res) => {
  try {
    const rows = await RemunerationHead.getAll();
    sendSuccess(res, rows);
  } catch (err) {
    sendError(res, err.message || 'Error fetching remuneration heads', 500);
  }
};

exports.getById = async (req, res) => {
  try {
    const row = await RemunerationHead.getById(req.params.id);
    if (!row) return sendError(res, 'Remuneration head not found', 404);
    sendSuccess(res, row);
  } catch (err) {
    sendError(res, err.message || 'Error fetching remuneration head', 500);
  }
};

exports.create = async (req, res) => {
  try {
    const { remuneration_head } = req.body || {};
    if (!remuneration_head || !remuneration_head.trim()) {
      return sendError(res, 'remuneration_head is required', 400);
    }
    const row = await RemunerationHead.create({ remuneration_head: remuneration_head.trim() });
    sendSuccess(res, row, 201);
  } catch (err) {
    sendError(res, err.message || 'Error creating remuneration head', 500);
  }
};

exports.update = async (req, res) => {
  try {
    const { remuneration_head } = req.body || {};
    if (!remuneration_head || !remuneration_head.trim()) {
      return sendError(res, 'remuneration_head is required', 400);
    }
    const row = await RemunerationHead.update(req.params.id, { remuneration_head: remuneration_head.trim() });
    if (!row) return sendError(res, 'Remuneration head not found', 404);
    sendSuccess(res, row);
  } catch (err) {
    sendError(res, err.message || 'Error updating remuneration head', 500);
  }
};

exports.delete = async (req, res) => {
  try {
    await RemunerationHead.delete(req.params.id);
    sendSuccess(res, { id: req.params.id });
  } catch (err) {
    sendError(res, err.message || 'Error deleting remuneration head', 500);
  }
};