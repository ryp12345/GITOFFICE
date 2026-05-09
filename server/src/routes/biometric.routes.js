const express = require('express');
const router = express.Router();
const { daily, monthly } = require('../controllers/biometric.controller');

router.get('/daily', daily);
router.get('/monthly', monthly);

module.exports = router;
