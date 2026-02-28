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

module.exports = { validateLoginPayload, validateRegisterPayload };
