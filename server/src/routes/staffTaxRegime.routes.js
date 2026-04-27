const express = require('express');
const router = express.Router();
const staffTaxRegimeController = require('../controllers/establishment/staffTaxRegime.controller');

router.get('/tax-regimes/options', staffTaxRegimeController.listTaxRegimeHeads);
router.get('/:id/tax-regimes', staffTaxRegimeController.listTaxRegimes);
router.post('/:id/tax-regimes', staffTaxRegimeController.createTaxRegime);
router.patch('/:id/tax-regimes/:regimeRowId', staffTaxRegimeController.updateTaxRegime);
router.delete('/:id/tax-regimes/:regimeRowId', staffTaxRegimeController.deleteTaxRegime);

module.exports = router;
