const expenseMasterService = require('../../services/exam-section/fastrack_expenses_master.service');

async function listExpenseMasters(req, res, next) {
  try {
    const items = await expenseMasterService.getExpenseMasters();
    res.json({ success: true, data: items });
  } catch (error) {
    next(error);
  }
}

async function getExpenseMaster(req, res, next) {
  try {
    const item = await expenseMasterService.getExpenseMasterById(req.params.id);
    if (!item) {
      const err = new Error('Expense master not found');
      err.statusCode = 404;
      return next(err);
    }
    res.json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
}

async function createExpenseMaster(req, res, next) {
  try {
    const item = await expenseMasterService.createExpenseMaster(req.body);
    res.status(201).json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
}

async function updateExpenseMaster(req, res, next) {
  try {
    const item = await expenseMasterService.updateExpenseMaster(req.params.id, req.body);
    if (!item) {
      const err = new Error('Expense master not found');
      err.statusCode = 404;
      return next(err);
    }
    res.json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
}

async function deleteExpenseMaster(req, res, next) {
  try {
    const item = await expenseMasterService.deleteExpenseMaster(req.params.id);
    if (!item) {
      const err = new Error('Expense master not found');
      err.statusCode = 404;
      return next(err);
    }
    res.json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listExpenseMasters,
  getExpenseMaster,
  createExpenseMaster,
  updateExpenseMaster,
  deleteExpenseMaster,
};
