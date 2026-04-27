const express = require('express');
const router = express.Router();
const staffDepartmentController = require('../controllers/establishment/staffDepartment.controller');

router.get('/:id/departments', staffDepartmentController.listDepartments);
router.post('/:id/departments', staffDepartmentController.createDepartment);
router.patch('/:id/departments/:departmentStaffId', staffDepartmentController.updateDepartment);
router.delete('/:id/departments/:departmentStaffId', staffDepartmentController.deleteDepartment);

module.exports = router;
