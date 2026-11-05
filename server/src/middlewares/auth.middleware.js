const crypto = require('crypto');
const { verifyToken } = require('../utils/jwt');
const userModel = require('../models/user.model');

// While a password change is pending (temporary password from an admin reset or a new account)
// only these authenticated endpoints work. Everything else answers 403 PASSWORD_CHANGE_REQUIRED.
// /api/auth/* (login, refresh, forgot/reset password) does not use this middleware at all.
// Logout needs no server call: the session is the token the client discards.
const PENDING_CHANGE_ALLOWED = new Set([
  'GET /api/users/me',
  'POST /api/users/me/change-password',
  'POST /api/users/me/verify-password',
  'POST /api/users/stop-impersonation'
]);

// Same derivation as auth.service passwordVersion (kept here to avoid a require cycle).
function passwordVersion(passwordHash) {
  return crypto.createHash('sha256').update(String(passwordHash)).digest('hex').slice(0, 16);
}

function unauthorized(message, code) {
  const err = new Error(message);
  err.statusCode = 401;
  if (code) err.code = code;
  return err;
}

function requestKey(req) {
  const path = String(req.originalUrl || req.url || '').split('?')[0].replace(/\/+$/, '');
  return `${req.method} ${path}`;
}

async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return next(unauthorized('Unauthorized'));
  }

  let decoded;
  try {
    decoded = verifyToken(token);
  } catch (_error) {
    return next(unauthorized('Invalid token'));
  }

  try {
    // The token must match the user's current password: a reset or change ends every session
    // issued before it, including access tokens that have not expired yet.
    const state = await userModel.findAuthStateById(decoded.id);
    if (!state || !decoded.pv || decoded.pv !== passwordVersion(state.password)) {
      return next(unauthorized('Session ended. Please log in again.', 'SESSION_ENDED'));
    }

    req.user = decoded;
    req.user.must_change_password = Boolean(state.must_change_password);

    if (req.user.must_change_password && !PENDING_CHANGE_ALLOWED.has(requestKey(req))) {
      res.setHeader('Cache-Control', 'no-store');
      return res.status(403).json({
        success: false,
        code: 'PASSWORD_CHANGE_REQUIRED',
        message: 'You must change your temporary password before continuing.'
      });
    }

    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = { authMiddleware, PENDING_CHANGE_ALLOWED };
