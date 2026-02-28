const { Router } = require('express');
const departmentController = require('../controllers/department.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');

const router = Router();

router.get('/', authMiddleware, departmentController.list);
router.get('/:id', authMiddleware, departmentController.getOne);
router.post('/', authMiddleware, departmentController.create);
router.put('/:id', authMiddleware, departmentController.update);
router.delete('/:id', authMiddleware, departmentController.remove);

module.exports = router;
