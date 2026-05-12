const express = require('express');
const router = express.Router();
const { daily, monthly, muster } = require('../controllers/biometric.controller');

router.get('/daily', daily);
router.get('/monthly', monthly);
router.get('/muster', muster);

module.exports = router;
