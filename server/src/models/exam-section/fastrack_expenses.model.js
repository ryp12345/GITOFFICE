const { pool } = require('../../config/db');

async function findAll(academicYear) {
  let query = `SELECT id, academic_year, ft_expense_master_id, expense_amount, created_at, updated_at FROM fastrack_expenses`;
  const params = [];
  if (academicYear) {
    query += ` WHERE academic_year = $1`;
    params.push(academicYear);
  }
  query += ` ORDER BY id DESC`;
  const { rows } = await pool.query(query, params);
  return rows;
}

async function findByAcademicYear(academicYear) {
  const { rows } = await pool.query(
    `SELECT id, academic_year, ft_expense_master_id, expense_amount, created_at, updated_at FROM fastrack_expenses WHERE academic_year = $1 ORDER BY id DESC`,
    [academicYear]
  );
  return rows;
}

async function findById(id) {
  const { rows } = await pool.query(
    `SELECT id, academic_year, ft_expense_master_id, expense_amount, created_at, updated_at FROM fastrack_expenses WHERE id = $1 LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

async function createExpense({ academic_year, ft_expense_master_id, expense_amount }) {
  const { rows } = await pool.query(
    `INSERT INTO fastrack_expenses (academic_year, ft_expense_master_id, expense_amount, created_at, updated_at) VALUES ($1, $2, $3, NOW(), NOW()) RETURNING id, academic_year, ft_expense_master_id, expense_amount, created_at, updated_at`,
    [academic_year, ft_expense_master_id, expense_amount]
  );
  return rows[0];
}

async function createExpensesBatch(expenses) {
  const values = [];
  const params = [];
  let idx = 1;
  expenses.forEach((exp) => {
    values.push(`($${idx++}, $${idx++}, $${idx++}, NOW(), NOW())`);
    params.push(exp.academic_year, exp.ft_expense_master_id, exp.expense_amount);
  });
  const query = `INSERT INTO fastrack_expenses (academic_year, ft_expense_master_id, expense_amount, created_at, updated_at) VALUES ${values.join(', ')} RETURNING id, academic_year, ft_expense_master_id, expense_amount, created_at, updated_at`;
  const { rows } = await pool.query(query, params);
  return rows;
}

async function updateExpense(id, { academic_year, ft_expense_master_id, expense_amount }) {
  const updates = [];
  const values = [];
  let idx = 1;
  if (academic_year !== undefined) {
    updates.push(`academic_year = $${idx++}`);
    values.push(academic_year);
  }
  if (ft_expense_master_id !== undefined) {
    updates.push(`ft_expense_master_id = $${idx++}`);
    values.push(ft_expense_master_id);
  }
  if (expense_amount !== undefined) {
    updates.push(`expense_amount = $${idx++}`);
    values.push(expense_amount);
  }
  if (updates.length === 0) {
    return findById(id);
  }
  values.push(id);
  const { rows } = await pool.query(
    `UPDATE fastrack_expenses SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${idx} RETURNING id, academic_year, ft_expense_master_id, expense_amount, created_at, updated_at`,
    values
  );
  return rows[0] || null;
}

async function deleteExpense(id) {
  const { rows } = await pool.query(
    `DELETE FROM fastrack_expenses WHERE id = $1 RETURNING id`,
    [id]
  );
  return rows[0] || null;
}

module.exports = {
  findAll,
  findByAcademicYear,
  findById,
  createExpense,
  createExpensesBatch,
  updateExpense,
  deleteExpense,
};