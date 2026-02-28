const { Router } = require('express');
const { getMe } = require('../controllers/user.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');

const router = Router();

router.get('/me', authMiddleware, getMe);

module.exports = router;
