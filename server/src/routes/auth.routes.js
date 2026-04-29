const { Router } = require('express');
const { register, login, refresh, forgotPassword, resetPassword } = require('../controllers/common/auth.controller');
const {
	validateLoginPayload,
	validateRegisterPayload,
	validateRefreshPayload,
	validateForgotPasswordPayload,
	validateResetPasswordPayload
} = require('../validations/auth.validation');

const router = Router();

router.post('/register', validateRegisterPayload, register);
router.post('/login', validateLoginPayload, login);
router.post('/refresh', validateRefreshPayload, refresh);
router.post('/forgot-password', validateForgotPasswordPayload, forgotPassword);
router.post('/reset-password', validateResetPasswordPayload, resetPassword);

module.exports = router;
