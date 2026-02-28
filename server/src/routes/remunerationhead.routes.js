const express = require('express');
const router = express.Router();
const remunerationHeadController = require('../controllers/remunerationhead.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { roleMiddleware } = require('../middlewares/role.middleware');

router.get('/', authMiddleware, remunerationHeadController.getAll);
router.get('/:id', authMiddleware, remunerationHeadController.getById);
router.post('/', authMiddleware, roleMiddleware('Establishment', 'super-admin'), remunerationHeadController.create);
router.put('/:id', authMiddleware, roleMiddleware('Establishment', 'super-admin'), remunerationHeadController.update);
router.delete('/:id', authMiddleware, roleMiddleware('Establishment', 'super-admin'), remunerationHeadController.delete);

module.exports = router;