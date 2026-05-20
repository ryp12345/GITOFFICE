const { Router } = require('express');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { roleMiddleware } = require('../middlewares/role.middleware');
const principalLeaveApplicationController = require('../controllers/principal/leaveApplication.controller');

const router = Router();

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
