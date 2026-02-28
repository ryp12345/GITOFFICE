const { Router } = require('express');
const { register, login } = require('../controllers/auth.controller');
const { validateLoginPayload, validateRegisterPayload } = require('../validations/auth.validation');

const router = Router();

router.post('/register', validateRegisterPayload, register);
router.post('/login', validateLoginPayload, login);

module.exports = router;
