const { Router } = require('express');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { roleMiddleware } = require('../middlewares/role.middleware');
const examSectionDashboardController = require('../controllers/exam-section/dashboard.controller');
const schemeController = require('../controllers/exam-section/scheme.controller');
const ftcourseController = require('../controllers/exam-section/ftcourse.controller');
const fastrackInstanceController = require('../controllers/exam-section/fastrack_instance.controller');
const fastrackCourseController = require('../controllers/exam-section/fastrack_course.controller');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

const router = Router();

router.get(
  '/dashboard',
  authMiddleware,
  roleMiddleware('Exam_section', 'exam_section'),
  examSectionDashboardController.getDashboard
);

router.get(
  '/schemes',
  authMiddleware,
  roleMiddleware('Exam_section', 'exam_section'),
  schemeController.listSchemes
);

router.get(
  '/schemes/:id',
  authMiddleware,
  roleMiddleware('Exam_section', 'exam_section'),
  schemeController.getScheme
);

router.post(
  '/schemes',
  authMiddleware,
  roleMiddleware('Exam_section', 'exam_section'),
  schemeController.createScheme
);

router.patch(
  '/schemes/:id',
  authMiddleware,
  roleMiddleware('Exam_section', 'exam_section'),
  schemeController.updateScheme
);

router.delete(
  '/schemes/:id',
  authMiddleware,
  roleMiddleware('Exam_section', 'exam_section'),
  schemeController.deleteScheme
);

router.get(
  '/course-types',
  authMiddleware,
  roleMiddleware('Exam_section', 'exam_section'),
  ftcourseController.listCourseTypes
);

router.get(
  '/course-types/:id',
  authMiddleware,
  roleMiddleware('Exam_section', 'exam_section'),
  ftcourseController.getCourseType
);

router.post(
  '/course-types',
  authMiddleware,
  roleMiddleware('Exam_section', 'exam_section'),
  ftcourseController.createCourseType
);

router.patch(
  '/course-types/:id',
  authMiddleware,
  roleMiddleware('Exam_section', 'exam_section'),
  ftcourseController.updateCourseType
);

router.delete(
  '/course-types/:id',
  authMiddleware,
  roleMiddleware('Exam_section', 'exam_section'),
  ftcourseController.deleteCourseType
);

router.get(
  '/fastrack-instance/lookup',
  authMiddleware,
  roleMiddleware('Exam_section', 'exam_section'),
  fastrackInstanceController.getLookup
);

router.get(
  '/fastrack-instances',
  authMiddleware,
  roleMiddleware('Exam_section', 'exam_section'),
  fastrackInstanceController.listInstances
);

router.get(
  '/fastrack-instances/:id',
  authMiddleware,
  roleMiddleware('Exam_section', 'exam_section'),
  fastrackInstanceController.getInstance
);

router.post(
  '/fastrack-instances',
  authMiddleware,
  roleMiddleware('Exam_section', 'exam_section'),
  fastrackInstanceController.createInstance
);

router.patch(
  '/fastrack-instances/:id',
  authMiddleware,
  roleMiddleware('Exam_section', 'exam_section'),
  fastrackInstanceController.updateInstance
);

router.delete(
  '/fastrack-instances/:id',
  authMiddleware,
  roleMiddleware('Exam_section', 'exam_section'),
  fastrackInstanceController.deleteInstance
);

router.get(
  '/fastrack/lookup',
  authMiddleware,
  roleMiddleware('Exam_section', 'exam_section'),
  fastrackCourseController.getLookup
);

router.get(
  '/fastrack',
  authMiddleware,
  roleMiddleware('Exam_section', 'exam_section'),
  fastrackCourseController.listCourses
);

router.get(
  '/fastrack/academic_year',
  authMiddleware,
  roleMiddleware('Exam_section', 'exam_section'),
  fastrackCourseController.getCoursesByAcademicYear
);

router.get(
  '/fastrack/:id',
  authMiddleware,
  roleMiddleware('Exam_section', 'exam_section'),
  fastrackCourseController.getCourse
);

router.post(
  '/fastrack',
  authMiddleware,
  roleMiddleware('Exam_section', 'exam_section'),
  fastrackCourseController.createCourse
);

router.patch(
  '/fastrack/:id',
  authMiddleware,
  roleMiddleware('Exam_section', 'exam_section'),
  fastrackCourseController.updateCourse
);

router.delete(
  '/fastrack/:id',
  authMiddleware,
  roleMiddleware('Exam_section', 'exam_section'),
  fastrackCourseController.deleteCourse
);

router.get(
  '/fastrack/download-template',
  authMiddleware,
  roleMiddleware('Exam_section', 'exam_section'),
  fastrackCourseController.downloadTemplate
);

router.post(
  '/fastrack/upload_excel',
  authMiddleware,
  roleMiddleware('Exam_section', 'exam_section'),
  upload.single('fileinput'),
  fastrackCourseController.uploadExcel
);

router.post(
  '/fastrack/course_details/export',
  authMiddleware,
  roleMiddleware('Exam_section', 'exam_section'),
  fastrackCourseController.exportCourses
);

module.exports = router;
