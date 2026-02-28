const userModel = require('../models/user.model');
const { hashPassword, comparePassword } = require('../utils/hash');
const { signToken } = require('../utils/jwt');

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

  const token = signToken({ id: user.id, role: user.role });
  const safeUser = {
    id: user.id,
    email: user.email,
    role: user.role
  };
  return { token, user: safeUser };
}

module.exports = { register, login };
