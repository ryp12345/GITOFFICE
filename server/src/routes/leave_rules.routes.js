const express = require('express');
const router = express.Router();
const leaveRulesController = require('../controllers/leave_rules.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { roleMiddleware } = require('../middlewares/role.middleware');

router.get('/', authMiddleware, leaveRulesController.getAll);
router.get('/:id', authMiddleware, leaveRulesController.getById);
router.post('/', authMiddleware, roleMiddleware('Establishment','super-admin'), leaveRulesController.create);
router.put('/:id', authMiddleware, roleMiddleware('Establishment','super-admin'), leaveRulesController.update);
router.delete('/:id', authMiddleware, roleMiddleware('Establishment','super-admin'), leaveRulesController.delete);

module.exports = router;
