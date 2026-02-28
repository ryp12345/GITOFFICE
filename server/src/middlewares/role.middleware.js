function roleMiddleware(...roles) {
  return function checkRole(req, _res, next) {
    if (!req.user || !roles.includes(req.user.role)) {
      const err = new Error('Forbidden');
      err.statusCode = 403;
      return next(err);
    }
    return next();
  };
}

module.exports = { roleMiddleware };
