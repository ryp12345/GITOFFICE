const { Router } = require('express');
const associationController = require('../controllers/establishment/association.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { requireEstb } = require('../middlewares/staffAccess.middleware');

const router = Router();

router.get('/', authMiddleware, associationController.list);
router.get('/:id', authMiddleware, associationController.getOne);
router.post('/', authMiddleware, requireEstb, associationController.create);
router.put('/:id', authMiddleware, requireEstb, associationController.update);
router.delete('/:id', authMiddleware, requireEstb, associationController.remove);

module.exports = router;
