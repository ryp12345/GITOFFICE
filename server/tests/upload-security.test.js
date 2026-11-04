const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const express = require('express');
const request = require('supertest');
const AdmZip = require('adm-zip');

const app = require('../src/app');
const { signAccessToken } = require('../src/utils/jwt');
const { errorMiddleware } = require('../src/middlewares/error.middleware');
const {
  detectFileType,
  createFileFilter,
  assertFileContent,
  isInsideDir,
} = require('../src/utils/fileSecurity');
const {
  uploadForm16Pdf,
  uploadExcelSheet,
  uploadsRoot,
} = require('../src/middlewares/upload.middleware');
const { _internal: form16 } = require('../src/controllers/establishment/staffForm16.controller');

const PDF = Buffer.from('%PDF-1.4\n1 0 obj << /Type /Catalog >> endobj\ntrailer << >>\n%%EOF\n');
const PDF_WITH_JS = Buffer.from('%PDF-1.4\n1 0 obj << /OpenAction << /S /JavaScript /JS (app.alert(1)) >> >> endobj\n%%EOF');
const PDF_WITH_LAUNCH = Buffer.from('%PDF-1.4\n1 0 obj << /OpenAction << /S /Launch /F (cmd.exe) >> >> endobj\n%%EOF');
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d]);
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46]);
const HTML = Buffer.from('<html><script>alert(document.cookie)</script></html>');
const SVG = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"/>');
const EXE = Buffer.from('MZ\x90\x00\x03\x00\x00\x00', 'latin1');
const PHP = Buffer.from('<?php system($_GET["c"]); ?>');

const bearer = (payload) => `Bearer ${signAccessToken(payload)}`;
const teacher = bearer({ id: 2, role: 'teaching', staff_id: 42 });

function runFilter(kind, originalname, mimetype) {
  return new Promise((resolve) => {
    createFileFilter(kind)({}, { originalname, mimetype }, (err, ok) => resolve(err ? false : ok));
  });
}

function listDir(dir) {
  return fs.existsSync(dir) ? fs.readdirSync(dir).sort() : [];
}

// ---------- content detection ----------

test('detectFileType recognises allowlisted types and nothing else', () => {
  assert.equal(detectFileType(PDF), 'pdf');
  assert.equal(detectFileType(PNG), 'png');
  assert.equal(detectFileType(JPEG), 'jpeg');
  assert.equal(detectFileType(new AdmZip().toBuffer()), 'zip');
  for (const bad of [HTML, SVG, EXE, PHP, Buffer.from('')]) {
    assert.equal(detectFileType(bad), null);
  }
});

test('file filter requires BOTH an allowlisted extension and MIME type', async () => {
  assert.equal(await runFilter('pdf', 'cert.pdf', 'application/pdf'), true);
  assert.equal(await runFilter('pdf', 'CERT.PDF', 'application/pdf'), true);
  // Previously accepted because the filter used OR: stored XSS via a .html served from /uploads.
  assert.equal(await runFilter('pdf', 'evil.html', 'application/pdf'), false);
  assert.equal(await runFilter('pdf', 'evil.pdf', 'text/html'), false);
  assert.equal(await runFilter('pdf', 'evil.pdf.php', 'application/pdf'), false);
  assert.equal(await runFilter('image', 'shot.png', 'image/png'), true);
  assert.equal(await runFilter('image', 'shot.svg', 'image/svg+xml'), false);
  assert.equal(await runFilter('image', 'shell.php', 'image/png'), false);
  assert.equal(await runFilter('image', 'run.exe', 'application/octet-stream'), false);
  assert.equal(await runFilter('excel', 'courses.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'), true);
  assert.equal(await runFilter('archive', 'form16.zip', 'application/zip'), true);
  assert.equal(await runFilter('archive', 'form16.exe', 'application/zip'), false);
});

