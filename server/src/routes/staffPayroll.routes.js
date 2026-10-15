const express = require('express');
const router = express.Router();
const staffPayrollController = require('../controllers/establishment/staffPayroll.controller');

router.get('/:id/festival-advances', staffPayrollController.listFestivalAdvances);
router.post('/:id/festival-advances', staffPayrollController.createFestivalAdvance);
router.patch('/:id/festival-advances/:advanceId', staffPayrollController.updateFestivalAdvance);
router.delete('/:id/festival-advances/:advanceId', staffPayrollController.deleteFestivalAdvance);

router.get('/:id/remunerations', staffPayrollController.listRemunerations);
router.post('/:id/remunerations', staffPayrollController.createRemunerations);
router.patch('/:id/remunerations/:remunerationId', staffPayrollController.updateRemuneration);
router.delete('/:id/remunerations/:remunerationId', staffPayrollController.deleteRemuneration);

router.get('/:id/salaries', staffPayrollController.listSalaries);
router.get('/:id/tds', staffPayrollController.getTds);
router.get('/:id/tds/export', staffPayrollController.exportTds);

module.exports = router;
