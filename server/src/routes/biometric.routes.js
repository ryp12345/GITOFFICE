const express = require('express');
const router = express.Router();
const { daily, monthly, muster, downloadMonthlyForHod, monthlySummaryForHod } = require('../controllers/biometric.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { roleMiddleware } = require('../middlewares/role.middleware');

router.get('/daily', daily);
router.get('/monthly', monthly);
router.get('/muster', muster);
router.get('/monthly/download-hod', authMiddleware, roleMiddleware('Head of Department', 'hod'), downloadMonthlyForHod);
router.get('/monthly/hod-summary', authMiddleware, roleMiddleware('Head of Department', 'hod'), monthlySummaryForHod);

module.exports = router;
