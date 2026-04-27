const express = require('express');
const router = express.Router();
const staffLicController = require('../controllers/establishment/staffLic.controller');

router.get('/:id/lics', staffLicController.listLics);
router.post('/:id/lics', staffLicController.createLic);
router.patch('/:id/lics/:licId', staffLicController.updateLic);
router.delete('/:id/lics/:licId', staffLicController.deleteLic);

router.get('/:id/lics/:licId/transactions', staffLicController.listLicTransactions);
router.post('/:id/lics/:licId/transactions', staffLicController.createLicTransaction);
router.delete('/:id/lics/:licId/transactions/:transId', staffLicController.deleteLicTransaction);

module.exports = router;
