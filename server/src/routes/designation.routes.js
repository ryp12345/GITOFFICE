const express = require('express');
const router = express.Router();
const controller = require('../controllers/establishment/designation.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { requireEstb } = require('../middlewares/staffAccess.middleware');

router.get('/', authMiddleware, controller.getAll);
router.get('/:id', authMiddleware, controller.getById);
router.post('/', authMiddleware, requireEstb, controller.create);
router.put('/:id', authMiddleware, requireEstb, controller.update);
router.delete('/:id', authMiddleware, requireEstb, controller.delete);

module.exports = router;
