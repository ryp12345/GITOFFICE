const express = require('express');
const router = express.Router();
const staffAnnualIncrementController = require('../controllers/establishment/staffAnnualIncrement.controller');

router.get('/:id/annual-increments', staffAnnualIncrementController.listAnnualIncrements);
router.post('/:id/annual-increments', staffAnnualIncrementController.createAnnualIncrement);
router.patch('/:id/annual-increments/:incrementId', staffAnnualIncrementController.updateAnnualIncrement);
router.delete('/:id/annual-increments/:incrementId', staffAnnualIncrementController.deleteAnnualIncrement);

module.exports = router;
