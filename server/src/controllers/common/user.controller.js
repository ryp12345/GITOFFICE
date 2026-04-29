const userService = require('../../services/user.service');

async function listUsers(_req, res, next) {
  try {
    const users = await userService.listAll();
    res.json({ success: true, data: users });
  } catch (error) {
    next(error);
  }
}

async function getMe(req, res, next) {
  try {
    const user = await userService.getById(req.user.id);
    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
}

async function impersonate(req, res, next) {
  try {
    const targetUserId = Number(req.params.id);
    if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
      const err = new Error('Valid user id is required');
      err.statusCode = 400;
      throw err;
    }

    const data = await userService.impersonateUser(req.user, targetUserId);
    res.json({ success: true, data, message: 'Impersonation started successfully' });
  } catch (error) {
    next(error);
  }
}

async function resetPassword(req, res, next) {
  try {
    const targetUserId = Number(req.params.id);
    if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
      const err = new Error('Valid user id is required');
      err.statusCode = 400;
      throw err;
    }

    const data = await userService.resetUserPassword(targetUserId);
    res.json({ success: true, data, message: `Password reset successfully to ${data.defaultPassword}` });
  } catch (error) {
    next(error);
  }
}

async function stopImpersonation(req, res, next) {
  try {
    const data = await userService.stopImpersonation(req.user);
    res.json({ success: true, data, message: 'Returned to original user session' });
  } catch (error) {
    next(error);
  }
}

async function changeOwnPassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      const err = new Error('currentPassword and newPassword are required');
      err.statusCode = 400;
      throw err;
    }
    if (newPassword.length < 8) {
      const err = new Error('New password must be at least 8 characters');
      err.statusCode = 400;
      throw err;
    }
    await userService.changeOwnPassword(req.user.id, currentPassword, newPassword);
    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    next(error);
  }
}

async function verifyCurrentPassword(req, res, next) {
  try {
    const { currentPassword } = req.body;
    if (!currentPassword) {
      const err = new Error('currentPassword is required');
      err.statusCode = 400;
      throw err;
    }

    const matched = await userService.verifyOwnCurrentPassword(req.user.id, currentPassword);
    res.json({ success: true, data: { matched } });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listUsers,
  getMe,
  impersonate,
  resetPassword,
  stopImpersonation,
  changeOwnPassword,
  verifyCurrentPassword
};
