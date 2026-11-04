// User-entered web links (research "Weblink", publication "Web link", ...).
// Only http/https are allowed so a saved link can never be "javascript:", "data:", etc.
// A link typed without a scheme ("www.example.com/paper") gets "https://" added, matching
// how users already enter these fields.

const MAX_URL_LENGTH = 2048;

function normalizeWebUrl(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return { ok: true, url: null };
  if (raw.length > MAX_URL_LENGTH) return { ok: false };
  // Reject control characters / whitespace browsers strip before parsing the scheme.
  if (/[\u0000-\u001f\u007f\s]/.test(raw)) return { ok: false };

  const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(raw);
  const candidate = hasScheme ? raw : `https://${raw.replace(/^\/+/, '')}`;

  let parsed;
  try {
    parsed = new URL(candidate);
  } catch (_err) {
    return { ok: false };
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return { ok: false };
  if (!parsed.hostname) return { ok: false };
  return { ok: true, url: parsed.href };
}

module.exports = { normalizeWebUrl, MAX_URL_LENGTH };
