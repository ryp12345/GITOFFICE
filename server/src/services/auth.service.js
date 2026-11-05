const crypto = require('crypto');
const userModel = require('../models/user.model');
const { hashPassword, comparePassword } = require('../utils/hash');
const { generateTemporaryPassword, passwordPolicyError } = require('../utils/password');
const {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  signPasswordResetToken,
  verifyPasswordResetToken
} = require('../utils/jwt');
const { sendPasswordResetEmail } = require('./email.service');
const { clientUrl } = require('../config');

// Returned with login / refresh so the client sends the user straight to Change Password.
const PASSWORD_CHANGE_REQUIRED = 'PASSWORD_CHANGE_REQUIRED';

function httpError(message, statusCode, code) {
  const err = new Error(message);
  err.statusCode = statusCode;
  if (code) err.code = code;
  return err;
}

function buildImpersonatorContext(source) {
  if (!source?.impersonator?.id) {
    return null;
  }

  return {
    id: source.impersonator.id,
    email: source.impersonator.email,
    role: source.impersonator.role
  };
}

function buildSafeUser(user, impersonator = null) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    fname: user.fname || null,
    mname: user.mname || null,
    lname: user.lname || null,
    staff_id: user.staff_id || null,
    coordinator_names: user.coordinator_names || [],
    must_change_password: Boolean(user.must_change_password),
    impersonating: Boolean(impersonator),
    impersonator
  };
}

// Ties every token (access and refresh) to the password it was issued under. authMiddleware
// compares it with the stored hash on each request, so a password reset or change ends all
// other sessions immediately (Laravel ends them with the server-side session).
function passwordVersion(passwordHash) {
  if (!passwordHash) return null;
  return crypto.createHash('sha256').update(String(passwordHash)).digest('hex').slice(0, 16);
}

// `user` must include the password hash (userModel.findByEmail / loadSessionUser).
function issueSession(user, options = {}) {
  const pv = passwordVersion(user.password);
  if (!pv) {
    throw new Error('issueSession needs the user record with its password hash');
  }

  const impersonator = buildImpersonatorContext(options);
  const tokenPayload = { id: user.id, role: user.role, staff_id: user.staff_id || null, pv };

  if (impersonator) {
    tokenPayload.impersonator = impersonator;
  }

  const token = signAccessToken(tokenPayload);
  const refreshToken = signRefreshToken(tokenPayload);
  const safeUser = buildSafeUser(user, impersonator);
  const mustChangePassword = safeUser.must_change_password;

  return {
    token,
    refreshToken,
    user: safeUser,
    mustChangePassword,
    status: mustChangePassword ? PASSWORD_CHANGE_REQUIRED : 'OK'
  };
}

// Full user row (with hash, staff link and coordinator names) for issuing a session.
async function loadSessionUser(userId) {
  const baseUser = await userModel.findById(userId);
  const user = baseUser ? await userModel.findByEmail(baseUser.email) : null;
  if (!user) throw httpError('User not found', 404);
  return user;
}

async function register(payload) {
  const existing = await userModel.findByEmail(payload.email);
  if (existing) {
    throw httpError('Email already exists', 409);
  }

  const policyError = passwordPolicyError(payload.password);
  if (policyError) throw httpError(policyError, 400);

  const passwordHash = await hashPassword(payload.password);
  // Never take the role from the request: self-registration must not grant Establishment or
  // Super Admin access. Laravel's User model does not mass-assign role either.
  return userModel.create({
    email: payload.email,
    passwordHash,
    role: 'user'
  });
}

// A temporary password logs in normally; the session it gets is limited to changing the
// password until must_change_password is cleared (enforced in authMiddleware).
async function login(payload) {
  const user = await userModel.findByEmail(payload.email);
  if (!user) {
    throw httpError('Invalid credentials', 401);
  }

  const isValid = await comparePassword(payload.password, user.password);
  if (!isValid) {
    throw httpError('Invalid credentials', 401);
  }

  return issueSession(user);
}

