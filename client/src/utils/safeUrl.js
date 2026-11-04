// Returns a link that is safe to put in href, or null.
// Only http/https are allowed, so a stored "javascript:alert(1)" (or data:, vbscript:, ...)
// can never run when someone clicks it. Links typed without a scheme ("www.site.com")
// get "https://". Mirrors server/src/utils/safeUrl.js.
export function safeExternalUrl(value) {
  const raw = String(value ?? '').trim();
  if (!raw || raw.length > 2048) return null;
  if (/[\u0000-\u001f\u007f\s]/.test(raw)) return null;

  const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(raw);
  const candidate = hasScheme ? raw : `https://${raw.replace(/^\/+/, '')}`;

  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    if (!parsed.hostname) return null;
    return parsed.href;
  } catch {
    return null;
  }
}

// Escapes text for inclusion in an HTML string (only for code that must build raw HTML,
// e.g. a print window). React JSX already escapes text and needs no help.
export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}
