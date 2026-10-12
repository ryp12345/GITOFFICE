const { Router } = require('express');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { roleMiddleware } = require('../middlewares/role.middleware');
const principalOfficeDashboardController = require('../controllers/principal-office/dashboard.controller');

const router = Router();

router.get(
  '/dashboard',
  authMiddleware,
  roleMiddleware('principal_office', 'Principal Office'),
  principalOfficeDashboardController.getDashboard
);

module.exports = router;
