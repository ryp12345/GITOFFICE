const { Router } = require('express');
const noticeController = require('../controllers/common/notice.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { canCreateNotice } = require('../policies/notice.policy');
const { validateNoticePayload } = require('../validations/notice.validation');

const router = Router();

// Role access comes from policies/notice.policy.js rather than role lists here, so the routes stay
// the same when another role is allowed to raise notices. Ownership is checked in the service.
function requireNoticeAccess(req, _res, next) {
  if (!canCreateNotice(req.user)) {
    const err = new Error('Forbidden');
    err.statusCode = 403;
    return next(err);
  }
  return next();
}

// Any signed-in user may ask what they can do; the client uses it to show or hide the module.
router.get('/meta', authMiddleware, noticeController.getMeta);
// Dashboard notice board for any signed-in user, filtered to the notices addressed to them.
router.get('/feed', authMiddleware, noticeController.feed);

router.get('/', authMiddleware, requireNoticeAccess, noticeController.list);
router.get('/:id', authMiddleware, requireNoticeAccess, noticeController.getOne);
router.post('/', authMiddleware, requireNoticeAccess, validateNoticePayload, noticeController.create);
router.put('/:id', authMiddleware, requireNoticeAccess, validateNoticePayload, noticeController.update);
router.delete('/:id', authMiddleware, requireNoticeAccess, noticeController.remove);

module.exports = router;
