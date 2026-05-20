function roleMiddleware(...roles) {
  const allowed = roles
    .filter((r) => r !== undefined && r !== null)
    .map((r) => String(r).trim().toLowerCase());

  return function checkRole(req, _res, next) {
    const userRole = req.user && req.user.role ? String(req.user.role).trim().toLowerCase() : null;
    if (!userRole || !allowed.includes(userRole)) {
      const err = new Error('Forbidden');
      err.statusCode = 403;
      return next(err);
    }
    return next();
  };
}

module.exports = { roleMiddleware };
