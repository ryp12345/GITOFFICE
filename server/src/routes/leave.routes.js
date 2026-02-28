const express = require('express');
const router = express.Router();
const leaveController = require('../controllers/leave.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { roleMiddleware } = require('../middlewares/role.middleware');

router.get('/', authMiddleware, leaveController.getAll);
router.get('/:id', authMiddleware, leaveController.getById);
router.post('/', authMiddleware, roleMiddleware('Establishment','super-admin'), leaveController.create);
router.put('/:id', authMiddleware, roleMiddleware('Establishment','super-admin'), leaveController.update);
router.delete('/:id', authMiddleware, roleMiddleware('Establishment','super-admin'), leaveController.delete);

module.exports = router;
