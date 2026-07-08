const programService = require('../../services/exam-section/coeprogram.service');

async function listPrograms(req, res, next) {
  try {
    const items = await programService.getPrograms();
    res.json({ success: true, data: items });
  } catch (error) {
    next(error);
  }
}

async function getDepartments(req, res, next) {
  try {
    const items = await programService.getDepartments();
    res.json({ success: true, data: items });
  } catch (error) {
    next(error);
  }
}

async function createProgram(req, res, next) {
  try {
    const item = await programService.createProgram(req.body);
    res.status(201).json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
}

async function updateProgram(req, res, next) {
  try {
    const item = await programService.updateProgram(req.params.id, req.body);
    if (!item) {
      const err = new Error('Program not found');
      err.statusCode = 404;
      return next(err);
    }
    res.json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
}

async function deleteProgram(req, res, next) {
  try {
    const item = await programService.deleteProgram(req.params.id);
    if (!item) {
      const err = new Error('Program not found');
      err.statusCode = 404;
      return next(err);
    }
    res.json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listPrograms,
  getDepartments,
  createProgram,
  updateProgram,
  deleteProgram,
};