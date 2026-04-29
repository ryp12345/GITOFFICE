const authService = require('../../services/auth.service');

async function register(req, res, next) {
  try {
    const user = await authService.register(req.body);
    res.status(201).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
}

async function login(req, res, next) {
  try {
    const data = await authService.login(req.body);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

async function refresh(req, res, next) {
  try {
    const data = await authService.refreshSession(req.body);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

async function forgotPassword(req, res, next) {
  try {
    await authService.requestPasswordReset(req.body?.email);
    res.json({
      success: true,
      message: 'If an account exists for this email, a password reset link has been sent.'
    });
  } catch (error) {
    next(error);
  }
}

async function resetPassword(req, res, next) {
  try {
    await authService.resetPasswordWithToken(req.body?.token, req.body?.password);
    res.json({ success: true, message: 'Password reset successful. You can now sign in.' });
  } catch (error) {
    next(error);
  }
}

module.exports = { register, login, refresh, forgotPassword, resetPassword };