test('content check rejects disguised and active files', () => {
  assert.equal(assertFileContent('pdf', { originalname: 'a.pdf', buffer: PDF }), 'pdf');
  assert.equal(assertFileContent('image', { originalname: 'a.png', buffer: PNG }), 'png');
  assert.equal(assertFileContent('image', { originalname: 'a.jpeg', buffer: JPEG }), 'jpeg');

  assert.throws(() => assertFileContent('pdf', { originalname: 'a.pdf', buffer: HTML }), /content does not match/);
  assert.throws(() => assertFileContent('image', { originalname: 'a.png', buffer: SVG }), /content does not match/);
  assert.throws(() => assertFileContent('image', { originalname: 'a.jpg', buffer: PHP }), /content does not match/);
  assert.throws(() => assertFileContent('pdf', { originalname: 'a.pdf', buffer: EXE }), /content does not match/);
  assert.throws(() => assertFileContent('image', { originalname: 'a.jpg', buffer: PNG }), /extension does not match/);
  assert.throws(() => assertFileContent('pdf', { originalname: 'a.pdf', buffer: PDF_WITH_JS }), /scripts/);
  assert.throws(() => assertFileContent('pdf', { originalname: 'a.pdf', buffer: PDF_WITH_LAUNCH }), /scripts/);
  // Errors are client errors.
  try {
    assertFileContent('pdf', { originalname: 'a.pdf', buffer: HTML });
  } catch (err) {
    assert.equal(err.statusCode, 400);
  }
});

test('isInsideDir blocks path traversal', () => {
  const root = path.join(uploadsRoot, 'form16', '42');
  assert.equal(isInsideDir(root, path.join(root, '2024', 'a.pdf')), true);
  assert.equal(isInsideDir(root, path.join(root, '..', '43', '2024', 'a.pdf')), false);
  assert.equal(isInsideDir(root, path.join(root, '2024', '..', '..', '..', '..', 'src', 'app.js')), false);
  assert.equal(isInsideDir(root, root), false);
});

// ---------- HTTP: real routes ----------

test('ticket attachments: HTML, SVG and executables are rejected and nothing is kept', async () => {
  const dir = path.join(uploadsRoot, 'attachment');
  const before = listDir(dir);
  const cases = [
    { name: 'xss.html', type: 'text/html', body: HTML },
    { name: 'xss.svg', type: 'image/svg+xml', body: SVG },
    { name: 'shell.php', type: 'application/x-php', body: PHP },
    { name: 'fake.png', type: 'image/png', body: HTML },
    { name: 'tool.exe', type: 'application/octet-stream', body: EXE },
  ];
  for (const c of cases) {
    const res = await request(app)
      .post('/api/tickets')
      .set('Authorization', teacher)
      .attach('attachment[]', c.body, { filename: c.name, contentType: c.type });
    assert.equal(res.status, 400, `${c.name}: ${res.status} ${res.text}`);
    assert.equal(res.body.success, false);
  }
  assert.deepEqual(listDir(dir), before, 'rejected uploads must not stay on disk');
});

test('ticket attachments: oversized images are rejected with 413', async () => {
  const big = Buffer.concat([PNG, Buffer.alloc(600 * 1024)]);
  const res = await request(app)
    .post('/api/tickets')
    .set('Authorization', teacher)
    .attach('attachment[]', big, { filename: 'big.png', contentType: 'image/png' });
  assert.equal(res.status, 413);
});

test('research upload: a non-PDF disguised as PDF is rejected before the controller', async () => {
  const dir = path.join(uploadsRoot, 'research', 'Publications');
  const before = listDir(dir);
  const res = await request(app)
    .post('/api/research/publication')
    .set('Authorization', teacher)
    .attach('document', HTML, { filename: 'paper.pdf', contentType: 'application/pdf' });
  assert.equal(res.status, 400);
  assert.match(res.body.message, /PDF/);
  assert.deepEqual(listDir(dir), before);
});

test('professional activity upload: PDF with embedded JavaScript is rejected', async () => {
  const dir = path.join(uploadsRoot, 'professional_activity', 'attended');
  const before = listDir(dir);
  const res = await request(app)
    .post('/api/professional-activities/attended')
    .set('Authorization', teacher)
    .attach('document', PDF_WITH_JS, { filename: 'cert.pdf', contentType: 'application/pdf' });
  assert.equal(res.status, 400);
  assert.deepEqual(listDir(dir), before);
});

test('profile photo: only real JPEGs are accepted', async () => {
  const res = await request(app)
    .post('/api/profile/photo')
    .set('Authorization', teacher)
    .attach('profile_photo', HTML, { filename: 'me.html', contentType: 'image/jpeg' });
  assert.equal(res.status, 400);
});

