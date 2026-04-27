const express = require('express');
const router = express.Router();
const controller = require('../controllers/establishment/staffDesignationPayscale.controller');

router.get('/:id/designation-payscale', controller.getDesignationPayscale);
router.post('/:id/designation-payscale', controller.changeDesignationPayscale);

router.patch('/:id/designation/:designationRowId', controller.updateDesignationRow);
router.delete('/:id/designation/:designationRowId', controller.deleteDesignationRow);

router.patch('/:id/payscale/:payRecordType/:payRowId', controller.updatePayscaleRow);
router.delete('/:id/payscale/:payRecordType/:payRowId', controller.deletePayscaleRow);

router.get('/:id/additional-designations', controller.listAdditionalDesignations);
router.post('/:id/additional-designations', controller.createAdditionalDesignation);
router.patch('/:id/additional-designations/:rowId', controller.updateAdditionalDesignation);
router.delete('/:id/additional-designations/:rowId', controller.deleteAdditionalDesignation);

module.exports = router;
