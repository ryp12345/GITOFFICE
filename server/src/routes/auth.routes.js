const { Router } = require('express');
const { register, login, refresh } = require('../controllers/auth.controller');
const {
	validateLoginPayload,
	validateRegisterPayload,
	validateRefreshPayload
} = require('../validations/auth.validation');

const router = Router();

router.post('/register', validateRegisterPayload, register);
router.post('/login', validateLoginPayload, login);
router.post('/refresh', validateRefreshPayload, refresh);

module.exports = router;
