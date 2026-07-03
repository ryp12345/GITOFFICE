const { pool } = require('../../config/db');

async function getDashboardStats() {
  const { rows } = await pool.query(
    `
      SELECT
        (SELECT COUNT(*) FROM fastrack_instances) AS ft_instance_count,
        (SELECT COUNT(*) FROM fastrack_courses) AS ft_courses_count,
        (SELECT COUNT(*) FROM schemes) AS ft_scheme_count,
        (SELECT COALESCE(SUM(expense_amount), 0) FROM fastrack_expenses) AS fastrack_expense_total
    `
  );
  return rows[0] || {};
}

async function getExpensesGrouped() {
  const { rows } = await pool.query(
    `
      SELECT
        fem.title,
        fe.ft_expense_master_id,
        SUM(fe.expense_amount) AS total_amount
      FROM fastrack_expenses fe
      JOIN fastrack_expenses_master fem ON fem.id = fe.ft_expense_master_id
      GROUP BY fe.ft_expense_master_id, fem.title
      ORDER BY fem.title ASC
    `
  );
  return rows;
}

async function getCourseTypes() {
  const { rows } = await pool.query(
    `
      SELECT id, course_type, Is_Remunerated
      FROM ftcourses
      ORDER BY id ASC
    `
  );
  return rows;
}

async function getDashboardData() {
  const [stats, expenses, courseTypes] = await Promise.all([
    getDashboardStats(),
    getExpensesGrouped(),
    getCourseTypes(),
  ]);

  return {
    ...stats,
    expenses,
    ft_course_statistic: courseTypes,
  };
}

module.exports = {
  getDashboardStats,
  getExpensesGrouped,
  getCourseTypes,
  getDashboardData,
};
