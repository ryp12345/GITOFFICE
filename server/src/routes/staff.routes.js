const express = require('express');
const router = express.Router();
const staffController = require('../controllers/establishment/staff.controller');
const staffAssociationRoutes = require('./staffAssociation.routes');
const staffDepartmentRoutes = require('./staffDepartment.routes');
const staffInstitutionRoutes = require('./staffInstitution.routes');
const staffForm16Routes = require('./staffForm16.routes');
const staffAnnualIncrementRoutes = require('./staffAnnualIncrement.routes');
const staffLaptopLoanRoutes = require('./staffLaptopLoan.routes');
const staffSocietyShareRoutes = require('./staffSocietyShare.routes');
const staffSocietyLoanRoutes = require('./staffSocietyLoan.routes');
const staffTaxRegimeRoutes = require('./staffTaxRegime.routes');
const staffLicRoutes = require('./staffLic.routes');
const staffDesignationPayscaleRoutes = require('./staffDesignationPayscale.routes');

router.get('/checkemailid', staffController.checkEmail);
router.get('/employee/designations', staffController.getDesignationsByEmployeeType);
router.get('/getcastecategory_list', staffController.getCasteCategoriesByReligion);
router.get('/getstaffpay_list', staffController.getStaffPayList);
router.get('/filter', staffController.filter); // <-- NEW: staff filter endpoint
router.get('/statistics', staffController.getStatistics);
router.get('/', staffController.list);
router.post('/', staffController.create);
router.use('/', staffAssociationRoutes);
router.use('/', staffDepartmentRoutes);
router.use('/', staffInstitutionRoutes);
router.use('/', staffForm16Routes);
router.use('/', staffAnnualIncrementRoutes);
router.use('/', staffLaptopLoanRoutes);
router.use('/', staffSocietyShareRoutes);
router.use('/', staffSocietyLoanRoutes);
router.use('/', staffTaxRegimeRoutes);
router.use('/', staffLicRoutes);
router.use('/', staffDesignationPayscaleRoutes);
router.put('/:id', staffController.update);
router.delete('/:id', staffController.remove);
router.get('/:id', staffController.getById);

module.exports = router;
