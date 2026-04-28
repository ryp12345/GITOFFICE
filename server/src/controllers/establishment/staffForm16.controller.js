const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');
const { pool } = require('../../config/db');
const { form16Root, ensureDir } = require('../../middlewares/upload.middleware');
const { sendForm16UploadIssueReport } = require('../../services/email.service');

function toYear(value) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 2000 || parsed > 2100) return null;
  return parsed;
}

function getStaffRoot(staffId) {
  return path.join(form16Root, String(staffId));
}

function encodeId(staffId, year, fileName) {
  return Buffer.from(`${staffId}|${year}|${fileName}`)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function decodeId(encoded) {
  const normalized = String(encoded).replace(/-/g, '+').replace(/_/g, '/');
  const padLen = (4 - (normalized.length % 4)) % 4;
  const padded = `${normalized}${'='.repeat(padLen)}`;
  const decoded = Buffer.from(padded, 'base64').toString('utf8');
  const [staffId, year, fileName] = decoded.split('|');
  return { staffId, year, fileName };
}

function normalizePan(value) {
  return String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function sanitizeFileName(name) {
  const ext = path.extname(name || '').toLowerCase() || '.pdf';
  const base = path
    .basename(name || 'form16.pdf', ext)
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 80);
  return `${Date.now()}_${base || 'form16'}${ext}`;
}

function detectPart(entryName) {
  const normalized = String(entryName || '').replace(/\\/g, '/').toLowerCase();

  // Support paths like:
  // part a/file.pdf, part-a/file.pdf, part_a/file.pdf,
  // root/part a/file.pdf, ROOT/PART-B/file.pdf, etc.
  const segments = normalized.split('/').filter(Boolean);
  // Match segments that contain "part a" or "part b" anywhere (e.g. "form 16 part a")
  const hasPartA = segments.some((segment) => /part[ _-]*a/i.test(segment));
  const hasPartB = segments.some((segment) => /part[ _-]*b/i.test(segment));

  if (hasPartA) return 'part_a';
  if (hasPartB) return 'part_b';

  return null;
}

function toArchiveEntriesFromZip(buffer) {
  const zip = new AdmZip(buffer);
  return zip
    .getEntries()
    .filter((entry) => !entry.isDirectory)
    .map((entry) => ({
      entryName: entry.entryName,
      data: entry.getData()
    }));
}

function toArchiveEntriesFromRar(buffer) {
  let createExtractorFromData;
  try {
    ({ createExtractorFromData } = require('node-unrar-js'));
  } catch (_err) {
    const depErr = new Error('RAR support is not available on server. Install node-unrar-js to upload RAR files.');
    depErr.statusCode = 500;
    throw depErr;
  }

  const extractor = createExtractorFromData({ data: Uint8Array.from(buffer) });

  // node-unrar-js versions return different shapes; normalize them.
  const pickFileEntries = (result) => {
    if (!result) return [];
    if (Array.isArray(result)) {
      for (const item of result) {
        if (Array.isArray(item)) return item;
        if (item && Array.isArray(item.files)) return item.files;
        if (item && Array.isArray(item.fileHeaders)) return item.fileHeaders;
      }
      return [];
    }
    if (Array.isArray(result.files)) return result.files;
    if (Array.isArray(result.fileHeaders)) return result.fileHeaders;
    if (result.arcFiles && Array.isArray(result.arcFiles.files)) return result.arcFiles.files;
    return [];
  };

  const listResult = extractor.getFileList?.();
  const listEntries = pickFileEntries(listResult);
  const filesToExtract = listEntries
    .filter((h) => !(h?.flags?.directory || h?.directory))
    .map((h) => h.name || h.fileName)
    .filter(Boolean);

  const extractResult = filesToExtract.length
    ? extractor.extract({ files: filesToExtract })
    : extractor.extract();

  const extractedFiles = pickFileEntries(extractResult);

  return extractedFiles
    .filter((f) => f?.extraction && (f?.fileHeader?.name || f?.name || f?.fileName))
    .map((f) => ({
      entryName: f.fileHeader?.name || f.name || f.fileName || '',
      data: Buffer.from(f.extraction)
    }));
}

function getYearPartDir(staffId, year, part) {
  return path.join(getStaffRoot(staffId), String(year), part === 'part_b' ? 'part-b' : 'part-a');
}

function collectPdfFilesRecursive(rootDir, baseDir = rootDir) {
  if (!fs.existsSync(rootDir)) return [];
  const entries = fs.readdirSync(rootDir, { withFileTypes: true });
  const files = [];

  entries.forEach((entry) => {
    const absPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectPdfFilesRecursive(absPath, baseDir));
      return;
    }

    if (entry.isFile() && /\.pdf$/i.test(entry.name)) {
      const relPath = path.relative(baseDir, absPath).replace(/\\/g, '/');
      files.push({ absPath, relPath, fileName: entry.name });
    }
  });

  return files;
}

