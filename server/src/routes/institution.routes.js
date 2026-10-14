const { Router } = require('express');
const institutionController = require('../controllers/establishment/institution.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { requireEstb } = require('../middlewares/staffAccess.middleware');

const router = Router();

router.get('/', authMiddleware, institutionController.list);
router.get('/:id', authMiddleware, institutionController.getOne);
router.post('/', authMiddleware, requireEstb, institutionController.create);
router.put('/:id', authMiddleware, requireEstb, institutionController.update);
router.delete('/:id', authMiddleware, requireEstb, institutionController.remove);

module.exports = router;
