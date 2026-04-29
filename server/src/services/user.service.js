const userModel = require('../models/user.model');
const authService = require('./auth.service');
const { comparePassword } = require('../utils/hash');

const DEFAULT_RESET_PASSWORD = 'Password@123';

async function getById(id) {
  const user = await userModel.findById(id);
  if (!user) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }
  return user;
}

async function listAll() {
  return userModel.findAll();
}

async function impersonateUser(actor, targetUserId) {
  const targetUser = await userModel.findById(targetUserId);
  if (!targetUser) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }

  const impersonator = await userModel.findById(actor.id);
  if (!impersonator) {
    const err = new Error('Impersonator not found');
    err.statusCode = 401;
    throw err;
  }

  return authService.issueSession(targetUser, { impersonator });
}

async function resetUserPassword(targetUserId) {
  const user = await authService.resetPassword(targetUserId, DEFAULT_RESET_PASSWORD);
  return {
    user,
    defaultPassword: DEFAULT_RESET_PASSWORD
  };
}

async function stopImpersonation(actor) {
  const impersonatorId = Number(actor?.impersonator?.id);
  if (!Number.isInteger(impersonatorId) || impersonatorId <= 0) {
    const err = new Error('No active impersonation session found');
    err.statusCode = 400;
    throw err;
  }

  const impersonator = await userModel.findById(impersonatorId);
  if (!impersonator) {
    const err = new Error('Original user not found');
    err.statusCode = 404;
    throw err;
  }

  return authService.issueSession(impersonator);
}

async function getAuthUserWithPassword(userId) {
  const baseUser = await userModel.findById(userId);
  const user = await userModel.findByEmail(baseUser?.email);

  if (!user) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }

  return user;
}

async function verifyOwnCurrentPassword(userId, currentPassword) {
  const user = await getAuthUserWithPassword(userId);
  return comparePassword(currentPassword, user.password);
}

async function changeOwnPassword(userId, currentPassword, newPassword) {
  const isValid = await verifyOwnCurrentPassword(userId, currentPassword);
  if (!isValid) {
    const err = new Error('Current password is incorrect');
    err.statusCode = 400;
    throw err;
  }

  await authService.resetPassword(userId, newPassword);
}

module.exports = {
  getById,
  listAll,
  impersonateUser,
  resetUserPassword,
  stopImpersonation,
  changeOwnPassword,
  verifyOwnCurrentPassword
};