function listFiles(staffId) {
  const staffRoot = getStaffRoot(staffId);
  if (!fs.existsSync(staffRoot)) return [];

  const years = fs
    .readdirSync(staffRoot, { withFileTypes: true })
    .filter((d) => d.isDirectory() && /^\d{4}$/.test(d.name))
    .map((d) => d.name);

  const rows = [];

  years.forEach((year) => {
    const yearDir = path.join(staffRoot, year);
    const files = collectPdfFilesRecursive(yearDir, yearDir);

    files.forEach((file) => {
      const stat = fs.statSync(file.absPath);
      const fileRelPath = file.relPath;
      const inferredPart = detectPart(fileRelPath) || 'part_a';
      const relativeUrl = `/uploads/form16/${staffId}/${year}/${fileRelPath}`;

      rows.push({
        id: encodeId(staffId, year, fileRelPath),
        year: Number(year),
        part: inferredPart,
        file_name: file.fileName,
        file_url: relativeUrl,
        uploaded_at: stat.mtime.toISOString()
      });
    });
  });

  return rows.sort((a, b) => {
    if (b.year !== a.year) return b.year - a.year;
    return new Date(b.uploaded_at) - new Date(a.uploaded_at);
  });
}

async function list(req, res, next) {
  try {
    const staffId = Number(req.params.id);
    if (!staffId) return res.status(400).json({ success: false, message: 'Invalid staff id' });

    const rows = listFiles(staffId);
    return res.json({ success: true, data: rows });
  } catch (err) {
    return next(err);
  }
}

async function upload(req, res, next) {
  try {
    const staffId = Number(req.params.id);
    if (!staffId) return res.status(400).json({ success: false, message: 'Invalid staff id' });

    const year = toYear(req.body.year);
    if (!year) return res.status(400).json({ success: false, message: 'Valid year is required' });

    if (!req.file) return res.status(400).json({ success: false, message: 'PDF file is required' });

    const staffRoot = getStaffRoot(staffId);
    const yearDir = path.join(staffRoot, String(year));
    ensureDir(yearDir);

    // Replace existing files for the same year, keep only current upload.
    const existing = fs
      .readdirSync(yearDir, { withFileTypes: true })
      .filter((d) => d.isFile() && /\.pdf$/i.test(d.name) && d.name !== req.file.filename);

    existing.forEach((file) => {
      const filePath = path.join(yearDir, file.name);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    });

    const uploadedRow = {
      id: encodeId(staffId, year, req.file.filename),
      year,
      file_name: req.file.filename,
      file_url: `/uploads/form16/${staffId}/${year}/${req.file.filename}`,
      uploaded_at: new Date().toISOString()
    };

    return res.status(201).json({
      success: true,
      message: existing.length ? 'Form 16 replaced for selected year.' : 'Form 16 uploaded successfully.',
      data: uploadedRow
    });
  } catch (err) {
    return next(err);
  }
}

async function remove(req, res, next) {
  try {
    const staffId = Number(req.params.id);
    if (!staffId) return res.status(400).json({ success: false, message: 'Invalid staff id' });

    const fileId = String(req.params.fileId || '').trim();
    if (!fileId) return res.status(400).json({ success: false, message: 'fileId is required' });

    const decoded = decodeId(fileId);
    if (String(staffId) !== String(decoded.staffId)) {
      return res.status(400).json({ success: false, message: 'Invalid file id for this staff' });
    }

    const filePath = path.join(getStaffRoot(staffId), String(decoded.year), String(decoded.fileName));
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'File not found' });
    }

    fs.unlinkSync(filePath);
    return res.json({ success: true, message: 'Form 16 deleted successfully.' });
  } catch (err) {
    return next(err);
  }
}

