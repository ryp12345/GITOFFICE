const express = require('express');
const router = express.Router();
const staffSocietyShareController = require('../controllers/establishment/staffSocietyShare.controller');

router.get('/:id/society-shares', staffSocietyShareController.listSocietyShares);
router.post('/:id/society-shares', staffSocietyShareController.createSocietyShare);
router.patch('/:id/society-shares/:shareId', staffSocietyShareController.updateSocietyShare);
router.delete('/:id/society-shares/:shareId', staffSocietyShareController.deleteSocietyShare);

module.exports = router;
