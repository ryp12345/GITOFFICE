const { Router } = require('express');
const { listUsers, getMe, impersonate, resetPassword, stopImpersonation, changeOwnPassword, verifyCurrentPassword } = require('../controllers/common/user.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { roleMiddleware } = require('../middlewares/role.middleware');

const router = Router();

router.get('/', authMiddleware, roleMiddleware('Super Admin', 'super-admin', 'admin'), listUsers);
router.get('/me', authMiddleware, getMe);
router.post('/stop-impersonation', authMiddleware, stopImpersonation);
router.post('/:id/impersonate', authMiddleware, roleMiddleware('Super Admin', 'super-admin', 'admin'), impersonate);
router.post('/:id/reset-password', authMiddleware, roleMiddleware('Super Admin', 'super-admin', 'admin'), resetPassword);
router.post('/me/change-password', authMiddleware, changeOwnPassword);
router.post('/me/verify-password', authMiddleware, verifyCurrentPassword);


module.exports = router;
