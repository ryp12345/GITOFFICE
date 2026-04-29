function validateLoginPayload(req, _res, next) {
  const { email, password } = req.body;
  if (!email || !password) {
    const err = new Error('Email and password are required');
    err.statusCode = 400;
    return next(err);
  }
  return next();
}

function validateRegisterPayload(req, _res, next) {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    const err = new Error('Name, email and password are required');
    err.statusCode = 400;
    return next(err);
  }
  return next();
}

function validateRefreshPayload(req, _res, next) {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    const err = new Error('Refresh token is required');
    err.statusCode = 400;
    return next(err);
  }
  return next();
}

function validateForgotPasswordPayload(req, _res, next) {
  const { email } = req.body;
  if (!email) {
    const err = new Error('Email is required');
    err.statusCode = 400;
    return next(err);
  }
  return next();
}

function validateResetPasswordPayload(req, _res, next) {
  const { token, password } = req.body;
  if (!token || !password) {
    const err = new Error('Token and password are required');
    err.statusCode = 400;
    return next(err);
  }
  return next();
}

module.exports = {
  validateLoginPayload,
  validateRegisterPayload,
  validateRefreshPayload,
  validateForgotPasswordPayload,
  validateResetPasswordPayload
};
