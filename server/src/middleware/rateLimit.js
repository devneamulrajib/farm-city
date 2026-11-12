import rateLimit from 'express-rate-limit';

const pass = (req, res, next) => next();
const testing = process.env.NODE_ENV === 'test';

export const apiLimiter = testing
  ? pass
  : rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 400,
      standardHeaders: true,
      legacyHeaders: false,
      message: { success: false, message: 'Too many requests. Please wait a moment.' },
    });

export const authLimiter = testing
  ? pass
  : rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 30,
      standardHeaders: true,
      legacyHeaders: false,
      message: { success: false, message: 'Too many attempts. Please wait a few minutes.' },
    });
