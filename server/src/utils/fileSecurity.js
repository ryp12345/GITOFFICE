const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Upload allowlists. A file is accepted only when its extension, its declared MIME type and
// its actual bytes (magic number) all agree with one of these kinds. Anything else - HTML,
// SVG, scripts, executables, PHP, etc. - is rejected before it is kept on disk.
const FILE_KINDS = {
  pdf: {
    label: 'PDF',
    extensions: ['.pdf'],
    mimeTypes: ['application/pdf', 'application/x-pdf'],
    signatures: ['pdf'],
  },
  image: {
    label: 'JPG, PNG, GIF or WEBP image',
    extensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
    mimeTypes: ['image/jpeg', 'image/pjpeg', 'image/png', 'image/gif', 'image/webp'],
    signatures: ['jpeg', 'png', 'gif', 'webp'],
  },
  jpeg: {
    label: 'JPG image',
    extensions: ['.jpg', '.jpeg'],
    mimeTypes: ['image/jpeg', 'image/pjpeg'],
    signatures: ['jpeg'],
  },
  excel: {
    label: 'Excel (.xlsx or .xls)',
    extensions: ['.xlsx', '.xls'],
    mimeTypes: [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'application/octet-stream',
    ],
    signatures: ['zip', 'ole'],
  },
  archive: {
    label: 'ZIP or RAR',
    extensions: ['.zip', '.rar'],
    mimeTypes: [
      'application/zip',
      'application/x-zip-compressed',
      'application/x-zip',
      'application/vnd.rar',
      'application/x-rar-compressed',
      'application/x-rar',
      'application/x-compressed',
      'application/octet-stream',
    ],
    signatures: ['zip', 'rar'],
  },
};

// Detected type -> extension the file is stored under (never the client-supplied one).
const STORED_EXTENSION = {
  pdf: '.pdf',
  jpeg: '.jpg',
  png: '.png',
  gif: '.gif',
  webp: '.webp',
  zip: '.zip',
  rar: '.rar',
  ole: '.xls',
};

const HEAD_BYTES = 1024;

function startsWith(buf, bytes, offset = 0) {
  if (buf.length < offset + bytes.length) return false;
  for (let i = 0; i < bytes.length; i += 1) {
    if (buf[offset + i] !== bytes[i]) return false;
  }
  return true;
}

// Identifies a file from its first bytes. Returns null when the type is not on any allowlist.
function detectFileType(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 4) return null;
  // The PDF spec lets readers accept the header anywhere in the first 1024 bytes.
  if (buffer.subarray(0, HEAD_BYTES).indexOf('%PDF-', 0, 'latin1') !== -1) return 'pdf';
  if (startsWith(buffer, [0xff, 0xd8, 0xff])) return 'jpeg';
  if (startsWith(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'png';
  if (startsWith(buffer, Buffer.from('GIF87a')) || startsWith(buffer, Buffer.from('GIF89a'))) return 'gif';
  if (startsWith(buffer, Buffer.from('RIFF')) && startsWith(buffer, Buffer.from('WEBP'), 8)) return 'webp';
  if (startsWith(buffer, [0x50, 0x4b, 0x03, 0x04]) || startsWith(buffer, [0x50, 0x4b, 0x05, 0x06])) return 'zip';
  if (startsWith(buffer, Buffer.from('Rar!\x1a\x07', 'latin1'))) return 'rar';
  if (startsWith(buffer, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])) return 'ole';
  return null;
}

// PDF actions that make a reader run code or open other programs. Legitimate certificates,
// Form 16s and papers do not need them.
const PDF_ACTIVE_CONTENT = [/\/JavaScript\b/, /\/Launch\b/, /\/RichMedia\b/];

function hasActivePdfContent(buffer) {
  const text = buffer.toString('latin1');
  return PDF_ACTIVE_CONTENT.some((pattern) => pattern.test(text));
}

function uploadError(message, statusCode = 400) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

function rejectMessage(kind) {
  return `Only ${FILE_KINDS[kind].label} files are allowed`;
}

// Cheap pre-check while multer is still streaming: extension AND declared MIME must match.
function createFileFilter(kind) {
  const spec = FILE_KINDS[kind];
  if (!spec) throw new Error(`Unknown upload kind: ${kind}`);
  return (_req, file, cb) => {
    const ext = path.extname(String(file.originalname || '')).toLowerCase();
    const mime = String(file.mimetype || '').toLowerCase();
    if (spec.extensions.includes(ext) && spec.mimeTypes.includes(mime)) {
      cb(null, true);
      return;
    }
    cb(uploadError(rejectMessage(kind)));
  };
}

