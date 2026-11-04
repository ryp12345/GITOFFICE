const fs = require('fs');
const path = require('path');
const multer = require('multer');
const {
  createFileFilter,
  secureUploader,
  randomFileName,
  storedExtension
} = require('../utils/fileSecurity');

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

// Only PDFs: extension + MIME are checked while streaming, then the bytes are verified
// (magic number + no embedded JavaScript/launch actions) by secureUploader.
const pdfOnlyFilter = createFileFilter('pdf');

// Form 16 is kept in memory; the controller validates staff id and year before choosing the
// folder, so request input can never steer where the file is written.
const uploadForm16Pdf = secureUploader(
  multer({
    storage: multer.memoryStorage(),
    fileFilter: pdfOnlyFilter,
    limits: { fileSize: 20 * 1024 * 1024, files: 1 }
  }),
  'pdf'
);

const uploadForm16Archive = secureUploader(
  multer({
    storage: multer.memoryStorage(),
    fileFilter: createFileFilter('archive'),
    limits: { fileSize: 150 * 1024 * 1024, files: 1 }
  }),
  'archive'
);

function buildPdfDiskStorage(dirPath) {
  return multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, dirPath),
    filename: (_req, file, cb) => {
      // Random name + allowlisted extension; the client's file name is never used on disk.
      cb(null, randomFileName(storedExtension('pdf', file.originalname)));
    }
  });
}

// Mirrors the Laravel Professional_Activity_Attended / Professional_Activity_Conducted folders.
const uploadProfessionalActivityAttendedPdf = secureUploader(
  multer({
    storage: buildPdfDiskStorage(professionalActivityAttendedRoot),
    fileFilter: pdfOnlyFilter,
    limits: { fileSize: PROFESSIONAL_ACTIVITY_MAX_FILE_SIZE, files: 1 }
  }),
  'pdf'
);

const uploadProfessionalActivityConductedPdf = secureUploader(
  multer({
    storage: buildPdfDiskStorage(professionalActivityConductedRoot),
    fileFilter: pdfOnlyFilter,
    limits: { fileSize: PROFESSIONAL_ACTIVITY_MAX_FILE_SIZE, files: 1 }
  }),
  'pdf'
);

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
  RESEARCH_UPLOADERS[resourceKey] = secureUploader(
    multer({
      storage: buildPdfDiskStorage(root),
      fileFilter: pdfOnlyFilter,
      limits: {
        files: 1,
        fileSize:
          resourceKey === 'consultancy' ? RESEARCH_CONSULTANCY_MAX_FILE_SIZE : RESEARCH_MAX_FILE_SIZE
      }
    }),
    'pdf'
  );
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

// Memory storage: the controller saves the verified bytes as "<staff>_<course>.pdf".
// (With disk storage req.file.buffer was undefined, so saving the document failed.)
const fastrackUploader = secureUploader(
  multer({
    storage: multer.memoryStorage(),
    fileFilter: pdfOnlyFilter,
    limits: { fileSize: FASTRACK_MAX_FILE_SIZE, files: 1 }
  }),
  'pdf'
);

function fastrackPdfUploader() {
  return fastrackUploader.single('document');
}

// Ticket / reply screenshots: images only (no SVG - it can carry script), 500 KB each.
const TICKET_MAX_FILE_SIZE = 500 * 1024;
const TICKET_MAX_FILES = 10;
const ticketAttachmentDir = path.join(uploadsRoot, 'attachment');
const replyAttachmentDir = path.join(uploadsRoot, 'attachment', 'post_attachment');
ensureDir(ticketAttachmentDir);
ensureDir(replyAttachmentDir);

function buildImageUploader(dirPath) {
  return secureUploader(
    multer({
      storage: multer.diskStorage({
        destination: (_req, _file, cb) => cb(null, dirPath),
        filename: (_req, file, cb) => cb(null, randomFileName(storedExtension('image', file.originalname)))
      }),
      fileFilter: createFileFilter('image'),
      limits: { fileSize: TICKET_MAX_FILE_SIZE, files: TICKET_MAX_FILES }
    }),
    'image'
  );
}

const uploadTicketAttachments = buildImageUploader(ticketAttachmentDir);
const uploadReplyAttachments = buildImageUploader(replyAttachmentDir);

// Exam section course sheet: parsed in memory, never stored.
const uploadExcelSheet = secureUploader(
  multer({
    storage: multer.memoryStorage(),
    fileFilter: createFileFilter('excel'),
    limits: { fileSize: 10 * 1024 * 1024, files: 1 }
  }),
  'excel'
);

module.exports = {
  uploadsRoot,
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
  uploadTicketAttachments,
  uploadReplyAttachments,
  TICKET_MAX_FILE_SIZE,
  uploadExcelSheet,
  ensureDir
};
