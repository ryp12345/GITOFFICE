const { Router } = require('express');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { roleMiddleware } = require('../middlewares/role.middleware');
const fastrackStaffController = require('../controllers/teaching/fastrackStaff.controller');
const { fastrackPdfUploader } = require('../middlewares/upload.middleware');

const router = Router();

// All routes require Teaching role
const teachingAuth = [authMiddleware, roleMiddleware('Teaching', 'teaching')];

// Lookup data (shared)
router.get('/lookup', ...teachingAuth, fastrackStaffController.getLookupData);

// Faculty: My Courses
router.get('/my-courses', ...teachingAuth, fastrackStaffController.listMyCourses);
router.post('/my-courses/:id', ...teachingAuth, fastrackPdfUploader(), fastrackStaffController.updateMyCourse);

// Coordinator: Coordinator Management
router.get('/coordinator/courses', ...teachingAuth, fastrackStaffController.listCoordinatorCourses);
router.get('/coordinator/staff-assignment', ...teachingAuth, fastrackStaffController.getStaffForAssignment);
router.post('/coordinator/assign', ...teachingAuth, fastrackStaffController.assignStaffToCourse);
router.post('/coordinator/update', ...teachingAuth, fastrackStaffController.updateStaffAssignment);
router.get('/coordinator/filter', ...teachingAuth, fastrackStaffController.filterCoordinatorCourses);

// Coordinator: Fastrack Verification
router.get('/verification/courses', ...teachingAuth, fastrackStaffController.listVerificationCourses);
router.post('/verification/verify', ...teachingAuth, fastrackStaffController.verifyRecords);

module.exports = router;