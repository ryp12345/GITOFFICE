const { Router } = require('express');
const ticketController = require('../controllers/common/ticket.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
// Images only, 500 KB each, random file names, content verified by magic bytes.
const { uploadTicketAttachments, uploadReplyAttachments } = require('../middlewares/upload.middleware');

const router = Router();

router.get('/dashboard', authMiddleware, ticketController.dashboard);
router.get('/:id', authMiddleware, ticketController.getOne);
router.post('/', authMiddleware, uploadTicketAttachments.array('attachment[]', 10), ticketController.create);
router.put('/:id', authMiddleware, uploadTicketAttachments.array('attachment[]', 10), ticketController.update);
router.delete('/:id', authMiddleware, ticketController.remove);
router.post('/:id/replies', authMiddleware, uploadReplyAttachments.array('post_attachment[]', 10), ticketController.addReply);
router.patch('/:id/status', authMiddleware, ticketController.updateStatus);

module.exports = router;
