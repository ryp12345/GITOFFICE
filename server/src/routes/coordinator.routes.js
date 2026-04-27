const { Router } = require('express');
const coordinatorController = require('../controllers/super-admin/coordinator.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');

const router = Router();

router.get('/', authMiddleware, coordinatorController.list);
router.get('/:id', authMiddleware, coordinatorController.getOne);
router.post('/', authMiddleware, coordinatorController.create);
router.put('/:id', authMiddleware, coordinatorController.update);
router.delete('/:id', authMiddleware, coordinatorController.remove);

module.exports = router;
