const express = require('express');
const router = express.Router();
const { daily } = require('../controllers/biometric.controller');

router.get('/daily', daily);

module.exports = router;
