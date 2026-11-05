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

    const { user, temporaryPassword } = await userService.resetUserPassword(targetUserId);
    // Shown to the admin once; never cached, logged or stored in plaintext.
    res.setHeader('Cache-Control', 'no-store');
    res.json({
      success: true,
      data: { user, temporaryPassword, mustChangePassword: true },
      message: 'Password reset. Share the temporary password with the user securely; they must change it at next login.'
    });
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
    const { currentPassword, newPassword, confirmPassword } = req.body || {};
    // Validation (required fields, confirmation, policy, no re-use) lives in auth.service.
    const session = await userService.changeOwnPassword(req.user, { currentPassword, newPassword, confirmPassword });
    res.setHeader('Cache-Control', 'no-store');
    res.json({ success: true, data: session, message: 'Password changed successfully' });
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