async function bulkUpload(req, res, next) {
  try {
    const year = toYear(req.body.year);
    if (!year) return res.status(400).json({ success: false, message: 'Valid year is required' });

    // Resolve the uploader's email from req.user (set by authMiddleware)
    let uploaderEmail = null;
    if (req.user?.id) {
      try {
        const { rows: userRows } = await pool.query(
          'SELECT email FROM users WHERE id = $1 LIMIT 1',
          [req.user.id]
        );
        uploaderEmail = userRows[0]?.email || null;
      } catch (_err) {
        // Non-fatal — proceed without email
      }
    }

    const archiveFile =
      req.file ||
      req.files?.zipFile?.[0] ||
      req.files?.archiveFile?.[0] ||
      req.files?.file?.[0] ||
      null;

    if (!archiveFile || !archiveFile.buffer) {
      return res.status(400).json({ success: false, message: 'ZIP or RAR file is required' });
    }

    const originalName = String(archiveFile.originalname || '').toLowerCase();
    const isRar = /\.rar$/i.test(originalName) || archiveFile.mimetype === 'application/vnd.rar' || archiveFile.mimetype === 'application/x-rar-compressed';

    const archiveEntries = isRar
      ? toArchiveEntriesFromRar(archiveFile.buffer)
      : toArchiveEntriesFromZip(archiveFile.buffer);

    const pdfEntries = archiveEntries.filter((entry) => /\.pdf$/i.test(entry.entryName || ''));

    if (!pdfEntries.length) {
      return res.status(400).json({ success: false, message: 'No PDF files found inside archive' });
    }

    const { rows: staffRows } = await pool.query(
      `SELECT id, pan_card FROM staff WHERE pan_card IS NOT NULL AND TRIM(pan_card) <> ''`
    );

    const staffByPan = new Map();
    staffRows.forEach((row) => {
      const pan = normalizePan(row.pan_card);
      if (pan && !staffByPan.has(pan)) {
        staffByPan.set(pan, row.id);
      }
    });

    let uploaded = 0;
    const unmatchedPans = [];
    const invalidFiles = [];
    const invalidPartPath = [];

    for (const entry of pdfEntries) {
      const part = detectPart(entry.entryName);
      if (!part) {
        invalidPartPath.push(entry.entryName || '');
        continue;
      }

      const originalPdfName = path.basename(entry.entryName || '');
      const baseNoExt = originalPdfName.replace(/\.pdf$/i, '');
      // PAN is 10 chars: 5 letters + 4 digits + 1 letter. Extract from start of filename.
      const panMatch = baseNoExt.match(/^([A-Za-z]{5}[0-9]{4}[A-Za-z]{1})/i);
      const panFromFileName = panMatch ? normalizePan(panMatch[1]) : '';

      if (!panFromFileName) {
        invalidFiles.push(originalPdfName);
        continue;
      }

      const staffId = staffByPan.get(panFromFileName);
      if (!staffId) {
        unmatchedPans.push(panFromFileName);
        continue;
      }

      const partDir = getYearPartDir(staffId, year, part);
      ensureDir(partDir);

      // Keep only one active PDF for each staff/year/part (replace behavior)
      const existing = fs
        .readdirSync(partDir, { withFileTypes: true })
        .filter((d) => d.isFile() && /\.pdf$/i.test(d.name));

      existing.forEach((file) => {
        const filePath = path.join(partDir, file.name);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      });

      const outputFileName = sanitizeFileName(originalPdfName);
      const outputPath = path.join(partDir, outputFileName);
      fs.writeFileSync(outputPath, entry.data);
      uploaded += 1;
    }

    if (uploaded === 0) {
      const issuePayload = {
        toEmail: uploaderEmail,
        year,
        archiveType: isRar ? 'rar' : 'zip',
        totalPdfInZip: pdfEntries.length,
        uploaded,
        unmatchedPans: Array.from(new Set(unmatchedPans)),
        invalidFiles,
        invalidPartPath
      };
      if (uploaderEmail) {
        sendForm16UploadIssueReport(issuePayload).catch(() => {});
      }
      return res.status(400).json({
        success: false,
        message: 'No files were uploaded. Check PAN filenames and Part A/Part B folder names.',
        data: {
          year,
          archiveType: isRar ? 'rar' : 'zip',
          totalPdfInZip: pdfEntries.length,
          uploaded,
          unmatchedPans: Array.from(new Set(unmatchedPans)),
          invalidFiles,
          invalidPartPath
        }
      });
    }

    const hasPartialIssues = unmatchedPans.length > 0 || invalidFiles.length > 0 || invalidPartPath.length > 0;
    if (hasPartialIssues && uploaderEmail) {
      sendForm16UploadIssueReport({
        toEmail: uploaderEmail,
        year,
        archiveType: isRar ? 'rar' : 'zip',
        totalPdfInZip: pdfEntries.length,
        uploaded,
        unmatchedPans: Array.from(new Set(unmatchedPans)),
        invalidFiles,
        invalidPartPath
      }).catch(() => {});
    }

    return res.status(201).json({
      success: true,
      message: 'Bulk Form 16 archive processed.',
      data: {
        year,
        archiveType: isRar ? 'rar' : 'zip',
        totalPdfInZip: pdfEntries.length,
        uploaded,
        unmatchedPans: Array.from(new Set(unmatchedPans)),
        invalidFiles,
        invalidPartPath
      }
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  list,
  upload,
  remove,
  bulkUpload
};
