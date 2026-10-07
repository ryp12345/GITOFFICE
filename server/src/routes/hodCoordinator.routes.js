const { Router } = require('express');
const coordinatorHodController = require('../controllers/hod/coordinatorHod.controller');

const router = Router();

router.get('/coordinators', ...coordinatorHodController.hodAuth, coordinatorHodController.listCoordinators);
router.get('/coordinators/:id', ...coordinatorHodController.hodAuth, coordinatorHodController.getCoordinatorView);
router.post('/coordinators/staff', ...coordinatorHodController.hodAuth, coordinatorHodController.addCoordinatorStaff);
router.put('/coordinators/staff/:id', ...coordinatorHodController.hodAuth, coordinatorHodController.updateCoordinatorStaff);

module.exports = router;