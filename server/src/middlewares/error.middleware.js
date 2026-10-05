function errorMiddleware(error, _req, res, _next) {
  const status = error.statusCode || 500;
  const payload = {
    success: false,
    message: error.message || 'Internal Server Error'
  };

  if (error.errors && typeof error.errors === 'object') {
    payload.errors = error.errors;
  }

  res.status(status).json(payload);
}

module.exports = { errorMiddleware };