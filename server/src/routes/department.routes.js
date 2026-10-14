const { Router } = require('express');
const departmentController = require('../controllers/establishment/department.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { requireEstb } = require('../middlewares/staffAccess.middleware');

const router = Router();

router.get('/', authMiddleware, departmentController.list);
router.get('/:id', authMiddleware, departmentController.getOne);
router.post('/', authMiddleware, requireEstb, departmentController.create);
router.put('/:id', authMiddleware, requireEstb, departmentController.update);
router.delete('/:id', authMiddleware, requireEstb, departmentController.remove);

module.exports = router;
