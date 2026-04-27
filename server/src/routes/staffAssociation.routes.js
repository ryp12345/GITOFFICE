const express = require('express');
const router = express.Router();
const staffAssociationController = require('../controllers/establishment/staffAssociation.controller');

router.get('/:id/associations', staffAssociationController.listAssociations);
router.post('/:id/associations', staffAssociationController.createAssociation);
router.patch('/:id/associations/:associationStaffId', staffAssociationController.updateAssociation);
router.delete('/:id/associations/:associationStaffId', staffAssociationController.deleteAssociation);

module.exports = router;
