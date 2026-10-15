const express = require('express');
const multer = require('multer');
const { authMiddleware } = require('../middlewares/auth.middleware');
const profilePhotoService = require('../services/profilePhoto.service');

const router = express.Router();

const PHOTO_RULE = 'Only JPG files up to 500 KB in size are accepted.';

const photoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: profilePhotoService.MAX_PHOTO_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    const ok = file.mimetype === 'image/jpeg' || /\.jpe?g$/i.test(file.originalname || '');
    cb(ok ? null : Object.assign(new Error(PHOTO_RULE), { statusCode: 400 }), ok);
  },
}).single('profile_photo');

// Signed-in user's own photo (Laravel: Staff/Teaching/updateprofile, Staff/Non-Teaching/ntupdateprofile).
// Any role may upload, as long as the login is linked to a staff record.
router.use(authMiddleware);

router.get('/photo', async (req, res, next) => {
  try {
    const data = await profilePhotoService.getPhotoForUser(req.user);
    return res.json({ success: true, data });
  } catch (err) {
    return next(err);
  }
});

router.post('/photo', (req, res) => {
  photoUpload(req, res, async (uploadErr) => {
    try {
      if (uploadErr) {
        const message = uploadErr.code === 'LIMIT_FILE_SIZE' ? PHOTO_RULE : uploadErr.message;
        return res.status(400).json({ success: false, message });
      }
      const data = await profilePhotoService.savePhotoForUser(req.user, req.file);
      return res.json({ success: true, message: 'Profile photo updated successfully.', data });
    } catch (err) {
      return res.status(err.statusCode || 500).json({ success: false, message: err.message || 'Failed to update profile photo' });
    }
  });
});

module.exports = router;
