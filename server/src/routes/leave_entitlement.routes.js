const express = require('express');
const router = express.Router();
const leaveEntitlementController = require('../controllers/establishment/leave_entitlement.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { roleMiddleware } = require('../middlewares/role.middleware');

router.get('/meta', authMiddleware, leaveEntitlementController.getMeta);
router.get('/', authMiddleware, leaveEntitlementController.getAll);
router.get('/hod', authMiddleware, leaveEntitlementController.getForHod);
router.patch('/', authMiddleware, roleMiddleware('Establishment'), leaveEntitlementController.update);

module.exports = router;
