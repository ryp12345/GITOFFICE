const expenseService = require('../../services/exam-section/fastrack_expenses.service');

async function getExpenses(req, res, next) {
  try {
    const academicYear = req.query.academic_year;
    const items = await expenseService.getExpenses(academicYear);
    res.json({ success: true, data: items });
  } catch (error) {
    next(error);
  }
}

async function getExpensesByAcademicYear(req, res, next) {
  try {
    const academicYear = req.query.academic_year;
    const items = await expenseService.getExpensesByAcademicYear(academicYear);
    res.json({ success: true, data: items });
  } catch (error) {
    next(error);
  }
}

async function createExpense(req, res, next) {
  try {
    const items = await expenseService.createExpense(req.body);
    res.status(201).json({ success: true, data: items });
  } catch (error) {
    next(error);
  }
}

async function updateExpense(req, res, next) {
  try {
    const item = await expenseService.updateExpense(req.params.id, req.body);
    if (!item) {
      const err = new Error('Expense not found');
      err.statusCode = 404;
      return next(err);
    }
    res.json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
}

async function deleteExpense(req, res, next) {
  try {
    const item = await expenseService.deleteExpense(req.params.id);
    if (!item) {
      const err = new Error('Expense not found');
      err.statusCode = 404;
      return next(err);
    }
    res.json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getExpenses,
  getExpensesByAcademicYear,
  createExpense,
  updateExpense,
  deleteExpense,
};