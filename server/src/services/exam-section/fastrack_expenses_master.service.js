const expenseMasterModel = require('../../models/exam-section/fastrack_expenses_master.model');

async function getExpenseMasters() {
  return expenseMasterModel.findAll();
}

async function getExpenseMasterById(id) {
  return expenseMasterModel.findById(id);
}

async function createExpenseMaster({ title }) {
  if (!title || !String(title).trim()) {
    const err = new Error('Expense title is required');
    err.statusCode = 400;
    throw err;
  }
  return expenseMasterModel.create({ title: String(title).trim() });
}

async function updateExpenseMaster(id, { title }) {
  const existing = await expenseMasterModel.findById(id);
  if (!existing) {
    const err = new Error('Expense master not found');
    err.statusCode = 404;
    throw err;
  }
  return expenseMasterModel.update(id, { title: String(title).trim() });
}

async function deleteExpenseMaster(id) {
  const existing = await expenseMasterModel.findById(id);
  if (!existing) {
    const err = new Error('Expense master not found');
    err.statusCode = 404;
    throw err;
  }
  return expenseMasterModel.remove(id);
}

module.exports = {
  getExpenseMasters,
  getExpenseMasterById,
  createExpenseMaster,
  updateExpenseMaster,
  deleteExpenseMaster,
};
