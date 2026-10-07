const { Router } = require('express');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { roleMiddleware } = require('../middlewares/role.middleware');
const egovController = require('../controllers/egov/egov.controller');

const router = Router();

// UserRoles::EGOV_ADMIN in Laravel.
const egovOnly = [authMiddleware, roleMiddleware('egov_admin')];

router.get('/dashboard', ...egovOnly, egovController.getDashboard);
router.get('/reports/:report', ...egovOnly, egovController.getReport);
router.patch('/reports/:report/:id/validation', ...egovOnly, egovController.validateRecord);

module.exports = router;
