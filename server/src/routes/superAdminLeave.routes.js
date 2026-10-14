const { Router } = require('express');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { roleMiddleware } = require('../middlewares/role.middleware');
const superAdminLeaveApplicationController = require('../controllers/superAdminLeaveApplication.controller');

const router = Router();

// Only Super Admin can access
const superAdminOnly = roleMiddleware('Super Admin', 'super-admin', 'admin');

router.get(
  '/it-cell-leave-applications',
  authMiddleware,
  superAdminOnly,
  superAdminLeaveApplicationController.listItCellLeaveApplications
);

router.post(
  '/it-cell-leave-applications/bulk-action',
  authMiddleware,
  superAdminOnly,
  superAdminLeaveApplicationController.bulkUpdateItCellLeaves
);

router.post(
  '/it-cell-leave-applications/:id/recommend',
  authMiddleware,
  superAdminOnly,
  superAdminLeaveApplicationController.recommendItCellLeave
);

router.post(
  '/it-cell-leave-applications/:id/reject',
  authMiddleware,
  superAdminOnly,
  superAdminLeaveApplicationController.rejectItCellLeave
);

module.exports = router;
