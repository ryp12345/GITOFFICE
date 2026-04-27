const express = require('express');
const router = express.Router();
const staffLaptopLoanController = require('../controllers/establishment/staffLaptopLoan.controller');

router.get('/:id/laptop-loans', staffLaptopLoanController.listLaptopLoans);
router.post('/:id/laptop-loans', staffLaptopLoanController.createLaptopLoan);
router.patch('/:id/laptop-loans/:loanId', staffLaptopLoanController.updateLaptopLoan);
router.delete('/:id/laptop-loans/:loanId', staffLaptopLoanController.deleteLaptopLoan);

module.exports = router;
