const { Router } = require('express');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { roleMiddleware } = require('../middlewares/role.middleware');
const establishmentDashboardController = require('../controllers/establishment/dashboard.controller');

const router = Router();

// Institute-wide summary for the Establishment dashboard.
router.get(
  '/dashboard',
  authMiddleware,
  roleMiddleware('Establishment', 'establishment', 'Super Admin', 'super-admin', 'admin'),
  establishmentDashboardController.getDashboard
);

// Staff behind one "Staff Records to Complete" count (check = no_department, no_designation, ...).
router.get(
  '/dashboard/data-quality/:check',
  authMiddleware,
  roleMiddleware('Establishment', 'establishment', 'Super Admin', 'super-admin', 'admin'),
  establishmentDashboardController.getDataQualityStaff
);

module.exports = router;
