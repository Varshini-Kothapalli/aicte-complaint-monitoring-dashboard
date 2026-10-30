const mongoose = require('mongoose');
const { apiError } = require('../utils/response');

/**
 * Fail fast with 503 when MongoDB is not connected, instead of letting queries hang until
 * Mongoose's buffer timeout. The server itself keeps running in degraded mode.
 */
function requireDatabase(req, res, next) {
  if (mongoose.connection.readyState !== 1) {
    return next(apiError(503, 'DATABASE_UNAVAILABLE', 'The database is not connected. Check that MongoDB is running and try again.'));
  }
  return next();
}

module.exports = requireDatabase;
