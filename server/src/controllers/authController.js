import crypto from 'crypto';
import { User } from '../models/User.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { ok } from '../utils/respond.js';
import { normalizeBdPhone } from '../utils/phone.js';
import {
  hashToken,
  refreshCookieOptions,
  refreshExpiryDate,
  signAccess,
  signRefresh,
  verifyRefresh,
} from '../services/tokenService.js';
import { claimGuestOrders } from '../services/orderService.js';

function clearRefresh(res) {
  res.clearCookie('refreshToken', refreshCookieOptions());
}

async function issueSession(user, res) {
  const jti = crypto.randomUUID();
  const refresh = signRefresh(user, jti);
  const stored = await User.findById(user._id).select('+refreshTokens');
  const tokens = (stored.refreshTokens || []).filter((item) => item.expiresAt > new Date());
  tokens.unshift({ jti, tokenHash: hashToken(refresh), expiresAt: refreshExpiryDate() });
  stored.refreshTokens = tokens.slice(0, 5);
  await stored.save();
  res.cookie('refreshToken', refresh, refreshCookieOptions());
  await claimGuestOrders(stored);
  return { user: stored.toSafe(), accessToken: signAccess(stored) };
}

export const register = asyncHandler(async (req, res) => {
  const user = await User.create(req.validated.body);
  ok(res, await issueSession(user, res), null, 201);
});

export const login = asyncHandler(async (req, res) => {
  const { identifier, password } = req.validated.body;
  const phone = normalizeBdPhone(identifier);
  const user = await User.findOne(phone ? { phone } : { email: identifier.toLowerCase() }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    throw new ApiError(401, 'Email, phone, or password is incorrect.');
  }
  if (!user.isActive) throw new ApiError(403, 'This account has been deactivated.');
  ok(res, await issueSession(user, res));
});

export const refresh = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (!token) return ok(res, { user: null, accessToken: null });
  let payload;
  try {
    payload = verifyRefresh(token);
  } catch {
    clearRefresh(res);
    throw new ApiError(401, 'Please sign in.');
  }
  const user = await User.findById(payload.sub).select('+refreshTokens');
  if (!user || !user.isActive) {
    clearRefresh(res);
    throw new ApiError(401, 'Please sign in.');
  }
  const hash = hashToken(token);
  if (!user.refreshTokens.some((item) => item.tokenHash === hash)) {
    user.refreshTokens = [];
    await user.save();
    clearRefresh(res);
    throw new ApiError(401, 'Session revoked. Please sign in again.');
  }
  user.refreshTokens = user.refreshTokens.filter((item) => item.tokenHash !== hash);
  await user.save();
  ok(res, await issueSession(user, res));
});

export const logout = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (token) {
    try {
      const payload = verifyRefresh(token);
      const user = await User.findById(payload.sub).select('+refreshTokens');
      if (user) {
        const hash = hashToken(token);
        user.refreshTokens = (user.refreshTokens || []).filter((item) => item.tokenHash !== hash);
        await user.save();
      }
    } catch {
      /* expired cookies can still be cleared */
    }
  }
  clearRefresh(res);
  ok(res, { loggedOut: true });
});

export const me = asyncHandler(async (req, res) => {
  ok(res, req.user.toSafe());
});
