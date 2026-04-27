const express = require('express');
const router = express.Router();
const staffQualificationController = require('../controllers/establishment/staffQualification.controller');

// GET all qualifications for a staff member
router.get('/:staffId', staffQualificationController.getAllByStaffId);

// POST a new qualification for a staff member
router.post('/:staffId', staffQualificationController.create);

// PUT update a qualification record
router.put('/record/:id', staffQualificationController.update);

// DELETE a qualification record
router.delete('/record/:id', staffQualificationController.remove);

module.exports = router;
