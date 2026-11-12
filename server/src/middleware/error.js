import { ApiError } from '../utils/ApiError.js';
import { isProd } from '../config/env.js';

export function notFound(req, res) {
  res.status(404).json({ success: false, message: 'Not found' });
}

export function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);
  if (err?.name === 'MulterError') {
    const message = err.code === 'LIMIT_FILE_SIZE' ? 'Image must be under 5 MB.' : err.message;
    return res.status(400).json({ success: false, message });
  }
  if (err instanceof ApiError) {
    return res.status(err.status).json({ success: false, message: err.message, errors: err.errors || undefined });
  }
  if (err?.name === 'ValidationError') {
    const errors = Object.values(err.errors || {}).map((item) => ({ field: item.path, message: item.message }));
    return res.status(400).json({ success: false, message: 'Validation failed', errors });
  }
  if (err?.name === 'CastError') {
    return res.status(400).json({ success: false, message: 'Invalid id' });
  }
  if (err?.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || 'value';
    return res.status(409).json({ success: false, message: `That ${field} is already in use.` });
  }
  console.error(err);
  return res.status(500).json({
    success: false,
    message: isProd ? 'Something went wrong.' : err.message || 'Something went wrong.',
  });
}
