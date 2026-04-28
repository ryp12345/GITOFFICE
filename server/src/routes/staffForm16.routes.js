const express = require('express');
const router = express.Router();
const staffForm16Controller = require('../controllers/establishment/staffForm16.controller');
const { uploadForm16Pdf, uploadForm16Archive } = require('../middlewares/upload.middleware');
const { authMiddleware } = require('../middlewares/auth.middleware');

router.post(
	'/form-16/bulk-upload',
	authMiddleware,
	uploadForm16Archive.fields([
		{ name: 'zipFile', maxCount: 1 },
		{ name: 'archiveFile', maxCount: 1 },
		{ name: 'file', maxCount: 1 }
	]),
	staffForm16Controller.bulkUpload
);
router.get('/:id/form-16', staffForm16Controller.list);
router.post('/:id/form-16', uploadForm16Pdf.single('file'), staffForm16Controller.upload);
router.delete('/:id/form-16/:fileId', staffForm16Controller.remove);

module.exports = router;
