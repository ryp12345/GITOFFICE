const { Router } = require('express');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { roleMiddleware } = require('../middlewares/role.middleware');
const deanrndController = require('../controllers/deanrnd/deanrnd.controller');

const router = Router();

// UserRoles::DEANRND in Laravel. Everything here is read-only.
const deanRndOnly = [authMiddleware, roleMiddleware('Deanrnd')];

router.get('/dashboard', ...deanRndOnly, deanrndController.getDashboard);
router.get('/reports/:report', ...deanRndOnly, deanrndController.getReport);

module.exports = router;
