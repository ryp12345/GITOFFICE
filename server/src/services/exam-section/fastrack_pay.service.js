const payModel = require('../../models/exam-section/fastrack_pay.model');

async function getPayConfig() {
  const latestYear = await payModel.findLatestAcademicYear();
  if (!latestYear) {
    return {
      academic_year: null,
      total_income: null,
      total_expenses: null,
      total_sessions: null,
      fastrack_pays: null,
    };
  }
  const data = await payModel.getDashboardData(latestYear);
  return {
    academic_year: latestYear,
    total_income: data.income,
    total_expenses: data.expenses,
    total_sessions: data.sessions,
    fastrack_pays: data.pay,
  };
}

async function getPayConfigData(academicYear) {
  if (!academicYear) {
    return {
      total_income: null,
      total_expenses: null,
      total_sessions: null,
      fastrack_pays: null,
    };
  }
  const data = await payModel.getDashboardData(academicYear);
  return {
    total_income: data.income,
    total_expenses: data.expenses,
    total_sessions: data.sessions,
    fastrack_pays: data.pay,
  };
}

async function createPayConfig(payload) {
  if (!payload.academic_year || !String(payload.academic_year).trim()) {
    const err = new Error('Academic year is required');
    err.statusCode = 400;
    throw err;
  }

  const existing = await payModel.findByAcademicYear(payload.academic_year);
  if (existing) {
    const err = new Error('Pay configuration for this academic year already exists');
    err.statusCode = 409;
    throw err;
  }

  return payModel.createPayConfig({
    academic_year: String(payload.academic_year).trim(),
    management: payload.management ?? 0,
    rem_theory: payload.rem_theory ?? 0,
    rem_lab_teaching: payload.rem_lab_teaching ?? 0,
    rem_lab_instructors: payload.rem_lab_instructors ?? 0,
    rem_lab_peon: payload.rem_lab_peon ?? 0,
  });
}

async function updatePayConfig(id, payload) {
  const existing = await payModel.findById(id);
  if (!existing) {
    const err = new Error('Pay configuration not found');
    err.statusCode = 404;
    throw err;
  }

  const updateData = {};
  if (payload.academic_year !== undefined) {
    updateData.academic_year = String(payload.academic_year).trim();
  }
  if (payload.management !== undefined) {
    updateData.management = payload.management;
  }
  if (payload.rem_theory !== undefined) {
    updateData.rem_theory = payload.rem_theory;
  }
  if (payload.rem_lab_teaching !== undefined) {
    updateData.rem_lab_teaching = payload.rem_lab_teaching;
  }
  if (payload.rem_lab_instructors !== undefined) {
    updateData.rem_lab_instructors = payload.rem_lab_instructors;
  }
  if (payload.rem_lab_peon !== undefined) {
    updateData.rem_lab_peon = payload.rem_lab_peon;
  }

  return payModel.updatePayConfig(id, updateData);
}

module.exports = {
  getPayConfig,
  getPayConfigData,
  createPayConfig,
  updatePayConfig,
};
