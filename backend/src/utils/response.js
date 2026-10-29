/** Helpers for the standard API envelopes described in docs/API_SPECIFICATION.md. */

function sendSuccess(req, res, data, meta = {}, status = 200) {
  res.status(status).json({
    success: true,
    data,
    meta: { timestamp: new Date().toISOString(), path: req.originalUrl, ...meta },
  });
}

/** Create an Error that the central errorHandler turns into the error envelope. */
function apiError(statusCode, code, message, details = null) {
  const err = new Error(message);
  err.statusCode = statusCode;
  err.code = code;
  err.details = details;
  return err;
}

/** Wrap an async route handler so rejected promises reach the error handler. */
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

module.exports = { sendSuccess, apiError, asyncHandler };
