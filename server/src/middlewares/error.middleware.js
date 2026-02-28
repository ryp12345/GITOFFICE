function errorMiddleware(error, _req, res, _next) {
  const status = error.statusCode || 500;
  res.status(status).json({
    success: false,
    message: error.message || 'Internal Server Error'
  });
}

module.exports = { errorMiddleware };
