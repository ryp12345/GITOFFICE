const { Router } = require('express');
const { listUsers, getMe } = require('../controllers/common/user.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { roleMiddleware } = require('../middlewares/role.middleware');

const router = Router();

router.get('/', authMiddleware, roleMiddleware('Super Admin', 'super-admin', 'admin'), listUsers);
router.get('/me', authMiddleware, getMe);

module.exports = router;
