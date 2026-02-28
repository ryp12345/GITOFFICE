const express = require('express');
const router = express.Router();
const religionController = require('../controllers/religion.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { roleMiddleware } = require('../middlewares/role.middleware');

router.get('/', authMiddleware, religionController.getAll);
router.get('/:id', authMiddleware, religionController.getById);
router.post('/', authMiddleware, roleMiddleware('Establishment', 'super-admin'), religionController.create);
router.put('/:id', authMiddleware, roleMiddleware('Establishment', 'super-admin'), religionController.update);
router.delete('/:id', authMiddleware, roleMiddleware('Establishment', 'super-admin'), religionController.delete);

module.exports = router;
