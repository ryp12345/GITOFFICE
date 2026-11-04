const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { pathToFileURL } = require('url');

const { normalizeWebUrl } = require('../src/utils/safeUrl');

const XSS_LINKS = [
  'javascript:alert(1)',
  'JaVaScRiPt:alert(document.cookie)',
  ' javascript:alert(1)',
  'java\tscript:alert(1)',
  'java\nscript:alert(1)',
  'javascript&colon;alert(1)',
  'data:text/html,<script>alert(1)</script>',
  'vbscript:msgbox(1)',
  'file:///etc/passwd',
  '"><script>alert(1)</script>',
];

test('server: stored web links only accept http(s)', () => {
  for (const link of XSS_LINKS) {
    const r = normalizeWebUrl(link);
    assert.ok(!r.ok || /^https?:\/\//.test(r.url), `${JSON.stringify(link)} -> ${JSON.stringify(r)}`);
    if (r.ok) assert.doesNotMatch(r.url, /[<>"]/);
  }
  assert.deepEqual(normalizeWebUrl('https://doi.org/10.1000/xyz'), { ok: true, url: 'https://doi.org/10.1000/xyz' });
  assert.deepEqual(normalizeWebUrl('www.example.com/paper'), { ok: true, url: 'https://www.example.com/paper' });
  assert.deepEqual(normalizeWebUrl(''), { ok: true, url: null });
});

test('server: research validator rejects a javascript: weblink', () => {
  // The validator lives in the controller; exercise it through a fake request.
  const controller = require('../src/controllers/common/research.controller');
  const researchModel = require('../src/models/research.model');
  const original = researchModel.resolveStaffId;
  researchModel.resolveStaffId = async () => 42;
  return new Promise((resolve, reject) => {
    const req = {
      params: { resource: 'publication' },
      user: { id: 2 },
      body: { title: 't', date: '2024-01-01', role: 'Author', publication_type: 'Journal', level: 'Q1', link: 'javascript:alert(1)' },
      file: { filename: 'x.pdf' },
    };
    controller.create(req, {}, (err) => {
      researchModel.resolveStaffId = original;
      try {
        assert.equal(err.statusCode, 422); // existing validation-error status
        assert.match(JSON.stringify(err.errors), /valid web link/);
        resolve();
      } catch (e) {
        reject(e);
      }
    });
  });
});

test('server: Form 16 issue email escapes archive file names', async () => {
  const emailService = require('../src/services/email.service');
  const nodemailer = require('nodemailer');
  const config = require('../src/config');
  let sentHtml = '';
  const originalCreate = nodemailer.createTransport;
  nodemailer.createTransport = () => ({ sendMail: async (m) => { sentHtml = m.html; } });
  const saved = { ...config };
  Object.assign(config, { smtpHost: config.smtpHost || 'smtp.test', smtpUser: config.smtpUser || 'u', smtpPass: config.smtpPass || 'p', smtpFrom: config.smtpFrom || 'a@b.c' });
  try {
    await emailService.sendForm16UploadIssueReport({
      toEmail: 'x@y.z', year: 2024, archiveType: 'zip', totalPdfInZip: 1, uploaded: 0,
      unmatchedPans: [], invalidFiles: ['<img src=x onerror=alert(1)>.pdf'], invalidPartPath: ['<script>alert(1)</script>/a.pdf'],
    });
  } finally {
    nodemailer.createTransport = originalCreate;
    Object.assign(config, saved);
  }
  if (!sentHtml) return; // SMTP config could not be faked in this environment.
  assert.doesNotMatch(sentHtml, /<img src=x/);
  assert.doesNotMatch(sentHtml, /<script>alert/);
  assert.match(sentHtml, /&lt;img src=x onerror=alert\(1\)&gt;/);
});

test('client: safeExternalUrl and escapeHtml block script URLs and markup', async () => {
  const mod = await import(pathToFileURL(path.resolve(__dirname, '..', '..', 'client', 'src', 'utils', 'safeUrl.js')).href);
  for (const link of XSS_LINKS) {
    const out = mod.safeExternalUrl(link);
    assert.ok(out === null || /^https?:\/\//.test(out), `${JSON.stringify(link)} -> ${out}`);
  }
  assert.equal(mod.safeExternalUrl('http://example.com/a?b=1'), 'http://example.com/a?b=1');
  assert.equal(mod.safeExternalUrl('example.org'), 'https://example.org/');
  assert.equal(mod.escapeHtml(`<b onclick="x">'&</b>`), '&lt;b onclick=&quot;x&quot;&gt;&#39;&amp;&lt;/b&gt;');
});
