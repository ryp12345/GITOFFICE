const { pool } = require('../../config/db');

async function findLatestAcademicYear() {
  const { rows } = await pool.query(
    `SELECT academic_year FROM fastrack_instances ORDER BY id DESC LIMIT 1`
  );
  return rows[0]?.academic_year || null;
}

async function getDashboardData(academicYear) {
  const [incomeResult, expenseResult, sessionsResult, payResult] = await Promise.all([
    pool.query(
      `SELECT academic_year, SUM(total_fees_collected) AS total_income
       FROM fastrack_instances
       WHERE academic_year = $1
       GROUP BY academic_year`,
      [academicYear]
    ),
    pool.query(
      `SELECT SUM(expense_amount) AS total_expenses
       FROM fastrack_expenses
       WHERE academic_year = $1`,
      [academicYear]
    ),
    pool.query(
      `SELECT SUM(fs.classes_conducted) AS total_theory_class,
              SUM(fs.labs_conducted) AS total_lab_class
       FROM fastrack_staffs fs
       JOIN fastrack_courses fc ON fc.id = fs.course_id
       JOIN fastrack_instances fi ON fi.id = fc.ft_instance_id
       WHERE fi.academic_year = $1`,
      [academicYear]
    ),
    pool.query(
      `SELECT id, academic_year, management, rem_theory, rem_lab_teaching, rem_lab_instructors, rem_lab_peon, created_at, updated_at
       FROM fastrack_pays
       WHERE academic_year = $1
       LIMIT 1`,
      [academicYear]
    )
  ]);

  return {
    income: incomeResult.rows[0] || null,
    expenses: expenseResult.rows[0] || null,
    sessions: sessionsResult.rows[0] || null,
    pay: payResult.rows[0] || null,
  };
}

async function findAll() {
  const { rows } = await pool.query(
    `SELECT id, academic_year, management, rem_theory, rem_lab_teaching, rem_lab_instructors, rem_lab_peon, created_at, updated_at
     FROM fastrack_pays
     ORDER BY id DESC`
  );
  return rows;
}

async function findById(id) {
  const { rows } = await pool.query(
    `SELECT id, academic_year, management, rem_theory, rem_lab_teaching, rem_lab_instructors, rem_lab_peon, created_at, updated_at
     FROM fastrack_pays
     WHERE id = $1
     LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

async function findByAcademicYear(academicYear) {
  const { rows } = await pool.query(
    `SELECT id, academic_year, management, rem_theory, rem_lab_teaching, rem_lab_instructors, rem_lab_peon, created_at, updated_at
     FROM fastrack_pays
     WHERE academic_year = $1
     LIMIT 1`,
    [academicYear]
  );
  return rows[0] || null;
}

async function createPayConfig({ academic_year, management, rem_theory, rem_lab_teaching, rem_lab_instructors, rem_lab_peon }) {
  const { rows } = await pool.query(
    `INSERT INTO fastrack_pays (academic_year, management, rem_theory, rem_lab_teaching, rem_lab_instructors, rem_lab_peon, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
     RETURNING id, academic_year, management, rem_theory, rem_lab_teaching, rem_lab_instructors, rem_lab_peon, created_at, updated_at`,
    [academic_year, management, rem_theory, rem_lab_teaching, rem_lab_instructors, rem_lab_peon]
  );
  return rows[0];
}

async function updatePayConfig(id, { academic_year, management, rem_theory, rem_lab_teaching, rem_lab_instructors, rem_lab_peon }) {
  const updates = [];
  const values = [];
  let idx = 1;

  if (academic_year !== undefined) {
    updates.push(`academic_year = $${idx++}`);
    values.push(academic_year);
  }
  if (management !== undefined) {
    updates.push(`management = $${idx++}`);
    values.push(management);
  }
  if (rem_theory !== undefined) {
    updates.push(`rem_theory = $${idx++}`);
    values.push(rem_theory);
  }
  if (rem_lab_teaching !== undefined) {
    updates.push(`rem_lab_teaching = $${idx++}`);
    values.push(rem_lab_teaching);
  }
  if (rem_lab_instructors !== undefined) {
    updates.push(`rem_lab_instructors = $${idx++}`);
    values.push(rem_lab_instructors);
  }
  if (rem_lab_peon !== undefined) {
    updates.push(`rem_lab_peon = $${idx++}`);
    values.push(rem_lab_peon);
  }

  if (updates.length === 0) {
    return findById(id);
  }

  values.push(id);
  const { rows } = await pool.query(
    `UPDATE fastrack_pays SET ${updates.join(', ')}, updated_at = NOW()
     WHERE id = $${idx}
     RETURNING id, academic_year, management, rem_theory, rem_lab_teaching, rem_lab_instructors, rem_lab_peon, created_at, updated_at`,
    values
  );
  return rows[0] || null;
}

module.exports = {
  findLatestAcademicYear,
  getDashboardData,
  findAll,
  findById,
  findByAcademicYear,
  createPayConfig,
  updatePayConfig,
};
