const express = require('express');
const router = express.Router();
const qualificationController = require('../controllers/qualification.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { roleMiddleware } = require('../middlewares/role.middleware');

router.get('/', authMiddleware, qualificationController.getAll);
router.get('/:id', authMiddleware, qualificationController.getById);
router.post('/', authMiddleware, roleMiddleware('Establishment', 'super-admin'), qualificationController.create);
router.put('/:id', authMiddleware, roleMiddleware('Establishment', 'super-admin'), qualificationController.update);
router.delete('/:id', authMiddleware, roleMiddleware('Establishment', 'super-admin'), qualificationController.delete);

module.exports = router;
