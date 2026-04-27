const express = require('express');
const router = express.Router();
const staffInstitutionController = require('../controllers/establishment/staffInstitution.controller');

router.get('/:id/institutions', staffInstitutionController.listInstitutions);
router.post('/:id/institutions', staffInstitutionController.createInstitution);
router.patch('/:id/institutions/:institutionStaffId', staffInstitutionController.updateInstitution);
router.delete('/:id/institutions/:institutionStaffId', staffInstitutionController.deleteInstitution);

module.exports = router;
