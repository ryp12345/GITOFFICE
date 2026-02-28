const express = require('express');
const router = express.Router();
const casteCategoryController = require('../controllers/castecategory.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { roleMiddleware } = require('../middlewares/role.middleware');

router.get('/', authMiddleware, casteCategoryController.getAll);
router.get('/:id', authMiddleware, casteCategoryController.getById);
router.post('/', authMiddleware, roleMiddleware('Establishment', 'super-admin'), casteCategoryController.create);
router.put('/:id', authMiddleware, roleMiddleware('Establishment', 'super-admin'), casteCategoryController.update);
router.delete('/:id', authMiddleware, roleMiddleware('Establishment', 'super-admin'), casteCategoryController.delete);

module.exports = router;