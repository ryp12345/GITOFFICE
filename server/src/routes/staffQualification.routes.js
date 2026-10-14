const express = require('express');
const router = express.Router();
const staffQualificationController = require('../controllers/establishment/staffQualification.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { qualificationGuard } = require('../middlewares/staffAccess.middleware');

// GET all qualifications for a staff member
router.get('/:staffId', authMiddleware, qualificationGuard, staffQualificationController.getAllByStaffId);

// POST a new qualification for a staff member
router.post('/:staffId', authMiddleware, qualificationGuard, staffQualificationController.create);

// PUT update a qualification record
router.put('/record/:id', authMiddleware, qualificationGuard, staffQualificationController.update);

// DELETE a qualification record
router.delete('/record/:id', authMiddleware, qualificationGuard, staffQualificationController.remove);

module.exports = router;
