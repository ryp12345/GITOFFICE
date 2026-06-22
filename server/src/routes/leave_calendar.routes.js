const express = require('express');
const router = express.Router();
const controller = require('../controllers/establishment/leave_calendar.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { roleMiddleware } = require('../middlewares/role.middleware');

router.get('/meta', authMiddleware, controller.getMeta);
router.get('/events', authMiddleware, controller.getEvents);
router.get('/alternate-staff', authMiddleware, controller.getAlternateStaff);
router.get('/applications',     authMiddleware, controller.getApplicationsByStaff);
router.get('/applications/:id', authMiddleware, controller.getApplicationById);
router.get('/yearwise', authMiddleware, controller.getYearwiseLeaveData);
router.get('/pdf/:id', authMiddleware, controller.getLeavePDF);

router.post('/validate',      authMiddleware, roleMiddleware('Establishment'), controller.validateApplication);
router.post('/applications',  authMiddleware, controller.createApplication);
router.patch('/applications/:id', authMiddleware, controller.updateApplication);
router.post('/applications/:id/cancel', authMiddleware, controller.cancelApplication);

module.exports = router;
