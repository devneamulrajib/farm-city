import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { verifyAccess } from '../services/tokenService.js';
import { User } from '../models/User.js';

async function loadUser(req) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) throw new ApiError(401, 'Please sign in.');
  let payload;
  try {
    payload = verifyAccess(token);
  } catch {
    throw new ApiError(401, 'Your session expired. Please sign in again.');
  }
  const user = await User.findById(payload.sub);
  if (!user || !user.isActive) throw new ApiError(401, 'This account cannot sign in.');
  req.user = user;
}

export const requireAuth = asyncHandler(async (req, res, next) => {
  await loadUser(req);
  next();
});

export const optionalAuth = asyncHandler(async (req, res, next) => {
  if (!req.headers.authorization) return next();
  await loadUser(req);
  next();
});

export function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return next(new ApiError(403, 'You do not have access to this area.'));
  }
  next();
}