async function refreshSession(payload) {
  let decoded;

  try {
    decoded = verifyRefreshToken(payload.refreshToken);
  } catch (_error) {
    throw httpError('Invalid refresh token', 401);
  }

  const baseUser = await userModel.findById(decoded.id);
  const user = baseUser ? await userModel.findByEmail(baseUser.email) : null;
  if (!user) {
    throw httpError('User not found', 401);
  }

  // Tokens without a version predate this check and cannot be tied to a password: refuse them.
  if (!decoded.pv || decoded.pv !== passwordVersion(user.password)) {
    throw httpError('Session ended because the password was changed. Please log in again.', 401);
  }

  return issueSession(user, decoded);
}

// Stores a new bcrypt hash. mustChangePassword: true for temporary passwords.
async function resetPassword(userId, nextPassword, { mustChangePassword = false } = {}) {
  const passwordHash = await hashPassword(nextPassword);
  const user = await userModel.updatePasswordById(userId, passwordHash, { mustChangePassword });

  if (!user) {
    throw httpError('User not found', 404);
  }

  return user;
}

// Admin reset: unique random temporary password, only its hash is stored, the user must change
// it at next login, and every existing session of that user stops working (new hash -> new pv).
// The plaintext is returned to the caller once and never logged or saved.
async function adminResetPassword(userId) {
  const temporaryPassword = generateTemporaryPassword();
  const user = await resetPassword(userId, temporaryPassword, { mustChangePassword: true });
  return { user, temporaryPassword };
}

// Self-service change (also the mandatory change after a temporary password).
// Returns a fresh session; tokens from before the change stop working.
async function changePassword(userId, { currentPassword, newPassword, confirmPassword }, options = {}) {
  if (!currentPassword || !newPassword || !confirmPassword) {
    throw httpError('Current password, new password and confirmation are required', 400);
  }
  if (newPassword !== confirmPassword) {
    throw httpError('New password and confirm password do not match.', 400);
  }

  const policyError = passwordPolicyError(newPassword);
  if (policyError) throw httpError(policyError, 400);

  const user = await loadSessionUser(userId);
  const isValid = await comparePassword(currentPassword, user.password);
  if (!isValid) {
    throw httpError('Current password is incorrect', 400);
  }

  // Covers re-using the temporary password: it IS the current password while a change is pending.
  if (currentPassword === newPassword || (await comparePassword(newPassword, user.password))) {
    throw httpError('New password cannot be same as your current password.', 400);
  }

  await resetPassword(user.id, newPassword, { mustChangePassword: false });
  return issueSession(await loadSessionUser(user.id), options);
}

async function requestPasswordReset(email) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const user = await userModel.findByEmail(normalizedEmail);

  if (!user) {
    return;
  }

  const token = signPasswordResetToken({
    id: user.id,
    email: user.email,
    passwordHash: user.password
  });

  const resetUrl = `${clientUrl.replace(/\/$/, '')}/reset-password?token=${encodeURIComponent(token)}`;
  await sendPasswordResetEmail({ toEmail: user.email, resetUrl });
}

async function resetPasswordWithToken(token, nextPassword) {
  let decoded;

  try {
    decoded = verifyPasswordResetToken(token);
  } catch (_error) {
    throw httpError('Invalid or expired reset token', 400);
  }

  const user = await userModel.findByEmail(decoded.email);
  if (!user || user.id !== decoded.id) {
    throw httpError('Invalid reset token', 400);
  }

  if (decoded.passwordHash !== user.password) {
    throw httpError('Reset token has already been used', 400);
  }

  const policyError = passwordPolicyError(nextPassword);
  if (policyError) throw httpError(policyError, 400);

  // The user picked this password themselves (via their email), so no further change is forced.
  await resetPassword(user.id, nextPassword, { mustChangePassword: false });
}

module.exports = {
  PASSWORD_CHANGE_REQUIRED,
  passwordVersion,
  register,
  login,
  refreshSession,
  issueSession,
  loadSessionUser,
  resetPassword,
  adminResetPassword,
  changePassword,
  requestPasswordReset,
  resetPasswordWithToken
};
