const express = require('express');
const router = express.Router();
const staffController = require('../controllers/establishment/staff.controller');

router.get('/checkemailid', staffController.checkEmail);
router.get('/employee/designations', staffController.getDesignationsByEmployeeType);
router.get('/getcastecategory_list', staffController.getCasteCategoriesByReligion);
router.get('/getstaffpay_list', staffController.getStaffPayList);
router.get('/', staffController.list);
router.post('/', staffController.create);
router.get('/:id/associations', staffController.listAssociations);
router.post('/:id/associations', staffController.createAssociation);
router.patch('/:id/associations/:associationStaffId', staffController.updateAssociation);
router.delete('/:id/associations/:associationStaffId', staffController.deleteAssociation);
router.put('/:id', staffController.update);
router.delete('/:id', staffController.remove);
router.get('/:id', staffController.getById);

module.exports = router;
