const { Router } = require('express');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { roleMiddleware } = require('../middlewares/role.middleware');
const principalLeaveApplicationController = require('../controllers/principal/leaveApplication.controller');
const facultyRecruitmentController = require('../controllers/principal/facultyRecruitment.controller');

const router = Router();

// Faculty Recruitment (read-only, every department). Laravel showed it to the Principal only;
// the React Principal/Dean portal gives it to Dean_admin as well.
const facultyRecruitmentRoles = roleMiddleware(
  'Principal',
  'principal',
  'PRINCIPAL',
  'Dean_admin',
  'Dean Admin',
  'dean_admin'
);

router.get(
  '/faculty-recruitment/associate-professor-applications',
  authMiddleware,
  facultyRecruitmentRoles,
  facultyRecruitmentController.listAssociateProfessorApplications
);

router.get(
  '/faculty-recruitment/professor-applications',
  authMiddleware,
  facultyRecruitmentRoles,
  facultyRecruitmentController.listProfessorApplications
);

router.get(
  '/leave-applications',
  authMiddleware,
  roleMiddleware('Principal', 'principal', 'PRINCIPAL'),
  principalLeaveApplicationController.listLeaveApplications
);

router.post(
  '/leave-applications/:id/approve',
  authMiddleware,
  roleMiddleware('Principal', 'principal', 'PRINCIPAL'),
  principalLeaveApplicationController.approveLeave
);

router.post(
  '/leave-applications/:id/reject',
  authMiddleware,
  roleMiddleware('Principal', 'principal', 'PRINCIPAL'),
  principalLeaveApplicationController.rejectLeave
);

module.exports = router;
