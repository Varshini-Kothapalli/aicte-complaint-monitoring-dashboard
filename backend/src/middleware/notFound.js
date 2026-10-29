/**
 * 404 Not Found Middleware
 */
function notFound(req, res, next) {
  const error = new Error(`Resource not found at ${req.method} ${req.originalUrl}`);
  error.statusCode = 404;
  error.code = 'NOT_FOUND';
  next(error);
}

module.exports = notFound;
