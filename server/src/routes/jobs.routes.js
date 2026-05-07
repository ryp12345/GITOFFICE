const express = require('express');
const router = express.Router();
const jobsController = require('../controllers/jobs.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');

router.get('/', jobsController.listJobs);
router.post('/run', authMiddleware, jobsController.runJob);
router.get('/logs', authMiddleware, jobsController.getLogs);

module.exports = router;
