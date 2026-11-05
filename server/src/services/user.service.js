const userModel = require('../models/user.model');
const authService = require('./auth.service');
const { comparePassword } = require('../utils/hash');

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
  const baseTarget = await userModel.findById(targetUserId);
  if (!baseTarget) {
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

  // Sessions are tied to the target's password, so the full record (with hash) is needed.
  // A target with a pending password change gets the same restricted session they would.
  const targetUser = await authService.loadSessionUser(baseTarget.id);
  return authService.issueSession(targetUser, { impersonator });
}

// Unique one-time temporary password; the plaintext goes back to the admin once.
async function resetUserPassword(targetUserId) {
  return authService.adminResetPassword(targetUserId);
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

  return authService.issueSession(await authService.loadSessionUser(impersonator.id));
}

async function verifyOwnCurrentPassword(userId, currentPassword) {
  const user = await authService.loadSessionUser(userId);
  return comparePassword(currentPassword, user.password);
}

// Returns a fresh session (the old tokens stop working once the hash changes).
async function changeOwnPassword(actor, passwords) {
  return authService.changePassword(actor.id, passwords, actor);
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
