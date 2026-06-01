const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const { Router } = require('express');
const ticketController = require('../controllers/common/ticket.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');

const router = Router();

const uploadRoot = path.resolve(__dirname, '..', '..', 'uploads');
const ticketAttachmentDir = path.join(uploadRoot, 'attachment');
const replyAttachmentDir = path.join(uploadRoot, 'attachment', 'post_attachment');

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

ensureDir(ticketAttachmentDir);
ensureDir(replyAttachmentDir);

function buildStorage(destinationDir) {
  return multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, destinationDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname || '').toLowerCase();
      const safeExt = ext || '.bin';
      const randomName = `${crypto.randomBytes(16).toString('hex').slice(0, 25)}${safeExt}`;
      cb(null, randomName);
    },
  });
}

const uploadTicketAttachments = multer({ storage: buildStorage(ticketAttachmentDir) });
const uploadReplyAttachments = multer({ storage: buildStorage(replyAttachmentDir) });

router.get('/dashboard', authMiddleware, ticketController.dashboard);
router.get('/:id', authMiddleware, ticketController.getOne);
router.post('/', authMiddleware, uploadTicketAttachments.array('attachment[]', 10), ticketController.create);
router.put('/:id', authMiddleware, uploadTicketAttachments.array('attachment[]', 10), ticketController.update);
router.delete('/:id', authMiddleware, ticketController.remove);
router.post('/:id/replies', authMiddleware, uploadReplyAttachments.array('post_attachment[]', 10), ticketController.addReply);
router.patch('/:id/status', authMiddleware, ticketController.updateStatus);

module.exports = router;
