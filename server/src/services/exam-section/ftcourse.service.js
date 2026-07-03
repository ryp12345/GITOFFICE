const ftcourseModel = require('../../models/exam-section/ftcourse.model');

async function getCourseTypes() {
  return ftcourseModel.findAll();
}

async function getCourseTypeById(id) {
  return ftcourseModel.findById(id);
}

async function createCourseType({ course_type, is_remunerated }) {
  if (!course_type || !String(course_type).trim()) {
    const err = new Error('Course type is required');
    err.statusCode = 400;
    throw err;
  }
  return ftcourseModel.create({
    course_type: String(course_type).trim(),
    is_remunerated: is_remunerated || 'Yes'
  });
}

async function updateCourseType(id, { course_type, is_remunerated }) {
  const existing = await ftcourseModel.findById(id);
  if (!existing) {
    const err = new Error('Course type not found');
    err.statusCode = 404;
    throw err;
  }

  const updateData = {};
  if (course_type !== undefined) {
    updateData.course_type = String(course_type).trim();
  }
  if (is_remunerated !== undefined) {
    updateData.is_remunerated = is_remunerated;
  }

  return ftcourseModel.update(id, updateData);
}

async function deleteCourseType(id) {
  const existing = await ftcourseModel.findById(id);
  if (!existing) {
    const err = new Error('Course type not found');
    err.statusCode = 404;
    throw err;
  }
  return ftcourseModel.remove(id);
}

module.exports = {
  getCourseTypes,
  getCourseTypeById,
  createCourseType,
  updateCourseType,
  deleteCourseType,
};
