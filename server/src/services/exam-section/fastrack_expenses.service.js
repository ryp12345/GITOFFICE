const expenseModel = require('../../models/exam-section/fastrack_expenses.model');

async function getExpenses(academicYear) {
  return expenseModel.findAll(academicYear);
}

async function getExpensesByAcademicYear(academicYear) {
  if (!academicYear) {
    const err = new Error('Academic year is required');
    err.statusCode = 400;
    throw err;
  }
  return expenseModel.findByAcademicYear(academicYear);
}

async function createExpense(payload) {
  if (Array.isArray(payload)) {
    if (!payload.length) {
      const err = new Error('Expense data is required');
      err.statusCode = 400;
      throw err;
    }
    return expenseModel.createExpensesBatch(payload);
  }
  if (!payload.academic_year || !payload.ft_expense_master_id || payload.expense_amount === undefined) {
    const err = new Error('Academic year, expense title and amount are required');
    err.statusCode = 400;
    throw err;
  }
  return expenseModel.createExpense(payload);
}

async function updateExpense(id, payload) {
  const existing = await expenseModel.findById(id);
  if (!existing) {
    const err = new Error('Expense not found');
    err.statusCode = 404;
    throw err;
  }
  return expenseModel.updateExpense(id, payload);
}

async function deleteExpense(id) {
  const existing = await expenseModel.findById(id);
  if (!existing) {
    const err = new Error('Expense not found');
    err.statusCode = 404;
    throw err;
  }
  return expenseModel.deleteExpense(id);
}

module.exports = {
  getExpenses,
  getExpensesByAcademicYear,
  createExpense,
  updateExpense,
  deleteExpense,
};