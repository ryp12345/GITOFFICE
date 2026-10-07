const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');

const uploadsRoot = path.resolve(__dirname, '..', '..', 'uploads');
const form16Root = path.join(uploadsRoot, 'form16');
const professionalActivityRoot = path.join(uploadsRoot, 'professional_activity');
const professionalActivityAttendedRoot = path.join(professionalActivityRoot, 'attended');
const professionalActivityConductedRoot = path.join(professionalActivityRoot, 'conducted');

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

ensureDir(form16Root);
ensureDir(professionalActivityAttendedRoot);
ensureDir(professionalActivityConductedRoot);

// Laravel guarded professional activity uploads at 500000 bytes and rendered
// "File size is more than 500KB. Please consider re-uploading."
const PROFESSIONAL_ACTIVITY_MAX_FILE_SIZE = 500 * 1024;

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const staffId = String(req.params.id || '').trim();
    const year = String(req.body.year || '').trim();

    const staffDir = path.join(form16Root, staffId || 'unknown');
    const yearDir = path.join(staffDir, year || 'unknown');

    ensureDir(yearDir);
    cb(null, yearDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase() || '.pdf';
    const safeName = path
      .basename(file.originalname || 'form16.pdf', ext)
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 60);
    const uniqueName = `${Date.now()}_${safeName || 'form16'}${ext}`;
    cb(null, uniqueName);
  }
});

function pdfOnlyFilter(_req, file, cb) {
  const isPdfMime = file.mimetype === 'application/pdf';
  const isPdfName = /\.pdf$/i.test(file.originalname || '');

  if (isPdfMime || isPdfName) {
    cb(null, true);
    return;
  }

  cb(new Error('Only PDF files are allowed'));
}

const uploadForm16Pdf = multer({
  storage,
  fileFilter: pdfOnlyFilter,
  limits: {
    fileSize: 20 * 1024 * 1024
  }
});

function archiveOnlyFilter(_req, file, cb) {
  const isZipMime = file.mimetype === 'application/zip' || file.mimetype === 'application/x-zip-compressed';
  const isRarMime = file.mimetype === 'application/vnd.rar' || file.mimetype === 'application/x-rar-compressed';
  const isZipName = /\.zip$/i.test(file.originalname || '');
  const isRarName = /\.rar$/i.test(file.originalname || '');

  if (isZipMime || isRarMime || isZipName || isRarName) {
    cb(null, true);
    return;
  }

  cb(new Error('Only ZIP or RAR files are allowed'));
}

const uploadForm16Archive = multer({
  storage: multer.memoryStorage(),
  fileFilter: archiveOnlyFilter,
  limits: {
    fileSize: 150 * 1024 * 1024
  }
});

function buildPdfDiskStorage(dirPath) {
  return multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, dirPath),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname || '').toLowerCase() || '.pdf';
      cb(null, `${crypto.randomBytes(16).toString('hex').slice(0, 25)}${ext}`);
    }
  });
}

// Mirrors the Laravel Professional_Activity_Attended / Professional_Activity_Conducted folders.
const uploadProfessionalActivityAttendedPdf = multer({
  storage: buildPdfDiskStorage(professionalActivityAttendedRoot),
  fileFilter: pdfOnlyFilter,
  limits: { fileSize: PROFESSIONAL_ACTIVITY_MAX_FILE_SIZE }
});

const uploadProfessionalActivityConductedPdf = multer({
  storage: buildPdfDiskStorage(professionalActivityConductedRoot),
  fileFilter: pdfOnlyFilter,
  limits: { fileSize: PROFESSIONAL_ACTIVITY_MAX_FILE_SIZE }
});

// One folder per research menu, mirroring the Laravel public/Uploads/Research/* directories
// so a document stored by either application resolves under the same name.
const RESEARCH_FOLDER_NAMES = {
  'conference-attended': 'Conference_Attended',
  'conference-conducted': 'Conference_Conducted',
  publication: 'Publications',
  'book-chapter': 'Book_Chapters',
  'funded-project': 'fundedproject',
  consultancy: 'Consultancy',
  patent: 'patents',
  copyright: 'Copyrights',
  'reviewer-editor': 'Review_Editor',
  achievement: 'Achievement'
};

const RESEARCH_MAX_FILE_SIZE = 500 * 1024;
// ConsultancyController was the single research menu that allowed a larger upload.
const RESEARCH_CONSULTANCY_MAX_FILE_SIZE = 20000 * 1024;

const RESEARCH_DOCUMENT_ROOTS = {};

const RESEARCH_UPLOADERS = {};

Object.keys(RESEARCH_FOLDER_NAMES).forEach((resourceKey) => {
  const root = path.join(uploadsRoot, 'research', RESEARCH_FOLDER_NAMES[resourceKey]);
  ensureDir(root);
  RESEARCH_DOCUMENT_ROOTS[resourceKey] = root;
  RESEARCH_UPLOADERS[resourceKey] = multer({
    storage: buildPdfDiskStorage(root),
    fileFilter: pdfOnlyFilter,
    limits: {
      fileSize:
        resourceKey === 'consultancy' ? RESEARCH_CONSULTANCY_MAX_FILE_SIZE : RESEARCH_MAX_FILE_SIZE
    }
  });
});

// multer is not a plain function, so the router needs the bound single-file middleware.
function researchPdfUploader(resourceKey) {
  const uploader = RESEARCH_UPLOADERS[resourceKey];
  if (!uploader) {
    const error = new Error('Unknown research resource');
    error.statusCode = 404;
    throw error;
  }
  return uploader.single('document');
}

const FASTRACK_MAX_FILE_SIZE = 500 * 1024;
const FASTRACK_UPLOAD_DIR = path.join(uploadsRoot, 'staff', 'fastrack_staff');
ensureDir(FASTRACK_UPLOAD_DIR);

const fastrackUploader = multer({
  storage: buildPdfDiskStorage(FASTRACK_UPLOAD_DIR),
  fileFilter: pdfOnlyFilter,
  limits: { fileSize: FASTRACK_MAX_FILE_SIZE }
});

function fastrackPdfUploader() {
  return fastrackUploader.single('document');
}

module.exports = {
  uploadForm16Pdf,
  uploadForm16Archive,
  form16Root,
  uploadProfessionalActivityAttendedPdf,
  uploadProfessionalActivityConductedPdf,
  professionalActivityAttendedRoot,
  professionalActivityConductedRoot,
  PROFESSIONAL_ACTIVITY_MAX_FILE_SIZE,
  RESEARCH_DOCUMENT_ROOTS,
  RESEARCH_FOLDER_NAMES,
  RESEARCH_MAX_FILE_SIZE,
  RESEARCH_CONSULTANCY_MAX_FILE_SIZE,
  researchPdfUploader,
  fastrackPdfUploader,
  ensureDir
};