function randomFileName(ext) {
  return `${crypto.randomBytes(16).toString('hex').slice(0, 25)}${ext}`;
}

// Extension used when saving: the one the bytes prove, restricted to the kind's allowlist.
function storedExtension(kind, originalName) {
  const ext = path.extname(String(originalName || '')).toLowerCase();
  const spec = FILE_KINDS[kind];
  if (spec && spec.extensions.includes(ext)) return ext === '.jpeg' ? '.jpg' : ext;
  return spec ? spec.extensions[0] : '.bin';
}

function readFileBytes(file) {
  if (file.buffer) return file.buffer;
  if (file.path) return fs.readFileSync(file.path);
  return null;
}

// Throws when the content does not match the allowed kind.
function assertFileContent(kind, file) {
  const spec = FILE_KINDS[kind];
  const bytes = readFileBytes(file);
  const detected = detectFileType(bytes);
  if (!detected || !spec.signatures.includes(detected)) {
    throw uploadError(`${rejectMessage(kind)}. The file content does not match its type.`);
  }
  // The extension must agree with the bytes too (e.g. a PNG renamed to .jpg is refused).
  const ext = path.extname(String(file.originalname || file.filename || '')).toLowerCase();
  const expectedExt = STORED_EXTENSION[detected];
  const sameFamily = ext === expectedExt
    || (detected === 'jpeg' && ext === '.jpeg')
    || (detected === 'zip' && ext === '.xlsx');
  if (ext && !sameFamily) {
    throw uploadError(`${rejectMessage(kind)}. The file extension does not match its content.`);
  }
  if (detected === 'pdf' && hasActivePdfContent(bytes)) {
    throw uploadError('PDF files containing scripts or embedded actions are not allowed');
  }
  return detected;
}

function collectFiles(req) {
  if (req.file) return [req.file];
  if (Array.isArray(req.files)) return req.files;
  if (req.files && typeof req.files === 'object') return Object.values(req.files).flat();
  return [];
}

function removeDiskFiles(files) {
  files.forEach((file) => {
    if (file && file.path) {
      try {
        fs.rmSync(file.path, { force: true });
      } catch (_err) {
        // Best effort clean-up.
      }
    }
  });
}

// Runs after multer: verifies every uploaded file's bytes and deletes them all if one fails.
function verifyUploadedFiles(kind) {
  return (req, _res, next) => {
    const files = collectFiles(req);
    try {
      files.forEach((file) => {
        file.detectedType = assertFileContent(kind, file);
      });
      next();
    } catch (err) {
      removeDiskFiles(files);
      next(err);
    }
  };
}

// Wraps a multer instance so .single/.array/.fields return ONE middleware that uploads and
// then validates content. Keeps call sites that invoke the middleware directly working.
function secureUploader(multerInstance, kind) {
  const verify = verifyUploadedFiles(kind);
  const wrap = (mw) => (req, res, next) => {
    mw(req, res, (err) => {
      if (err) {
        removeDiskFiles(collectFiles(req));
        next(err);
        return;
      }
      verify(req, res, next);
    });
  };
  return {
    single: (field) => wrap(multerInstance.single(field)),
    array: (field, max) => wrap(multerInstance.array(field, max)),
    fields: (spec) => wrap(multerInstance.fields(spec)),
  };
}

// True when `target` resolves to a location inside `root` (blocks ../ traversal).
function isInsideDir(root, target) {
  const rel = path.relative(path.resolve(root), path.resolve(target));
  return rel !== '' && !rel.startsWith('..') && !path.isAbsolute(rel);
}

// Extensions /uploads is allowed to serve. Everything else (html, svg, js, php, legacy
// files of unknown type) returns 404 so it can never run in a browser.
const SERVABLE_EXTENSIONS = new Set(['.pdf', '.jpg', '.jpeg', '.png', '.gif', '.webp']);

// Static-file hardening for user uploads.
function uploadsGuard(req, res, next) {
  let ext = '';
  try {
    ext = path.extname(decodeURIComponent(req.path)).toLowerCase();
  } catch (_err) {
    res.status(400).end();
    return;
  }
  if (!SERVABLE_EXTENSIONS.has(ext)) {
    res.status(404).end();
    return;
  }
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // Even if a file slipped through, it cannot run scripts or load anything.
  res.setHeader('Content-Security-Policy', "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; object-src 'self'; frame-ancestors 'self'");
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}

module.exports = {
  FILE_KINDS,
  SERVABLE_EXTENSIONS,
  detectFileType,
  hasActivePdfContent,
  createFileFilter,
  randomFileName,
  storedExtension,
  assertFileContent,
  verifyUploadedFiles,
  secureUploader,
  isInsideDir,
  uploadsGuard,
  uploadError,
};
