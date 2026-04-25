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

module.exports = { listUsers, getMe, impersonate, resetPassword, stopImpersonation };
