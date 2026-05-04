const { Router } = require('express');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { roleMiddleware } = require('../middlewares/role.middleware');
const hodDepartmentOverviewController = require('../controllers/hod/departmentOverview.controller');
const hodMyStaffController = require('../controllers/hod/myStaff.controller');

const router = Router();

router.get(
  '/department-overview',
  authMiddleware,
  roleMiddleware('Head of Department', 'hod'),
  hodDepartmentOverviewController.getDepartmentOverview
);

router.get(
  '/my-staff',
  authMiddleware,
  roleMiddleware('Head of Department', 'hod'),
  hodMyStaffController.getMyStaff
);

module.exports = router;
