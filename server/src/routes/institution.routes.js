const { Router } = require('express');
const institutionController = require('../controllers/institution.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');

const router = Router();

router.get('/', authMiddleware, institutionController.list);
router.get('/:id', authMiddleware, institutionController.getOne);
router.post('/', authMiddleware, institutionController.create);
router.put('/:id', authMiddleware, institutionController.update);
router.delete('/:id', authMiddleware, institutionController.remove);

module.exports = router;
