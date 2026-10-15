const fs = require('fs');
const path = require('path');
const { pool } = require('../config/db');
const { legacyProfilePhotoDir } = require('../config');

// Port of the Laravel Teaching/NonTeaching "update profile" photo upload:
// - staff.profile_photo stores just the file name, "<staff id>.<ext>";
// - files live in one flat folder (Laravel: public/Uploads/Staff/Profile_photos);
// - JPG only, at most 500000 bytes; a new upload replaces the old file.

const PHOTO_URL_PREFIX = '/uploads/staff/profile_photos';
const PHOTO_DIR = path.resolve(__dirname, '..', '..', 'uploads', 'staff', 'profile_photos');
const MAX_PHOTO_BYTES = 500000;

fs.mkdirSync(PHOTO_DIR, { recursive: true });

// Laravel's folder, used read-only so photos uploaded there before the switch still resolve.
// Defaults to the Laravel app this project sits in, when present.
const LEGACY_PHOTO_DIR = (() => {
  const candidate = legacyProfilePhotoDir
    || path.resolve(__dirname, '..', '..', '..', '..', 'public', 'Uploads', 'Staff', 'Profile_photos');
  return fs.existsSync(candidate) ? candidate : null;
})();

function badRequest(message, statusCode = 400) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

// Only a bare "<name>.<ext>" from the DB is ever joined to a folder.
function safeFileName(fileName) {
  const name = String(fileName || '').trim();
  return name && path.basename(name) === name ? name : null;
}

// Public URL for a stored photo, or null when the file is missing (Laravel then showed a
// default image). ?v=<mtime> makes browsers fetch a replaced photo that kept its name.
function photoUrl(fileName) {
  const name = safeFileName(fileName);
  if (!name) return null;
  for (const dir of [PHOTO_DIR, LEGACY_PHOTO_DIR]) {
    if (!dir) continue;
    const filePath = path.join(dir, name);
    if (fs.existsSync(filePath)) {
      const version = Math.round(fs.statSync(filePath).mtimeMs);
      return `${PHOTO_URL_PREFIX}/${encodeURIComponent(name)}?v=${version}`;
    }
  }
  return null;
}

function isJpeg(buffer) {
  return Buffer.isBuffer(buffer) && buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
}

async function findStaffForUser(user) {
  if (user?.staff_id) {
    const { rows } = await pool.query('SELECT id, profile_photo FROM staff WHERE id = $1', [user.staff_id]);
    if (rows[0]) return rows[0];
  }
  if (!user?.id) return null;
  const { rows } = await pool.query('SELECT id, profile_photo FROM staff WHERE user_id = $1 LIMIT 1', [user.id]);
  return rows[0] || null;
}

async function getPhotoForUser(user) {
  const staff = await findStaffForUser(user);
  if (!staff) return { has_staff_record: false, profile_photo: null, profile_photo_url: null };
  return {
    has_staff_record: true,
    staff_id: Number(staff.id),
    profile_photo: staff.profile_photo || null,
    profile_photo_url: photoUrl(staff.profile_photo),
  };
}

async function savePhotoForUser(user, file) {
  if (!file || !file.buffer) throw badRequest('Choose a JPG photo to upload');
  if (file.size > MAX_PHOTO_BYTES) throw badRequest('Only JPG files up to 500 KB in size are accepted.');
  if (!isJpeg(file.buffer)) throw badRequest('Only JPG files up to 500 KB in size are accepted.');

  const staff = await findStaffForUser(user);
  if (!staff) throw badRequest('No staff record is linked to this login', 404);

  const staffId = Number(staff.id);
  const fileName = `${staffId}.jpg`;
  const target = path.join(PHOTO_DIR, fileName);
  const temp = `${target}.${process.pid}.tmp`;

  // Write then rename so a viewer never gets a half-written file.
  fs.writeFileSync(temp, file.buffer);
  fs.renameSync(temp, target);

  // Laravel kept the original extension (e.g. 60.JPG, 56.png); drop older copies under other names.
  for (const entry of fs.readdirSync(PHOTO_DIR)) {
    if (entry !== fileName && path.parse(entry).name === String(staffId)) {
      fs.rmSync(path.join(PHOTO_DIR, entry), { force: true });
    }
  }

  await pool.query('UPDATE staff SET profile_photo = $1, updated_at = NOW() WHERE id = $2', [fileName, staffId]);
  return getPhotoForUser({ staff_id: staffId });
}

module.exports = {
  MAX_PHOTO_BYTES,
  PHOTO_DIR,
  PHOTO_URL_PREFIX,
  LEGACY_PHOTO_DIR,
  photoUrl,
  getPhotoForUser,
  savePhotoForUser,
};
