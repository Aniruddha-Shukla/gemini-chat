import mongoose from 'mongoose';
import { isProd } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

export function notFound(req, _res, next) {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

// Every error thrown in a route (sync or async, Express 5 forwards both) ends up here.
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, next) {
  // A streaming response already sent its headers; all we can do is close it.
  if (res.headersSent) {
    return next(err);
  }

  let status = err.status ?? err.statusCode ?? 500;
  let message = err.message;

  if (err instanceof mongoose.Error.ValidationError) {
    status = 400;
    message = Object.values(err.errors)[0]?.message ?? 'Invalid data';
  } else if (err?.code === 11000) {
    status = 409;
    message = 'An account with this email already exists';
  } else if (err?.type === 'entity.parse.failed') {
    message = 'Request body is not valid JSON';
  }

  if (status >= 500) {
    // Deliberate ApiErrors (e.g. "Gemini not configured") get one line; real bugs get the stack.
    if (err instanceof ApiError) console.warn(`${status} ${err.message}`);
    else console.error(err);
    // Don't leak internals (driver errors, bugs) to clients in production.
    // ApiErrors are thrown deliberately with a client-safe message, so they pass through.
    if (isProd && !(err instanceof ApiError)) message = 'Something went wrong on our side';
  }

  res.status(status).json({ message });
}
