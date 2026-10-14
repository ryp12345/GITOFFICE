const express = require('express');
const router = express.Router();
const controller = require('../controllers/notifications.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');

router.get('/', authMiddleware, controller.getNotifications);

module.exports = router;
