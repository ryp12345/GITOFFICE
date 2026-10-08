const express = require('express');
const router = express.Router();
const jobsController = require('../controllers/jobs.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { roleMiddleware } = require('../middlewares/role.middleware');

// Scheduled jobs change every staff member's leave entitlements or send bulk mail,
// so only administrators may list, trigger or inspect them.
const jobAdmins = roleMiddleware('Super Admin', 'super-admin', 'admin', 'Establishment');

router.get('/', authMiddleware, jobAdmins, jobsController.listJobs);
router.post('/run', authMiddleware, jobAdmins, jobsController.runJob);
router.get('/logs', authMiddleware, jobAdmins, jobsController.getLogs);

module.exports = router;
