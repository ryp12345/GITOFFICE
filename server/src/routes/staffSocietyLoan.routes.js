const express = require('express');
const router = express.Router();
const staffSocietyLoanController = require('../controllers/establishment/staffSocietyLoan.controller');

router.get('/:id/society-loans', staffSocietyLoanController.listSocietyLoans);
router.post('/:id/society-loans', staffSocietyLoanController.createSocietyLoan);
router.patch('/:id/society-loans/:loanId', staffSocietyLoanController.updateSocietyLoan);
router.delete('/:id/society-loans/:loanId', staffSocietyLoanController.deleteSocietyLoan);

module.exports = router;
