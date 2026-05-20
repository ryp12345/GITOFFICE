const { Router } = require('express');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { roleMiddleware } = require('../middlewares/role.middleware');
const deanLeaveApplicationController = require('../controllers/dean/leaveApplication.controller');

const router = Router();

router.get(
  '/leave-applications',
  authMiddleware,
  roleMiddleware('Dean_admin', 'Dean Admin', 'dean_admin'),
  deanLeaveApplicationController.listLeaveApplications
);

router.post(
  '/leave-applications/:id/approve',
  authMiddleware,
  roleMiddleware('Dean_admin', 'Dean Admin', 'dean_admin'),
  deanLeaveApplicationController.approveLeave
);

router.post(
  '/leave-applications/:id/reject',
  authMiddleware,
  roleMiddleware('Dean_admin', 'Dean Admin', 'dean_admin'),
  deanLeaveApplicationController.rejectLeave
);

module.exports = router;
