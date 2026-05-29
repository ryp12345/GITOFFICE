const { Router } = require('express');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { roleMiddleware } = require('../middlewares/role.middleware');
const hodDepartmentOverviewController = require('../controllers/hod/departmentOverview.controller');
const hodMyStaffController = require('../controllers/hod/myStaff.controller');
const hodLeaveApplicationController = require('../controllers/hod/leaveApplication.controller');
const associateProfessorController = require('../controllers/hod/associateProfessor.controller');
const professorController = require('../controllers/hod/professor.controller');

const router = Router();

router.get(
  '/department-overview',
  authMiddleware,
  roleMiddleware('Head of Department', 'hod'),
  hodDepartmentOverviewController.getDepartmentOverview
);

router.get(
  '/my-staff',
  authMiddleware,
  roleMiddleware('Head of Department', 'hod'),
  hodMyStaffController.getMyStaff
);

router.get(
  '/leave-applications',
  authMiddleware,
  roleMiddleware('Head of Department', 'hod', 'Registrar', 'registrar'),
  hodLeaveApplicationController.listLeaveApplications
);

router.post(
  '/leave-applications/:id/recommend',
  authMiddleware,
  roleMiddleware('Head of Department', 'hod', 'Registrar', 'registrar'),
  hodLeaveApplicationController.recommendLeave
);

router.post(
  '/leave-applications/:id/reject',
  authMiddleware,
  roleMiddleware('Head of Department', 'hod', 'Registrar', 'registrar'),
  hodLeaveApplicationController.rejectLeave
);

router.post(
  '/leave-applications/bulk-action',
  authMiddleware,
  roleMiddleware('Head of Department', 'hod', 'Registrar', 'registrar'),
  hodLeaveApplicationController.bulkUpdate
);

router.get(
  '/associate-professor-applications',
  authMiddleware,
  roleMiddleware('Head of Department', 'hod'),
  associateProfessorController.list
);

router.post(
  '/associate-professor-applications',
  authMiddleware,
  roleMiddleware('Head of Department', 'hod'),
  associateProfessorController.create
);

router.put(
  '/associate-professor-applications/:id',
  authMiddleware,
  roleMiddleware('Head of Department', 'hod'),
  associateProfessorController.update
);

router.delete(
  '/associate-professor-applications/:id',
  authMiddleware,
  roleMiddleware('Head of Department', 'hod'),
  associateProfessorController.remove
);

router.get(
  '/associate-professor-applications/export',
  authMiddleware,
  roleMiddleware('Head of Department', 'hod'),
  associateProfessorController.exportExcel
);

router.get(
  '/professor-applications',
  authMiddleware,
  roleMiddleware('Head of Department', 'hod'),
  professorController.list
);

router.post(
  '/professor-applications',
  authMiddleware,
  roleMiddleware('Head of Department', 'hod'),
  professorController.create
);

router.put(
  '/professor-applications/:id',
  authMiddleware,
  roleMiddleware('Head of Department', 'hod'),
  professorController.update
);

router.delete(
  '/professor-applications/:id',
  authMiddleware,
  roleMiddleware('Head of Department', 'hod'),
  professorController.remove
);

router.get(
  '/professor-applications/export',
  authMiddleware,
  roleMiddleware('Head of Department', 'hod'),
  professorController.exportExcel
);

module.exports = router;
