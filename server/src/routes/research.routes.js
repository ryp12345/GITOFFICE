const router = require('express').Router();

const researchController = require('../controllers/common/research.controller');
const researchModel = require('../models/research.model');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { roleMiddleware } = require('../middlewares/role.middleware');
const { researchPdfUploader } = require('../middlewares/upload.middleware');

// Laravel only exposed the Research module to teaching staff, which matches the Teaching-only
// submenu that StaffSidebar already renders.
const staffOnly = [authMiddleware, roleMiddleware('Teaching', 'teaching')];

const RESOURCES = Object.keys(researchModel.RESOURCES);

function validateResource(req, _res, next) {
  if (!RESOURCES.includes(req.params.resource)) {
    const error = new Error('Unknown research resource');
    error.statusCode = 404;
    next(error);
    return;
  }
  next();
}

// Every menu shares the same four endpoints; :resource selects the table and its validator.
router.get('/:resource', ...staffOnly, validateResource, researchController.list);

router.post('/:resource', ...staffOnly, validateResource, (req, res, next) => {
  researchPdfUploader(req.params.resource)(req, res, (error) => {
    if (error) {
      next(error);
      return;
    }
    researchController.create(req, res, next);
  });
});

router.patch('/:resource/:id', ...staffOnly, validateResource, (req, res, next) => {
  researchPdfUploader(req.params.resource)(req, res, (error) => {
    if (error) {
      next(error);
      return;
    }
    researchController.update(req, res, next);
  });
});

router.delete('/:resource/:id', ...staffOnly, validateResource, researchController.remove);

module.exports = router;