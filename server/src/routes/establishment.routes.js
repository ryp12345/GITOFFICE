const { Router } = require('express');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { roleMiddleware } = require('../middlewares/role.middleware');
const establishmentDashboardController = require('../controllers/establishment/dashboard.controller');

const router = Router();

// Institute-wide summary for the Establishment dashboard.
router.get(
  '/dashboard',
  authMiddleware,
  roleMiddleware('Establishment', 'establishment', 'super-admin'),
  establishmentDashboardController.getDashboard
);

module.exports = router;
