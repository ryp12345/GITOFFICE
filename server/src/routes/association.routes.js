const { Router } = require('express');
const associationController = require('../controllers/association.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');

const router = Router();

router.get('/', authMiddleware, associationController.list);
router.get('/:id', authMiddleware, associationController.getOne);
router.post('/', authMiddleware, associationController.create);
router.put('/:id', authMiddleware, associationController.update);
router.delete('/:id', authMiddleware, associationController.remove);

module.exports = router;
