const nodemailer = require('nodemailer');
const { smtpHost, smtpPort, smtpSecure, smtpUser, smtpPass, smtpFrom } = require('../config');

function createTransporter() {
  if (!smtpHost || !smtpUser) {
    return null;
  }

  return nodemailer.createTransporter({
    host: smtpHost,
    port: smtpPort,
    secure: smtpSecure,
    auth: {
      user: smtpUser,
      pass: smtpPass
    }
  });
}

/**
 * Send the Form 16 bulk upload issue report email.
 * @param {Object} opts
 * @param {string} opts.toEmail  - Recipient email address
 * @param {number} opts.year     - The financial year uploaded
 * @param {string} opts.archiveType - 'zip' or 'rar'
 * @param {number} opts.totalPdfInZip
 * @param {number} opts.uploaded
 * @param {string[]} opts.unmatchedPans
 * @param {string[]} opts.invalidFiles
 * @param {string[]} opts.invalidPartPath
 */
async function sendForm16UploadIssueReport(opts) {
  const {
    toEmail,
    year,
    archiveType,
    totalPdfInZip,
    uploaded,
    unmatchedPans = [],
    invalidFiles = [],
    invalidPartPath = []
  } = opts;

  const transporter = createTransporter();
  if (!transporter) {
    console.warn('[Email] SMTP not configured. Skipping Form 16 issue report email.');
    return;
  }

  const hasIssues = unmatchedPans.length > 0 || invalidFiles.length > 0 || invalidPartPath.length > 0;
  if (!hasIssues) return;

  const failedCount = totalPdfInZip - uploaded;
  const uploadedAt = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

  const unmatchedSection = unmatchedPans.length > 0
    ? `
      <h3 style="color:#b45309;margin:16px 0 8px;">Unmatched PAN Numbers (${unmatchedPans.length})</h3>
      <p style="color:#78350f;font-size:13px;margin:0 0 8px;">These PANs were found in the filenames but do not match any staff record in the database.</p>
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <thead>
          <tr style="background:#fef3c7;">
            <th style="padding:8px 12px;text-align:left;border:1px solid #d97706;color:#92400e;">#</th>
            <th style="padding:8px 12px;text-align:left;border:1px solid #d97706;color:#92400e;">PAN Number</th>
          </tr>
        </thead>
        <tbody>
          ${unmatchedPans.map((pan, i) => `
            <tr style="background:${i % 2 === 0 ? '#fffbeb' : '#fff'}">
              <td style="padding:6px 12px;border:1px solid #e5e7eb;">${i + 1}</td>
              <td style="padding:6px 12px;border:1px solid #e5e7eb;font-family:monospace;">${pan}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>`
    : '';

  const invalidFilesSection = invalidFiles.length > 0
    ? `
      <h3 style="color:#b91c1c;margin:16px 0 8px;">Invalid Filenames (${invalidFiles.length})</h3>
      <p style="color:#7f1d1d;font-size:13px;margin:0 0 8px;">These files do not have a valid PAN number at the start of their filename. Expected format: <code>PANXXXXX_PARTA_YEAR.pdf</code></p>
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <thead>
          <tr style="background:#fee2e2;">
            <th style="padding:8px 12px;text-align:left;border:1px solid #ef4444;color:#7f1d1d;">#</th>
            <th style="padding:8px 12px;text-align:left;border:1px solid #ef4444;color:#7f1d1d;">File Name</th>
          </tr>
        </thead>
        <tbody>
          ${invalidFiles.map((file, i) => `
            <tr style="background:${i % 2 === 0 ? '#fff5f5' : '#fff'}">
              <td style="padding:6px 12px;border:1px solid #e5e7eb;">${i + 1}</td>
              <td style="padding:6px 12px;border:1px solid #e5e7eb;font-family:monospace;">${file}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>`
    : '';

  const invalidPathSection = invalidPartPath.length > 0
    ? `
      <h3 style="color:#6d28d9;margin:16px 0 8px;">Files in Unknown Folders (${invalidPartPath.length})</h3>
      <p style="color:#4c1d95;font-size:13px;margin:0 0 8px;">These files are not inside a folder named "FORM 16 PART A" or "FORM 16 PART B".</p>
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <thead>
          <tr style="background:#ede9fe;">
            <th style="padding:8px 12px;text-align:left;border:1px solid #7c3aed;color:#4c1d95;">#</th>
            <th style="padding:8px 12px;text-align:left;border:1px solid #7c3aed;color:#4c1d95;">File Path</th>
          </tr>
        </thead>
        <tbody>
          ${invalidPartPath.map((p, i) => `
            <tr style="background:${i % 2 === 0 ? '#f5f3ff' : '#fff'}">
              <td style="padding:6px 12px;border:1px solid #e5e7eb;">${i + 1}</td>
              <td style="padding:6px 12px;border:1px solid #e5e7eb;font-family:monospace;">${p}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>`
    : '';

  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family:Arial,sans-serif;background:#f9fafb;margin:0;padding:0;">
      <div style="max-width:700px;margin:32px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

        <!-- Header -->
        <div style="background:#1d4ed8;padding:24px 32px;">
          <h1 style="color:#fff;margin:0;font-size:20px;">Form 16 Bulk Upload — Issue Report</h1>
          <p style="color:#bfdbfe;margin:6px 0 0;font-size:13px;">GIT Office · Establishment</p>
        </div>

        <!-- Summary -->
        <div style="padding:24px 32px 0;">
          <p style="color:#374151;font-size:14px;margin:0 0 16px;">
            The bulk upload for <strong>FY ${year}</strong> completed with some issues. Please review the details below and re-upload the affected files.
          </p>

          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:8px;">
            <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:6px;padding:14px;text-align:center;">
              <div style="font-size:24px;font-weight:700;color:#16a34a;">${uploaded}</div>
              <div style="font-size:12px;color:#166534;margin-top:4px;">Successfully Uploaded</div>
            </div>
            <div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:6px;padding:14px;text-align:center;">
              <div style="font-size:24px;font-weight:700;color:#dc2626;">${failedCount}</div>
              <div style="font-size:12px;color:#991b1b;margin-top:4px;">Failed / Skipped</div>
            </div>
            <div style="background:#eff6ff;border:1px solid #93c5fd;border-radius:6px;padding:14px;text-align:center;">
              <div style="font-size:24px;font-weight:700;color:#1d4ed8;">${totalPdfInZip}</div>
              <div style="font-size:12px;color:#1e40af;margin-top:4px;">Total PDFs in ${archiveType.toUpperCase()}</div>
            </div>
          </div>

          <p style="color:#6b7280;font-size:12px;margin:8px 0 0;">Uploaded at: ${uploadedAt} IST</p>
        </div>

        <!-- Issue Sections -->
        <div style="padding:16px 32px 32px;">
          ${unmatchedSection}
          ${invalidFilesSection}
          ${invalidPathSection}
        </div>

        <!-- Footer -->
        <div style="background:#f3f4f6;padding:16px 32px;border-top:1px solid #e5e7eb;">
          <p style="color:#6b7280;font-size:12px;margin:0;">
            Expected ZIP structure:<br>
            <code style="font-size:11px;color:#374151;">
              FORM 16 PART A / PANXXXXX_PARTA_YYYY-YY.pdf<br>
              FORM 16 PART B / PANXXXXX_PARTB_YYYY-YY.pdf
            </code>
          </p>
          <p style="color:#9ca3af;font-size:11px;margin:8px 0 0;">This is an automated message from GIT Office. Do not reply.</p>
        </div>

      </div>
    </body>
    </html>
  `;

  const subject = `[GIT Office] Form 16 FY ${year} Bulk Upload — ${failedCount} file(s) failed`;

  try {
    await transporter.sendMail({
      from: `"GIT Office" <${smtpFrom}>`,
      to: toEmail,
      subject,
      html
    });
    console.log(`[Email] Form 16 issue report sent to ${toEmail}`);
  } catch (err) {
    console.error('[Email] Failed to send Form 16 issue report:', err.message);
    // Do not throw — email failure should not block the API response
  }
}

module.exports = { sendForm16UploadIssueReport };
