import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { ok } from '../utils/respond.js';
import {
  cancelOrder,
  checkout,
  getOrderByToken,
  getOwnedOrder,
  listMyOrders,
  trackOrder,
} from '../services/orderService.js';

export const postOrder = asyncHandler(async (req, res) => {
  const guestId = req.get('x-guest-id');
  if (!req.user && !guestId) throw new ApiError(400, 'Missing guest cart.');
  const input = { ...req.validated.body };
  if (!input.email && req.user?.email) input.email = req.user.email;
  const result = await checkout({ user: req.user, guestId, input });
  ok(res, result, null, 201);
});

export const myOrders = asyncHandler(async (req, res) => {
  const { items, meta } = await listMyOrders(req.user, req.query);
  ok(res, items, meta);
});

export const myOrder = asyncHandler(async (req, res) => {
  ok(res, await getOwnedOrder(req.user, req.params.orderNumber));
});

export const publicOrder = asyncHandler(async (req, res) => {
  const token = req.query.token;
  if (!token) throw new ApiError(400, 'Missing order token.');
  ok(res, await getOrderByToken(req.params.orderNumber, token));
});

export const track = asyncHandler(async (req, res) => {
  ok(res, await trackOrder(req.validated.body));
});

export const cancel = asyncHandler(async (req, res) => {
  ok(res, await cancelOrder({
    orderNumber: req.params.orderNumber,
    user: req.user,
    note: req.validated.body.note,
  }));
});
