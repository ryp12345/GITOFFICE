const CasteCategory = require('../models/castecategory.model');
const { sendSuccess, sendError } = require('../utils/response');

exports.getAll = async (req, res) => {
  try {
    const religionId = req.query.religionId;
    const rows = await CasteCategory.getAll(religionId);
    sendSuccess(res, rows);
  } catch (err) {
    sendError(res, err.message || 'Error fetching caste categories', 500);
  }
};

exports.getById = async (req, res) => {
  try {
    const row = await CasteCategory.getById(req.params.id);
    if (!row) return sendError(res, 'Caste category not found', 404);
    sendSuccess(res, row);
  } catch (err) {
    sendError(res, err.message || 'Error fetching caste category', 500);
  }
};

exports.create = async (req, res) => {
  try {
    const { caste_name, religion_id, subcastes_name, category, category_no, status = 'Active' } = req.body || {};
    if (!caste_name || !caste_name.trim()) {
      return sendError(res, 'caste_name is required', 400);
    }
    if (!religion_id) {
      return sendError(res, 'religion_id is required', 400);
    }
    if (!subcastes_name || !subcastes_name.trim()) {
      return sendError(res, 'subcastes_name is required', 400);
    }
    if (!category || !category.trim()) {
      return sendError(res, 'category is required', 400);
    }
    if (!category_no || !category_no.trim()) {
      return sendError(res, 'category_no is required', 400);
    }
    if (!['Active', 'Inactive'].includes(status)) {
      return sendError(res, 'status must be Active or Inactive', 400);
    }
    const row = await CasteCategory.create({
      caste_name: caste_name.trim(),
      religion_id,
      subcastes_name: subcastes_name.trim(),
      category: category.trim(),
      category_no: category_no.trim(),
      status,
    });
    sendSuccess(res, row, 201);
  } catch (err) {
    sendError(res, err.message || 'Error creating caste category', 500);
  }
};

exports.update = async (req, res) => {
  try {
    const { caste_name, religion_id, subcastes_name, category, category_no, status = 'Active' } = req.body || {};
    if (!caste_name || !caste_name.trim()) {
      return sendError(res, 'caste_name is required', 400);
    }
    if (!religion_id) {
      return sendError(res, 'religion_id is required', 400);
    }
    if (!subcastes_name || !subcastes_name.trim()) {
      return sendError(res, 'subcastes_name is required', 400);
    }
    if (!category || !category.trim()) {
      return sendError(res, 'category is required', 400);
    }
    if (!category_no || !category_no.trim()) {
      return sendError(res, 'category_no is required', 400);
    }
    if (!['Active', 'Inactive'].includes(status)) {
      return sendError(res, 'status must be Active or Inactive', 400);
    }
    const row = await CasteCategory.update(req.params.id, {
      caste_name: caste_name.trim(),
      religion_id,
      subcastes_name: subcastes_name.trim(),
      category: category.trim(),
      category_no: category_no.trim(),
      status,
    });
    if (!row) return sendError(res, 'Caste category not found', 404);
    sendSuccess(res, row);
  } catch (err) {
    sendError(res, err.message || 'Error updating caste category', 500);
  }
};

exports.delete = async (req, res) => {
  try {
    await CasteCategory.delete(req.params.id);
    sendSuccess(res, { id: req.params.id });
  } catch (err) {
    sendError(res, err.message || 'Error deleting caste category', 500);
  }
};