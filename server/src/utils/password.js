const crypto = require('crypto');

// Existing policy (forgot-password and change-password flows): at least 8 characters.
// bcrypt only reads the first 72 bytes, so longer passwords are refused rather than silently cut.
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_BYTES = 72;

// Look-alike characters (0/O, 1/l/I) are left out so a temporary password can be read out or
// typed without mistakes.
const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const LOWER = 'abcdefghijkmnopqrstuvwxyz';
const DIGITS = '23456789';
const SYMBOLS = '!@#$%*?-_+=';
const ALL = UPPER + LOWER + DIGITS + SYMBOLS;

const TEMPORARY_PASSWORD_LENGTH = 16;

function pick(chars) {
  return chars[crypto.randomInt(chars.length)];
}

// Cryptographically random one-time password (~100 bits) that always contains an upper-case
// letter, a lower-case letter, a digit and a symbol.
function generateTemporaryPassword(length = TEMPORARY_PASSWORD_LENGTH) {
  const chars = [pick(UPPER), pick(LOWER), pick(DIGITS), pick(SYMBOLS)];
  while (chars.length < length) chars.push(pick(ALL));
  // Fisher-Yates shuffle so the guaranteed characters are not always first.
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = crypto.randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

// Returns an error message, or null when the password meets the policy.
function passwordPolicyError(password) {
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
  }
  if (Buffer.byteLength(password, 'utf8') > MAX_PASSWORD_BYTES) {
    return `Password must be at most ${MAX_PASSWORD_BYTES} characters`;
  }
  return null;
}

module.exports = {
  MIN_PASSWORD_LENGTH,
  MAX_PASSWORD_BYTES,
  TEMPORARY_PASSWORD_LENGTH,
  generateTemporaryPassword,
  passwordPolicyError,
};