// ---------- secure uploader wiring (no DB) ----------

function miniApp(uploader, field) {
  const a = express();
  a.post('/up', uploader.single(field), (req, res) => res.json({ ok: true, type: req.file.detectedType }));
  a.use(errorMiddleware);
  return a;
}

test('Form 16 upload is kept in memory (no path built from request input) and verified', async () => {
  const a = miniApp(uploadForm16Pdf, 'file');
  const form16Dir = path.join(uploadsRoot, 'form16');
  const before = listDir(form16Dir);
  const ok = await request(a).post('/up').field('year', '../../../../src').attach('file', PDF, { filename: 'f.pdf', contentType: 'application/pdf' });
  assert.equal(ok.status, 200);
  assert.equal(ok.body.type, 'pdf');
  // Multer no longer creates folders from req.body.year / req.params.id.
  assert.deepEqual(listDir(form16Dir), before);
  const bad = await request(a).post('/up').attach('file', HTML, { filename: 'f.pdf', contentType: 'application/pdf' });
  assert.equal(bad.status, 400);
});

test('Excel upload: only real spreadsheets, size-limited', async () => {
  const a = miniApp(uploadExcelSheet, 'fileinput');
  const xlsx = new AdmZip();
  xlsx.addFile('[Content_Types].xml', Buffer.from('<Types/>'));
  const ok = await request(a).post('/up').attach('fileinput', xlsx.toBuffer(), {
    filename: 'c.xlsx', contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  assert.equal(ok.status, 200);
  const bad = await request(a).post('/up').attach('fileinput', HTML, { filename: 'c.xlsx', contentType: 'application/vnd.ms-excel' });
  assert.equal(bad.status, 400);
  const big = await request(a).post('/up').attach('fileinput', Buffer.alloc(11 * 1024 * 1024), { filename: 'c.xls', contentType: 'application/vnd.ms-excel' });
  assert.equal(big.status, 413);
});

// ---------- archives ----------

test('bulk Form 16 archive: zip bombs and fake PDFs are refused, traversal names are flattened', () => {
  const bomb = new AdmZip();
  bomb.addFile('part a/ABCDE1234F.pdf', Buffer.alloc(25 * 1024 * 1024));
  assert.throws(() => form16.toArchiveEntriesFromZip(bomb.toBuffer()), /larger than 20 MB/);

  const mixed = new AdmZip();
  mixed.addFile('part a/ABCDE1234F.pdf', PDF);
  mixed.addFile('part a/run.exe', EXE);
  const entries = form16.toArchiveEntriesFromZip(mixed.toBuffer());
  assert.deepEqual(entries.map((e) => e.entryName), ['part a/ABCDE1234F.pdf']);

  assert.equal(form16.isSafePdf(PDF), true);
  assert.equal(form16.isSafePdf(HTML), false);
  assert.equal(form16.isSafePdf(PDF_WITH_JS), false);
});

// ---------- serving uploads ----------

test('/uploads only serves PDFs and images, with nosniff and a script-blocking CSP', async () => {
  const dir = path.join(uploadsRoot, 'attachment');
  const probe = path.join(dir, 'zz_security_probe.html');
  const probeImg = path.join(dir, 'zz_security_probe.png');
  fs.writeFileSync(probe, HTML);
  fs.writeFileSync(probeImg, PNG);
  try {
    assert.equal((await request(app).get('/uploads/attachment/zz_security_probe.html')).status, 404);
    assert.equal((await request(app).get('/uploads/attachment/zz_security_probe%2Ehtml')).status, 404);
    assert.equal((await request(app).get('/uploads/attachment/')).status, 404);
    assert.equal((await request(app).get('/uploads/../src/app.js')).status, 404);

    const img = await request(app).get('/uploads/attachment/zz_security_probe.png');
    assert.equal(img.status, 200);
    assert.equal(img.headers['x-content-type-options'], 'nosniff');
    assert.match(img.headers['content-security-policy'], /default-src 'none'/);
    assert.match(img.headers['content-type'], /^image\/png/);
  } finally {
    fs.rmSync(probe, { force: true });
    fs.rmSync(probeImg, { force: true });
  }
});

test('API responses carry nosniff', async () => {
  const res = await request(app).get('/health');
  assert.equal(res.headers['x-content-type-options'], 'nosniff');
});
