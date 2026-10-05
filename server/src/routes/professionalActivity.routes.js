const router = require('express').Router();

const professionalActivityController = require('../controllers/common/professionalActivity.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { roleMiddleware } = require('../middlewares/role.middleware');
const {
  uploadProfessionalActivityAttendedPdf,
  uploadProfessionalActivityConductedPdf
} = require('../middlewares/upload.middleware');

// Laravel kept two near-identical route groups (Teaching/* and Non-Teaching/*) whose
// only difference was the role middleware. The React client reuses one API surface and
// keeps the two public paths (/teaching/professional-activities and
// /nonteaching/professional-activities) at the routing layer instead.
const STAFF_ROLES = [
  'Teaching',
  'teaching',
  'Non-Teaching',
  'non-teaching',
  'nonteaching'
];

const staffOnly = [authMiddleware, roleMiddleware(...STAFF_ROLES)];

router.get('/', ...staffOnly, professionalActivityController.list);

router.post(
  '/attended',
  ...staffOnly,
  uploadProfessionalActivityAttendedPdf.single('document'),
  professionalActivityController.createAttended
);

router.patch(
  '/attended/:id',
  ...staffOnly,
  uploadProfessionalActivityAttendedPdf.single('document'),
  professionalActivityController.updateAttended
);

router.delete('/attended/:id', ...staffOnly, professionalActivityController.removeAttended);

router.post(
  '/conducted',
  ...staffOnly,
  uploadProfessionalActivityConductedPdf.single('document'),
  professionalActivityController.createConducted
);

router.patch(
  '/conducted/:id',
  ...staffOnly,
  uploadProfessionalActivityConductedPdf.single('document'),
  professionalActivityController.updateConducted
);

router.delete('/conducted/:id', ...staffOnly, professionalActivityController.removeConducted);

module.exports = router;