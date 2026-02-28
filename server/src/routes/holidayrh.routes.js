const express = require('express');
const router = express.Router();
const holidayrhController = require('../controllers/holidayrh.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { roleMiddleware } = require('../middlewares/role.middleware');

router.get('/', authMiddleware, holidayrhController.getAll);
router.get('/:id', authMiddleware, holidayrhController.getById);
router.post('/', authMiddleware, roleMiddleware('Establishment', 'super-admin'), holidayrhController.create);
router.put('/:id', authMiddleware, roleMiddleware('Establishment', 'super-admin'), holidayrhController.update);
router.delete('/:id', authMiddleware, roleMiddleware('Establishment', 'super-admin'), holidayrhController.delete);

module.exports = router;
