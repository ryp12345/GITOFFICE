const express = require('express');
const router = express.Router();
const staffLeaveController = require('../controllers/establishment/staffLeave.controller');

router.get('/:id/leaves', staffLeaveController.getStaffLeaves);

module.exports = router;
