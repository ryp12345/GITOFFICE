const HolidayRH = require('../models/holidayrh.model');
const { sendSuccess, sendError } = require('../utils/response');

const allowedTypes = ['Holiday', 'RH'];

exports.getAll = async (_req, res) => {
  try {
    const rows = await HolidayRH.getAll();
    sendSuccess(res, rows);
  } catch (err) {
    sendError(res, err.message || 'Error fetching Holiday/RH list', 500);
  }
};

exports.getById = async (req, res) => {
  try {
    const row = await HolidayRH.getById(req.params.id);
    if (!row) return sendError(res, 'Holiday/RH not found', 404);
    sendSuccess(res, row);
  } catch (err) {
    sendError(res, err.message || 'Error fetching Holiday/RH', 500);
  }
};

exports.create = async (req, res) => {
  try {
    const { year, title, start, day, type } = req.body || {};

    if (!year || !title || !start || !day || !type) {
      return sendError(res, 'year, title, start, day and type are required', 400);
    }

    if (!allowedTypes.includes(type)) {
      return sendError(res, 'type must be Holiday or RH', 400);
    }

    const row = await HolidayRH.create({ year, title, start, day, type });
    sendSuccess(res, row, 201);
  } catch (err) {
    sendError(res, err.message || 'Error creating Holiday/RH', 500);
  }
};

exports.update = async (req, res) => {
  try {
    const { year, title, start, day, type } = req.body || {};

    if (!year || !title || !start || !day || !type) {
      return sendError(res, 'year, title, start, day and type are required', 400);
    }

    if (!allowedTypes.includes(type)) {
      return sendError(res, 'type must be Holiday or RH', 400);
    }

    const row = await HolidayRH.update(req.params.id, { year, title, start, day, type });
    if (!row) return sendError(res, 'Holiday/RH not found', 404);

    sendSuccess(res, row);
  } catch (err) {
    sendError(res, err.message || 'Error updating Holiday/RH', 500);
  }
};

exports.delete = async (req, res) => {
  try {
    await HolidayRH.delete(req.params.id);
    sendSuccess(res, { id: req.params.id });
  } catch (err) {
    sendError(res, err.message || 'Error deleting Holiday/RH', 500);
  }
};
