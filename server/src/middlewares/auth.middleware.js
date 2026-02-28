const { verifyToken } = require('../utils/jwt');

function authMiddleware(req, _res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    const err = new Error('Unauthorized');
    err.statusCode = 401;
    return next(err);
  }

  try {
    req.user = verifyToken(token);
    return next();
  } catch (_error) {
    const err = new Error('Invalid token');
    err.statusCode = 401;
    return next(err);
  }
}

module.exports = { authMiddleware };
