const userModel = require('../models/user.model');
const { hashPassword, comparePassword } = require('../utils/hash');
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('../utils/jwt');

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

  const token = signAccessToken({ id: user.id, role: user.role });
  const refreshToken = signRefreshToken({ id: user.id, role: user.role });
  const safeUser = {
    id: user.id,
    email: user.email,
    role: user.role
  };
  return { token, refreshToken, user: safeUser };
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

  const safeUser = { id: user.id, email: user.email, role: user.role };

  const token = signAccessToken({ id: safeUser.id, role: safeUser.role });
  const refreshToken = signRefreshToken({ id: safeUser.id, role: safeUser.role });

  return { token, refreshToken, user: safeUser };
}

module.exports = { register, login, refreshSession };
