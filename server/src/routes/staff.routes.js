const express = require('express');
const router = express.Router();
const staffController = require('../controllers/staff.controller');

router.get('/checkemailid', staffController.checkEmail);
router.get('/employee/designations', staffController.getDesignationsByEmployeeType);
router.get('/getcastecategory_list', staffController.getCasteCategoriesByReligion);
router.get('/getstaffpay_list', staffController.getStaffPayList);
router.get('/', staffController.list);
router.post('/', staffController.create);
router.delete('/:id', staffController.remove);

module.exports = router;
