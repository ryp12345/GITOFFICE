const ftcourseService = require('../../services/exam-section/ftcourse.service');

async function listCourseTypes(req, res, next) {
  try {
    const courseTypes = await ftcourseService.getCourseTypes();
    res.json({ success: true, data: courseTypes });
  } catch (error) {
    next(error);
  }
}

async function getCourseType(req, res, next) {
  try {
    const courseType = await ftcourseService.getCourseTypeById(req.params.id);
    if (!courseType) {
      const err = new Error('Course type not found');
      err.statusCode = 404;
      return next(err);
    }
    res.json({ success: true, data: courseType });
  } catch (error) {
    next(error);
  }
}

async function createCourseType(req, res, next) {
  try {
    const courseType = await ftcourseService.createCourseType(req.body);
    res.status(201).json({ success: true, data: courseType });
  } catch (error) {
    next(error);
  }
}

async function updateCourseType(req, res, next) {
  try {
    const courseType = await ftcourseService.updateCourseType(req.params.id, req.body);
    if (!courseType) {
      const err = new Error('Course type not found');
      err.statusCode = 404;
      return next(err);
    }
    res.json({ success: true, data: courseType });
  } catch (error) {
    next(error);
  }
}

async function deleteCourseType(req, res, next) {
  try {
    const courseType = await ftcourseService.deleteCourseType(req.params.id);
    if (!courseType) {
      const err = new Error('Course type not found');
      err.statusCode = 404;
      return next(err);
    }
    res.json({ success: true, data: courseType });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listCourseTypes,
  getCourseType,
  createCourseType,
  updateCourseType,
  deleteCourseType,
};
