const express = require('express');
const router = express.Router();
const holidayrhController = require('../controllers/establishment/holidayrh.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { roleMiddleware } = require('../middlewares/role.middleware');

router.get('/', authMiddleware, holidayrhController.getAll);
router.get('/:id', authMiddleware, holidayrhController.getById);
router.post('/', authMiddleware, roleMiddleware('Establishment'), holidayrhController.create);
router.put('/:id', authMiddleware, roleMiddleware('Establishment'), holidayrhController.update);
router.delete('/:id', authMiddleware, roleMiddleware('Establishment'), holidayrhController.delete);

module.exports = router;
