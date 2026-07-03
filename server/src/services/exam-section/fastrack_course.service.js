const courseModel = require('../../models/exam-section/fastrack_course.model');

async function getCourses() {
  return courseModel.findAll();
}

async function getCourseById(id) {
  return courseModel.findById(id);
}

async function getCoursesByInstanceAndYear(instanceId, academicYear) {
  return courseModel.findByInstanceAndYear(instanceId, academicYear);
}

async function getLookupData() {
  const [departments, instances, courseTypes] = await Promise.all([
    courseModel.findDepartments(),
    courseModel.findInstances(),
    courseModel.findCourseTypes()
  ]);
  return { departments, instances, courseTypes };
}

async function createCourse(payload) {
  if (!payload.course_code || !String(payload.course_code).trim()) {
    const err = new Error('Course code is required');
    err.statusCode = 400;
    throw err;
  }
  if (!payload.course_name || !String(payload.course_name).trim()) {
    const err = new Error('Course name is required');
    err.statusCode = 400;
    throw err;
  }
  if (!payload.ft_instance_id) {
    const err = new Error('Fastrack instance is required');
    err.statusCode = 400;
    throw err;
  }
  if (!payload.no_of_students && payload.no_of_students !== 0) {
    const err = new Error('Number of students is required');
    err.statusCode = 400;
    throw err;
  }

  const existing = await courseModel.checkDuplicate(payload.course_code, payload.ft_instance_id);
  if (existing) {
    const err = new Error('Fastrack Course already exists for the given Course Code and Instance');
    err.statusCode = 409;
    throw err;
  }

  return courseModel.create({
    course_code: String(payload.course_code).trim(),
    course_name: String(payload.course_name).trim(),
    department_id: payload.department_id || null,
    ft_instance_id: Number(payload.ft_instance_id),
    no_of_students: String(payload.no_of_students)
  });
}

async function updateCourse(id, payload) {
  const existing = await courseModel.findById(id);
  if (!existing) {
    const err = new Error('Course not found');
    err.statusCode = 404;
    throw err;
  }

  if (payload.ft_instance_id && payload.course_code) {
    const duplicate = await courseModel.checkDuplicate(payload.course_code, payload.ft_instance_id, id);
    if (duplicate) {
      const err = new Error('Fastrack Course already exists for the given Course Code and Instance');
      err.statusCode = 409;
      throw err;
    }
  }

  const updateData = {};
  if (payload.course_code !== undefined) {
    updateData.course_code = String(payload.course_code).trim();
  }
  if (payload.course_name !== undefined) {
    updateData.course_name = String(payload.course_name).trim();
  }
  if (payload.department_id !== undefined) {
    updateData.department_id = payload.department_id || null;
  }
  if (payload.ft_instance_id !== undefined) {
    updateData.ft_instance_id = Number(payload.ft_instance_id);
  }
  if (payload.no_of_students !== undefined) {
    updateData.no_of_students = String(payload.no_of_students);
  }

  return courseModel.update(id, updateData);
}

async function deleteCourse(id) {
  const existing = await courseModel.findById(id);
  if (!existing) {
    const err = new Error('Course not found');
    err.statusCode = 404;
    throw err;
  }
  return courseModel.remove(id);
}

module.exports = {
  getCourses,
  getCourseById,
  getCoursesByInstanceAndYear,
  getLookupData,
  createCourse,
  updateCourse,
  deleteCourse,
};
