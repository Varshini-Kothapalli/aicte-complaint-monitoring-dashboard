const config = require('../config/env');

/**
 * Centralized error handling middleware.
 * Formats errors into standard JSON envelope.
 */
function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || (res.statusCode >= 400 ? res.statusCode : 500);

  const response = {
    success: false,
    error: {
      message: err.message || 'An internal server error occurred',
      code: err.code || 'INTERNAL_SERVER_ERROR',
      details: err.details || null,
    },
    meta: {
      timestamp: new Date().toISOString(),
      path: req.originalUrl,
      method: req.method,
    },
  };

  if (config.nodeEnv === 'development' && err.stack) {
    response.error.stack = err.stack;
  }

  res.status(statusCode).json(response);
}

module.exports = errorHandler;
