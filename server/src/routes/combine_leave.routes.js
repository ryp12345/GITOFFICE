const express = require('express');
const router = express.Router();
const combineLeaveController = require('../controllers/combine_leave.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { roleMiddleware } = require('../middlewares/role.middleware');

router.get('/', authMiddleware, combineLeaveController.getByLeaveId);
router.post('/sync', authMiddleware, roleMiddleware('Establishment', 'super-admin'), combineLeaveController.sync);

module.exports = router;
