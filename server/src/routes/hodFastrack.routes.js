const { Router } = require('express');
const hodFastrackController = require('../controllers/hod/fastrackHod.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { roleMiddleware } = require('../middlewares/role.middleware');

const router = Router();

const hodAuth = [authMiddleware, roleMiddleware('Head of Department', 'hod')];

// Lookup data for filter dropdowns
router.get('/lookup', ...hodAuth, hodFastrackController.getLookup);

// Fastrack Courses (HOD view)
router.get('/courses', ...hodAuth, hodFastrackController.listCourses);
router.post('/courses/filter', ...hodAuth, hodFastrackController.filterCourses);
router.post('/courses/approve', ...hodAuth, hodFastrackController.approveRecords);
router.get('/courses/course-type/:id', ...hodAuth, hodFastrackController.getCourseType);
router.post('/courses/justification/:id', ...hodAuth, hodFastrackController.processJustification);

// Fastrack Management/Insights (HOD view)
router.get('/management', ...hodAuth, hodFastrackController.listManagement);

module.exports = router;