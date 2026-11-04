const UPLOAD_LIMIT_MESSAGES = {
  LIMIT_FILE_SIZE: 'File is too large. Please upload a smaller file.',
  LIMIT_FILE_COUNT: 'Too many files uploaded.',
  LIMIT_UNEXPECTED_FILE: 'Unexpected file field in upload.',
  LIMIT_PART_COUNT: 'Upload has too many parts.',
  LIMIT_FIELD_KEY: 'Upload field name is too long.',
  LIMIT_FIELD_VALUE: 'Upload field value is too long.',
  LIMIT_FIELD_COUNT: 'Upload has too many fields.'
};

function errorMiddleware(error, _req, res, _next) {
  // Rejected uploads are client errors, not server crashes.
  const isMulterError = Boolean(error) && error.name === 'MulterError';
  const status = isMulterError ? (error.code === 'LIMIT_FILE_SIZE' ? 413 : 400) : error.statusCode || 500;
  const payload = {
    success: false,
    message: (isMulterError && UPLOAD_LIMIT_MESSAGES[error.code]) || error.message || 'Internal Server Error'
  };

  if (error.errors && typeof error.errors === 'object') {
    payload.errors = error.errors;
  }

  res.status(status).json(payload);
}

module.exports = { errorMiddleware };
