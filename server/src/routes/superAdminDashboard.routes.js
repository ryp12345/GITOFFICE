const { Router } = require('express');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { roleMiddleware } = require('../middlewares/role.middleware');
const superAdminDashboardController = require('../controllers/superAdminDashboard.controller');

const router = Router();

// Institute-wide summary plus accounts, tickets and leave entitlement coverage for the Super Admin dashboard.
router.get(
  '/dashboard',
  authMiddleware,
  roleMiddleware('Super Admin', 'super-admin', 'admin'),
  superAdminDashboardController.getDashboard
);

module.exports = router;
