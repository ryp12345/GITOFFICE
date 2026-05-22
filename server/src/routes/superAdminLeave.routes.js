const { Router } = require('express');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { roleMiddleware } = require('../middlewares/role.middleware');
const superAdminLeaveApplicationController = require('../controllers/superAdminLeaveApplication.controller');

const router = Router();

// Only Super Admin can access
router.get(
  '/it-cell-leave-applications',
  authMiddleware,
  roleMiddleware('Super Admin', 'super-admin', 'admin'),
  superAdminLeaveApplicationController.listItCellLeaveApplications
);

module.exports = router;
