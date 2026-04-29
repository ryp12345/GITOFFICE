const userModel = require('../models/user.model');
const { hashPassword, comparePassword } = require('../utils/hash');
const {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  signPasswordResetToken,
  verifyPasswordResetToken
} = require('../utils/jwt');
const { sendPasswordResetEmail } = require('./email.service');
const { clientUrl } = require('../config');

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
    impersonating: Boolean(impersonator),
    impersonator
  };
}

function issueSession(user, options = {}) {
  const impersonator = buildImpersonatorContext(options);
  const tokenPayload = { id: user.id, role: user.role };

  if (impersonator) {
    tokenPayload.impersonator = impersonator;
  }

  const token = signAccessToken(tokenPayload);
  const refreshToken = signRefreshToken(tokenPayload);
  const safeUser = buildSafeUser(user, impersonator);

  return { token, refreshToken, user: safeUser };
}

async function register(payload) {
  const existing = await userModel.findByEmail(payload.email);
  if (existing) {
    const err = new Error('Email already exists');
    err.statusCode = 409;
    throw err;
  }

  const passwordHash = await hashPassword(payload.password);
  return userModel.create({
    email: payload.email,
    passwordHash,
    role: payload.role || 'user'
  });
}

async function login(payload) {
  const user = await userModel.findByEmail(payload.email);
  if (!user) {
    const err = new Error('Invalid credentials');
    err.statusCode = 401;
    throw err;
  }

  const isValid = await comparePassword(payload.password, user.password);
  if (!isValid) {
    const err = new Error('Invalid credentials');
    err.statusCode = 401;
    throw err;
  }

  return issueSession(user);
}

async function refreshSession(payload) {
  let decoded;

  try {
    decoded = verifyRefreshToken(payload.refreshToken);
  } catch (_error) {
    const err = new Error('Invalid refresh token');
    err.statusCode = 401;
    throw err;
  }

  const user = await userModel.findById(decoded.id);
  if (!user) {
    const err = new Error('User not found');
    err.statusCode = 401;
    throw err;
  }

  return issueSession(user, decoded);
}

async function resetPassword(userId, nextPassword) {
  const passwordHash = await hashPassword(nextPassword);
  const user = await userModel.updatePasswordById(userId, passwordHash);

  if (!user) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }

  return user;
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
    const err = new Error('Invalid or expired reset token');
    err.statusCode = 400;
    throw err;
  }

  const user = await userModel.findByEmail(decoded.email);
  if (!user || user.id !== decoded.id) {
    const err = new Error('Invalid reset token');
    err.statusCode = 400;
    throw err;
  }

  if (decoded.passwordHash !== user.password) {
    const err = new Error('Reset token has already been used');
    err.statusCode = 400;
    throw err;
  }

  if (nextPassword.length < 8) {
    const err = new Error('Password must be at least 8 characters');
    err.statusCode = 400;
    throw err;
  }

  await resetPassword(user.id, nextPassword);
}

module.exports = {
  register,
  login,
  refreshSession,
  issueSession,
  resetPassword,
  requestPasswordReset,
  resetPasswordWithToken
};
