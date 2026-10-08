const express = require('express');
const router = express.Router();
const leaveEntitlementController = require('../controllers/establishment/leave_entitlement.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { roleMiddleware } = require('../middlewares/role.middleware');

router.get('/meta', authMiddleware, leaveEntitlementController.getMeta);
router.get(
  '/',
  authMiddleware,
  roleMiddleware('Establishment', 'Super Admin', 'super-admin', 'admin', 'Principal', 'Dean_admin', 'Dean Admin'),
  leaveEntitlementController.getAll
);
router.get('/me', authMiddleware, leaveEntitlementController.getMine);
router.get(
  '/hod',
  authMiddleware,
  roleMiddleware('Head of Department', 'hod', 'Registrar', 'registrar'),
  leaveEntitlementController.getForHod
);
router.patch('/', authMiddleware, roleMiddleware('Establishment'), leaveEntitlementController.update);

module.exports = router;
