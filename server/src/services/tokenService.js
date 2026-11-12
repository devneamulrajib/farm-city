import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export function signAccess(user) {
  return jwt.sign({ sub: String(user._id), role: user.role, type: 'access' }, env.jwtAccessSecret, {
    expiresIn: env.accessTtl,
  });
}

export function signRefresh(user, jti) {
  return jwt.sign({ sub: String(user._id), type: 'refresh', jti }, env.jwtRefreshSecret, {
    expiresIn: env.refreshTtl,
  });
}

export function verifyAccess(token) {
  const payload = jwt.verify(token, env.jwtAccessSecret);
  if (payload.type !== 'access') throw new Error('Invalid token type');
  return payload;
}

export function verifyRefresh(token) {
  const payload = jwt.verify(token, env.jwtRefreshSecret);
  if (payload.type !== 'refresh') throw new Error('Invalid token type');
  return payload;
}

export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function refreshCookieOptions() {
  return {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: env.cookieSameSite,
    path: '/api/auth',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };
}

export function refreshExpiryDate() {
  return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
}
